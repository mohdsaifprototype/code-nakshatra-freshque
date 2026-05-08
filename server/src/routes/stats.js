import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { PantryItem } from "../models/PantryItem.js";
import { ConsumptionLog } from "../models/ConsumptionLog.js";
import { DailySnapshot } from "../models/DailySnapshot.js";
import { catchAsync } from "../middleware/error.js";

export const statsRouter = Router();

statsRouter.use(requireAuth);

statsRouter.get("/snapshot", catchAsync(async (req, res) => {
  const items = await PantryItem.find({ userId: req.user.id, consumed: { $ne: true } }).lean();
  const now = Date.now();
  let pantryValue = 0;
  let potentialLoss = 0;
  let expiringWeek = 0;
  for (const i of items) {
    const v = Math.round(i.quantity * i.pricePerUnit);
    pantryValue += v;
    const hours = (new Date(i.expiryDate).getTime() - now) / 36e5;
    if (hours >= 0 && hours <= 48) potentialLoss += v;
    if (hours >= 0 && hours <= 24 * 7) expiringWeek += 1;
  }
  res.json({ itemCount: items.length, pantryValue, potentialLoss, expiringWeek });
}));

statsRouter.get("/30d", catchAsync(async (req, res) => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const snaps = await DailySnapshot.find({ userId: req.user.id, date: { $gte: since } })
    .sort({ date: 1 })
    .lean();
  // Fallback: derive from consumption logs if snapshots are sparse
  const logs = await ConsumptionLog.find({ userId: req.user.id, date: { $gte: since } }).lean();
  
  // Real-time addition: find items currently in pantry that are expired but not yet logged (cron hasn't run)
  const expiredInPantry = await PantryItem.find({
    userId: req.user.id,
    consumed: { $ne: true },
    expiryDate: { $lt: new Date() }
  }).lean();
  
  const currentPantryWaste = expiredInPantry.map(i => ({
    date: i.expiryDate,
    value: Math.round(i.quantity * i.pricePerUnit),
    outcome: "expired"
  }));

  res.json({ snapshots: snaps, logs, currentPantryWaste });
}));
