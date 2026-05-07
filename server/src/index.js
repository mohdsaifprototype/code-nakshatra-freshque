import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";

import { authRouter } from "./routes/auth.js";
import { pantryRouter } from "./routes/pantry.js";
import { scanRouter } from "./routes/scan.js";
import { recipesRouter } from "./routes/recipes.js";
import { pushRouter, configurePush } from "./routes/push.js";
import { statsRouter } from "./routes/stats.js";
import { startCronJobs } from "./cron/jobs.js";

const PORT = process.env.PORT || 4000;
const ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is required");
if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");

try {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("[mongo] connected");
} catch (err) {
  console.error("[mongo] connection error:", err.message);
  process.exit(1);
}


configurePush();

const app = express();
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: ORIGIN, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use((req, res, next) => {
  console.log(`[api] ${req.method} ${req.url}`);
  next();
});


app.get("/api/health", (_req, res) => res.json({ ok: true }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: process.env.NODE_ENV === "production" ? 100 : 1000 });
app.use("/api/auth", authLimiter, authRouter);

app.use("/api/pantry", pantryRouter);
app.use("/api/scan", scanRouter);
app.use("/api/recipes", recipesRouter);
app.use("/api/push", pushRouter);
app.use("/api/stats", statsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Server error" });
});

app.listen(PORT, () => {
  console.log(`[api] listening on ${PORT}`);
  startCronJobs();
});
