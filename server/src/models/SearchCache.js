import mongoose from "mongoose";

const searchCacheSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		ingredients: [{ type: String }], // Sorted list of item names
		vegetarian: { type: Boolean, default: false },
		results: [{ type: Object }], // Array of formatted recipe objects
		lastUpdated: { type: Date, default: Date.now },
	},
	{ timestamps: true },
);

// We want to find the cache for a specific user and set of ingredients
searchCacheSchema.index({ userId: 1, ingredients: 1, vegetarian: 1 });

export const SearchCache = mongoose.model("SearchCache", searchCacheSchema);
