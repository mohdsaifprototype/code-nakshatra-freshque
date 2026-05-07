import mongoose from "mongoose";

const pantryItemSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ["kg", "g", "L", "ml", "pcs", "pack", "dozen"], required: true },
    category: {
      type: String,
      enum: ["dairy", "produce", "grains", "protein", "spices", "bakery", "snacks", "beverages", "other"],
      default: "other",
    },
    pricePerUnit: { type: Number, required: true, min: 0 },
    priceSource: { type: String, enum: ["receipt", "ai_oracle", "manual"], default: "manual" },
    purchaseDate: { type: Date, required: true },
    expiryDate: { type: Date, required: true, index: true },
    consumed: { type: Boolean, default: false },
    consumedAt: { type: Date },
    expired: { type: Boolean, default: false },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  },
);


pantryItemSchema.index({ userId: 1, expiryDate: 1 });

export const PantryItem = mongoose.model("PantryItem", pantryItemSchema);
