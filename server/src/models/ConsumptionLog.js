import mongoose from "mongoose";

const consumptionLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: "PantryItem" },
    itemName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    value: { type: Number, required: true },
    date: { type: Date, default: Date.now, index: true },
    outcome: { type: String, enum: ["consumed", "expired"], required: true },
  },
  { timestamps: true },
);

export const ConsumptionLog = mongoose.model("ConsumptionLog", consumptionLogSchema);
