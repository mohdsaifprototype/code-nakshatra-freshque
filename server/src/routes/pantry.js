import { Router } from "express";
import { z } from "zod";
import { PantryItem } from "../models/PantryItem.js";
import { ConsumptionLog } from "../models/ConsumptionLog.js";
import { requireAuth } from "../middleware/auth.js";
import { catchAsync } from "../middleware/error.js";

export const pantryRouter = Router();
pantryRouter.use(requireAuth);

const itemSchema = z.object({
	name: z.string().trim().min(1).max(120),
	quantity: z.number().positive(),
	unit: z.enum(["kg", "g", "L", "ml", "pcs", "pack", "dozen"]),
	category: z
		.enum([
			"dairy",
			"produce",
			"grains",
			"protein",
			"spices",
			"bakery",
			"snacks",
			"beverages",
			"other",
		])
		.optional(),
	pricePerUnit: z.number().min(0),
	priceSource: z.enum(["receipt", "ai_oracle", "manual"]).optional(),
	purchaseDate: z.string().datetime().optional(),
	expiryDate: z.string().datetime(),
});

pantryRouter.get(
	"/",
	catchAsync(async (req, res) => {
		const items = await PantryItem.find({
			userId: req.user.id,
			consumed: { $ne: true },
		})
			.sort({ expiryDate: 1 })
			.lean();

		// Since lean() doesn't include virtuals, we map _id to id
		const list = items.map((i) => ({ ...i, id: String(i._id) }));
		res.json({ items: list });
	}),
);

pantryRouter.post(
	"/",
	catchAsync(async (req, res) => {
		const parsed = itemSchema.safeParse(req.body);
		if (!parsed.success)
			return res
				.status(400)
				.json({ error: parsed.error.flatten().fieldErrors });
		const item = await PantryItem.create({
			...parsed.data,
			userId: req.user.id,
			purchaseDate: parsed.data.purchaseDate || new Date(),
		});
		res.json({ item });
	}),
);

pantryRouter.post(
	"/bulk",
	catchAsync(async (req, res) => {
		const schema = z.object({ items: z.array(itemSchema).min(1).max(100) });
		const parsed = schema.safeParse(req.body);
		if (!parsed.success)
			return res
				.status(400)
				.json({ error: parsed.error.flatten().fieldErrors });
		const docs = parsed.data.items.map((i) => ({
			...i,
			userId: req.user.id,
			purchaseDate: i.purchaseDate || new Date(),
		}));
		const created = await PantryItem.insertMany(docs);
		res.json({ items: created });
	}),
);

pantryRouter.patch(
	"/:id",
	catchAsync(async (req, res) => {
		const partial = itemSchema.partial();
		const parsed = partial.safeParse(req.body);
		if (!parsed.success)
			return res
				.status(400)
				.json({ error: parsed.error.flatten().fieldErrors });
		const item = await PantryItem.findOneAndUpdate(
			{ _id: req.params.id, userId: req.user.id },
			{ $set: parsed.data },
			{ new: true },
		);
		if (!item) return res.status(404).json({ error: "Not found" });
		res.json({ item });
	}),
);

pantryRouter.post(
	"/:id/consume",
	catchAsync(async (req, res) => {
		const item = await PantryItem.findOne({
			_id: req.params.id,
			userId: req.user.id,
		});
		if (!item) return res.status(404).json({ error: "Not found" });
		if (item.expired || item.expiryDate < new Date()) {
			return res.status(400).json({ error: "Cannot consume an expired item" });
		}
		item.consumed = true;
		item.consumedAt = new Date();
		await item.save();
		await ConsumptionLog.create({
			userId: req.user.id,
			itemId: item._id,
			itemName: item.name,
			quantity: item.quantity,
			unit: item.unit,
			value: Math.round(item.quantity * item.pricePerUnit),
			outcome: "consumed",
		});
		res.json({ ok: true });
	}),
);

pantryRouter.delete(
	"/:id",
	catchAsync(async (req, res) => {
		const r = await PantryItem.deleteOne({
			_id: req.params.id,
			userId: req.user.id,
		});
		if (!r.deletedCount) return res.status(404).json({ error: "Not found" });
		res.json({ ok: true });
	}),
);
