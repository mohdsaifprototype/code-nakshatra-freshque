
# Freshque — Core MVP Plan

A smart pantry app focused on eliminating food waste through automated tracking, ₹ financial insight, AI-powered recipes, and proactive expiry alerts.

## Architecture

- **Frontend**: React + Vite + Tailwind (this Lovable project), shadcn/ui components
- **Backend**: External Node.js + Express API (you host on Render/Railway/Fly.io) with MongoDB Atlas
- **AI**: Gemini (multimodal receipt scan + recipe remix) — proxied through your Node API
- **Recipes**: Spoonacular API — proxied through your Node API
- **Push**: VAPID web push + node-cron job on the Node API
- **Auth**: JWT (httpOnly cookie) + bcrypt hashed passwords

```text
┌──────────────┐    HTTPS     ┌──────────────┐
│  Lovable UI  │ ───────────► │  Node/Express│
│  (React)     │   JWT cookie │  + MongoDB   │
└──────────────┘              │  + cron      │
       ▲                      └──────┬───────┘
       │  Web Push                   │
       └────────  VAPID  ────────────┘
                                     │
                       ┌─────────────┴───────────┐
                       ▼                         ▼
                  Gemini API                 Spoonacular
```

## What you'll provide

- Hosted Node API base URL (e.g. `https://freshque-api.onrender.com`)
- MongoDB Atlas connection string (used by your Node app, not stored in Lovable)
- Spoonacular API key
- Gemini API key (or we route Gemini through Lovable AI Gateway from the Node side — your call)
- VAPID public + private keys (we'll generate-and-document the command)

I'll scaffold the Node/Express + MongoDB backend code in a `/server` folder you can lift out and deploy. Lovable runs the React frontend only.

---

## Core MVP Scope (v1)

### 1. Auth
- Sign up / log in / log out (email + password)
- JWT in httpOnly cookie, bcrypt hashing
- Protected dashboard route

### 2. Bento Box Dashboard (laptop-optimized, dense grid)
A single-screen overview composed of tiles:
- **Potential Loss Ticker** (₹ value of items expiring ≤48h, live)
- **Pantry Snapshot** (total items, total ₹ value, items expiring this week)
- **Quick Entry Grid** (10 Indian staples — Milk, Eggs, Paneer, Tomatoes, Onions, Curd, Atta, Rice, Dal, Bread — one-tap add with default expiry)
- **Receipt Scan** tile (opens upload/camera modal)
- **Expiring Soon** list (items sorted by days-to-expiry, color-coded)
- **Recipe Suggestions** strip (top 3 from current pantry)
- **Wealth Saved vs Wasted** chart (Recharts bar/area, last 30 days)

### 3. Pantry Intake — three lanes
- **Gemini Receipt Scan**: upload photo → Node endpoint sends to Gemini multimodal → returns parsed `[{name, qty, unit, price_inr}]` → user confirms in a review modal → bulk insert
- **Quick Entry Grid**: tap a staple tile → adds with preset qty + expiry (configurable defaults)
- **Manual Entry**: form with name, qty, unit, price ₹, purchase date, expiry date, category

### 4. Pantry Management
- Full pantry view: searchable/filterable table + card grid toggle
- Edit / delete / mark consumed
- Auto-categorisation (dairy, produce, grains, etc.) with manual override
- Color-coded expiry status (fresh / soon / critical / expired)

### 5. ₹ Financial Tracking
- Each item stores actual price (from receipt) or AI-estimated price (Gemini Oracle for Indian market) — flagged so user knows the source
- **Potential Loss** = sum(qty × unit_price) for items expiring within 48h
- **Wealth Saved** = sum of consumed items' value
- **Wealth Wasted** = sum of expired items' value
- Daily snapshots stored to power the 30-day chart

### 6. Hybrid Recipe Lab
- **Direct Match**: query Spoonacular `findByIngredients` with current pantry → show recipes with 100% match first
- **AI Remix**: for near-matches, call Gemini with pantry + target recipe → returns substitution suggestions ("use curd instead of cream")
- **Vegetarian toggle** (global setting, persists per user) — passed to both Spoonacular `diet=vegetarian` and Gemini system prompt
- Recipe detail page with "Cooked This" button → subtracts ingredients from pantry

### 7. VAPID Web Push — Expiry Nudges
- Frontend: service worker + permission prompt + subscription stored in MongoDB per user
- Backend: `node-cron` job runs every 6h, finds items expiring in ≤48h, sends push via `web-push` lib
- Tappable notification deep-links to the Expiring Soon view

### 8. Settings
- Vegetarian toggle, default expiry days per staple, notification preferences, logout

---

## What's deferred to v2 (not in this build)

- Health & Nutrition Hub (calorie gauge, macro bars, automated consumption logging into health data)
- Autonomous Replenishment (staple learning, predictive shopping cart, recipe-gap filling)
- These are large modules — best added once the core is working end-to-end.

---

## Pages & routes

- `/` — Landing (hero, features, CTA to sign up)
- `/login`, `/signup`
- `/dashboard` — Bento Box (protected)
- `/pantry` — Full pantry management
- `/scan` — Receipt scan flow (or modal from dashboard)
- `/recipes` — Recipe lab with filters
- `/recipes/:id` — Recipe detail + Cooked This
- `/settings`

---

## Visual design

- Dense, laptop-first Bento Box layout (CSS grid, ~12-col, varied tile sizes)
- Light neutral background, muted-card surfaces, accent color for ₹ values & CTAs
- Color tokens for expiry: green (fresh), amber (soon ≤7d), orange (critical ≤2d), red (expired)
- Typography: clean sans (Inter), tabular numerics for ₹ values
- Subtle micro-interactions on tile hover, smooth modal transitions
- All colors defined as HSL tokens in `index.css` and Tailwind config (no hardcoded colors in components)

---

## Technical details

**Frontend (this Lovable project)**
- React Router for routes, React Query for server state, Zustand for auth/UI state
- Forms: react-hook-form + zod validation (length limits, email format, etc.)
- Charts: Recharts (bar + area)
- Service worker (`/public/sw.js`) for push notifications
- Axios instance with `withCredentials: true` to send the JWT cookie
- API base URL stored as `VITE_API_BASE_URL` (you'll set after deploying the Node backend)

**Backend (`/server` folder, you deploy)**
- Express + Mongoose + cors + cookie-parser + helmet + express-rate-limit
- Models: `User`, `PantryItem`, `Receipt`, `ConsumptionLog`, `PushSubscription`, `DailySnapshot`
- Routes: `/auth/*`, `/pantry/*`, `/scan/receipt`, `/recipes/*`, `/recipes/remix`, `/push/subscribe`, `/stats/*`
- Services: `geminiService` (receipt OCR + recipe remix), `spoonacularService`, `pushService`
- `node-cron`: daily snapshot at 00:05 IST, expiry push check every 6h
- Zod input validation on every route, JWT middleware on protected routes
- `server/.env` containing `MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `SPOONACULAR_API_KEY`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CORS_ORIGIN`
- README with deploy steps for Render

**Build order**
1. Frontend scaffold: design system, layout shell, routes, auth pages (mock API)
2. Bento Box dashboard with seeded mock data so you can see it immediately
3. `/server` Node backend: auth + pantry CRUD + Mongo models
4. Wire frontend to real API, replace mocks
5. Receipt scan (Gemini) end-to-end
6. Recipe lab (Spoonacular + Gemini remix)
7. Charts + ₹ tracking + daily snapshot cron
8. VAPID push subscription + cron alerts
9. Polish, empty states, error toasts, loading skeletons

After you approve, I'll start with steps 1–2 so you can see and click through the dashboard while you spin up the Node backend in parallel.
