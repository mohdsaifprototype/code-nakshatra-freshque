import { Router } from "express";
import webpush from "web-push";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { PushSubscription } from "../models/PushSubscription.js";
import { catchAsync } from "../middleware/error.js";

export const pushRouter = Router();


export function configurePush() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn("[push] VAPID keys missing — push disabled. Run `npm run vapid:generate`.");
    return;
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:hello@freshque.app",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

pushRouter.get("/vapid-key", (_req, res) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY || "" });
});

pushRouter.post("/subscribe", requireAuth, catchAsync(async (req, res) => {
  const schema = z.object({
    endpoint: z.string().url(),
    keys: z.object({ p256dh: z.string(), auth: z.string() }),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  await PushSubscription.findOneAndUpdate(
    { endpoint: parsed.data.endpoint },
    { ...parsed.data, userId: req.user.id },
    { upsert: true, new: true },
  );
  res.json({ ok: true });
}));

pushRouter.post("/unsubscribe", requireAuth, catchAsync(async (req, res) => {
  const schema = z.object({ endpoint: z.string().url() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
  await PushSubscription.deleteOne({ endpoint: parsed.data.endpoint, userId: req.user.id });
  res.json({ ok: true });
}));

export async function sendPushToUser(userId, payload) {
  const subs = await PushSubscription.find({ userId }).lean();
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys },
          JSON.stringify(payload),
        );
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: s._id });
        } else {
          console.error("[push] send error", e.statusCode, e.body);
        }
      }
    }),
  );
}
