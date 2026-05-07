# Freshque API

Node 20+ · Express · MongoDB · JWT auth · Gemini (multimodal receipt OCR) · Ollama (recipe generation/remix) · Spoonacular · VAPID web push.

## Setup

```bash
cd server
edit server/.env           # fill in secrets
npm install
npm run vapid:generate     # paste output into .env
npm run dev
```

The API listens on `PORT` (default 4000).
For local AI recipes, also set `OLLAMA_HOST` (default `http://localhost:11434`) and `OLLAMA_MODEL` (default `gemma:2b`) in `server/.env`.

## Frontend wiring

Set `VITE_API_BASE_URL` in the Lovable project to your deployed API URL (e.g. `https://freshque-api.onrender.com`). The frontend sends credentials (httpOnly cookie), so make sure `CORS_ORIGIN` matches your frontend origin exactly.

## Endpoints

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/signup` | `{ name, email, password }` |
| POST | `/auth/login` | `{ email, password }` → sets httpOnly cookie |
| POST | `/auth/logout` | clears cookie |
| GET  | `/auth/me` | current user |
| GET  | `/pantry` | list items |
| POST | `/pantry` | create item |
| PATCH| `/pantry/:id` | update |
| POST | `/pantry/:id/consume` | mark consumed (logs to consumption) |
| DELETE | `/pantry/:id` | delete |
| POST | `/scan/receipt` | multipart `image` → Gemini extracts items |
| GET  | `/recipes/search` | from current pantry (Spoonacular) |
| POST | `/recipes/generate` | AI-generated recipe from pantry (Ollama) |
| POST | `/recipes/remix` | `{ recipeId }` → Ollama substitution suggestions |
| POST | `/push/subscribe` | save PushSubscription |
| GET  | `/push/vapid-key` | returns `VAPID_PUBLIC_KEY` |
| GET  | `/stats/snapshot` | totals & potential loss |
| GET  | `/stats/30d` | wealth saved vs wasted |

## Cron jobs

- **Every 6h**: scan all users for items expiring in ≤48h → send web push + create in-app notification.
- **Daily 00:05 IST**: write `DailySnapshot` per user (consumed₹, wasted₹, pantry₹).

## Deploy (Render)

1. New → Web Service → Connect repo → Root directory `server`
2. Build: `npm install` · Start: `npm start`
3. Add all required env vars to `server/.env`
4. Add `CORS_ORIGIN` = your Lovable deploy URL (no trailing slash)
5. After deploy, set `VITE_API_BASE_URL` in Lovable → redeploy frontend

## Security

- Passwords: bcrypt (cost 12)
- JWT: signed, httpOnly + sameSite=lax + secure in prod
- Helmet, CORS allowlist (single origin), express-rate-limit on `/auth/*`
- All inputs validated with Zod
- Mongoose schemas enforce length limits
