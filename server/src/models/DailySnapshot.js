import mongoose from "mongoose";

const dailySnapshotSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true, index: true }, // 00:00 of the day
    pantryValue: { type: Number, default: 0 },
    consumedValue: { type: Number, default: 0 },
    wastedValue: { type: Number, default: 0 },
  },
  { timestamps: true },
);

dailySnapshotSchema.index({ userId: 1, date: 1 }, { unique: true });

export const DailySnapshot = mongoose.model("DailySnapshot", dailySnapshotSchema);
