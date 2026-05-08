import mongoose from "mongoose";

const savedRecipeSchema = new mongoose.Schema(
	{
		userId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
			index: true,
		},
		title: { type: String, required: true },
		image: { type: String },
		readyInMinutes: { type: Number },
		servings: { type: Number },
		vegetarian: { type: Boolean, default: false },
		source: { type: String, required: true },
		usedIngredients: [{ type: String }],
		missedIngredients: [{ type: String }],
		nutrition: {
			calories: Number,
			protein: Number,
			carbs: Number,
			fat: Number,
			fiber: Number,
		},
		instructions: { type: String },
	},
	{ timestamps: true },
);

export const SavedRecipe = mongoose.model("SavedRecipe", savedRecipeSchema);
