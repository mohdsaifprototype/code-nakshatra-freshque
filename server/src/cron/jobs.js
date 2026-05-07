import cron from "node-cron";
import { PantryItem } from "../models/PantryItem.js";
import { ConsumptionLog } from "../models/ConsumptionLog.js";
import { DailySnapshot } from "../models/DailySnapshot.js";
import { User } from "../models/User.js";
import { sendPushToUser } from "../routes/push.js";

export function startCronJobs() {
  // Every 6 hours: alert users about items expiring within 48h
  cron.schedule("0 */6 * * *", async () => {
    console.log("[cron] expiry alerts");
    const cutoff = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const items = await PantryItem.find({
      consumed: { $ne: true },
      expired: { $ne: true },
      expiryDate: { $lte: cutoff, $gte: new Date() },
    }).lean();

    const byUser = new Map();
    for (const i of items) {
      const k = String(i.userId);
      if (!byUser.has(k)) byUser.set(k, []);
      byUser.get(k).push(i);
    }
    for (const [userId, list] of byUser) {
      const totalValue = list.reduce((s, i) => s + Math.round(i.quantity * i.pricePerUnit), 0);
      await sendPushToUser(userId, {
        title: `${list.length} item${list.length === 1 ? "" : "s"} expiring in 48h`,
        body: `Cook now to save ₹${totalValue}. Tap to open Freshque.`,
        url: "/dashboard",
      });
    }
  });

  // Mark items expired + log waste, hourly
  cron.schedule("0 * * * *", async () => {
    const now = new Date();
    const expired = await PantryItem.find({
      consumed: { $ne: true },
      expired: { $ne: true },
      expiryDate: { $lt: now },
    });
    for (const i of expired) {
      i.expired = true;
      await i.save();
      await ConsumptionLog.create({
        userId: i.userId,
        itemId: i._id,
        itemName: i.name,
        quantity: i.quantity,
        unit: i.unit,
        value: Math.round(i.quantity * i.pricePerUnit),
        outcome: "expired",
      });
    }
  });

  // Daily snapshot at 00:05 IST (18:35 UTC previous day)
  cron.schedule("35 18 * * *", async () => {
    console.log("[cron] daily snapshot");
    const users = await User.find({}, { _id: 1 }).lean();
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    const yesterday = new Date(day.getTime() - 24 * 60 * 60 * 1000);

    for (const u of users) {
      const items = await PantryItem.find({ userId: u._id, consumed: { $ne: true } }).lean();
      const pantryValue = items.reduce((s, i) => s + Math.round(i.quantity * i.pricePerUnit), 0);

      const logs = await ConsumptionLog.find({
        userId: u._id,
        date: { $gte: yesterday, $lt: day },
      }).lean();
      const consumedValue = logs.filter((l) => l.outcome === "consumed").reduce((s, l) => s + l.value, 0);
      const wastedValue = logs.filter((l) => l.outcome === "expired").reduce((s, l) => s + l.value, 0);

      await DailySnapshot.findOneAndUpdate(
        { userId: u._id, date: yesterday },
        { $set: { pantryValue, consumedValue, wastedValue } },
        { upsert: true },
      );
    }
  });

  console.log("[cron] scheduled jobs ready");
}
