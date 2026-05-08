import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { PantryItem } from "../models/PantryItem.js";
import { SavedRecipe } from "../models/SavedRecipe.js";
import { SearchCache } from "../models/SearchCache.js";
import {
	findRecipesByIngredients,
	getRecipeInfo,
} from "../services/spoonacularService.js";
import {
	remixRecipe as ollamaRemix,
	generateRecipe as ollamaGenerate,
} from "../services/ollamaService.js";
import {
	remixRecipe as geminiRemix,
	generateRecipe as geminiGenerate,
} from "../services/geminiService.js";
import {
	remixRecipe as groqRemix,
	generateRecipe as groqGenerate,
} from "../services/groqService.js";

const getAIService = () => {
	const backend = process.env.AI_BACKEND;
	if (backend === "gemini") {
		return { remixRecipe: geminiRemix, generateRecipe: geminiGenerate };
	} else if (backend === "groq") {
		return { remixRecipe: groqRemix, generateRecipe: groqGenerate };
	} else {
		return { remixRecipe: ollamaRemix, generateRecipe: ollamaGenerate };
	}
};

export const recipesRouter = Router();
recipesRouter.use(requireAuth);

recipesRouter.post("/search", async (req, res, next) => {
	try {
		const schema = z.object({
			pantryNames: z.array(z.string().min(1)).max(50).default([]),
			vegetarian: z.boolean().optional(),
		});
		const parsed = schema.safeParse(req.body ?? {});
		if (!parsed.success)
			return res
				.status(400)
				.json({ error: parsed.error.flatten().fieldErrors });
		
		const veg = parsed.data.vegetarian ?? req.user.vegetarianOnly ?? true;
		const ingredients = [...parsed.data.pantryNames].sort();

		// Check cache first
		const cache = await SearchCache.findOne({
			userId: req.user.id,
			ingredients,
			vegetarian: veg,
		});

		if (cache) {
			console.log("[recipes] cache hit for search");
			return res.json({ recipes: cache.results });
		}

		console.log("[recipes] cache miss, calling Spoonacular");
		const recipes = await findRecipesByIngredients(ingredients, {
			vegetarian: veg,
		});

		// Save to cache
		await SearchCache.findOneAndUpdate(
			{ userId: req.user.id, ingredients, vegetarian: veg },
			{ results: recipes, lastUpdated: new Date() },
			{ upsert: true },
		);

		res.json({ recipes });
	} catch (e) {
		next(e);
	}
});

recipesRouter.post("/generate", async (req, res, next) => {
	try {
		const bodyPantryNames = Array.isArray(req.body?.pantryNames)
			? req.body.pantryNames
			: null;
		const pantryNames =
			bodyPantryNames ??
			(
				await PantryItem.find({
					userId: req.user.id,
					consumed: { $ne: true },
					expired: { $ne: true },
					expiryDate: { $gt: new Date() },
				}).lean()
			).map((i) => i.name);
		const vegetarian = req.body?.vegetarian ?? req.user.vegetarianOnly ?? false;

		const { generateRecipe } = getAIService();
		const recipe = await generateRecipe({
			pantryNames,
			vegetarian,
		});

		let source = "ollama_remix";
		if (process.env.AI_BACKEND === "gemini") source = "gemini_remix";
		if (process.env.AI_BACKEND === "groq") source = "groq_remix";

		const fullRecipeData = {
			userId: req.user.id,
			image:
				"https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
			vegetarian,
			source,
			...recipe,
		};

		const saved = await SavedRecipe.create(fullRecipeData);
		
		// Return formatted for frontend (with id)
		res.json({ 
			recipe: {
				...fullRecipeData,
				id: String(saved._id),
				matchPercent: 100,
			} 
		});
	} catch (e) {
		next(e);
	}
});

recipesRouter.get("/saved", async (req, res, next) => {
	try {
		const saved = await SavedRecipe.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
		const list = saved.map(r => ({
			...r,
			id: String(r._id),
			matchPercent: 100,
		}));
		res.json({ recipes: list });
	} catch (e) {
		next(e);
	}
});

recipesRouter.delete("/saved/:id", async (req, res, next) => {
	try {
		await SavedRecipe.deleteOne({ _id: req.params.id, userId: req.user.id });
		res.json({ ok: true });
	} catch (e) {
		next(e);
	}
});

recipesRouter.get("/search", async (req, res, next) => {
	try {
		const items = await PantryItem.find({
			userId: req.user.id,
			consumed: { $ne: true },
			expired: { $ne: true },
			expiryDate: { $gt: new Date() },
		}).lean();
		const ingredients = items.map((i) => i.name).sort();
		const veg = req.query.vegetarian === "true";

		// Check cache
		const cache = await SearchCache.findOne({
			userId: req.user.id,
			ingredients,
			vegetarian: veg,
		});

		if (cache) {
			return res.json({ recipes: cache.results });
		}

		const recipes = await findRecipesByIngredients(ingredients, {
			vegetarian: veg,
		});

		await SearchCache.findOneAndUpdate(
			{ userId: req.user.id, ingredients, vegetarian: veg },
			{ results: recipes, lastUpdated: new Date() },
			{ upsert: true },
		);

		res.json({ recipes });
	} catch (e) {
		next(e);
	}
});

recipesRouter.get("/:id", async (req, res, next) => {
	try {
		const info = await getRecipeInfo(req.params.id);
		res.json({ recipe: info });
	} catch (e) {
		next(e);
	}
});

recipesRouter.post("/remix", async (req, res, next) => {
	try {
		const schema = z.object({
			recipeId: z.string().min(1),
			targetTitle: z.string().max(200).optional(),
		});
		const parsed = schema.safeParse(req.body);
		if (!parsed.success)
			return res
				.status(400)
				.json({ error: parsed.error.flatten().fieldErrors });
		const items = await PantryItem.find({
			userId: req.user.id,
			consumed: { $ne: true },
			expired: { $ne: true },
			expiryDate: { $gt: new Date() },
		}).lean();
		const { remixRecipe } = getAIService();
		const remix = await remixRecipe({
			pantryNames: items.map((i) => i.name),
			recipeId: parsed.data.recipeId,
			title: parsed.data.targetTitle,
			vegetarian: req.user.vegetarianOnly,
		});
		res.json({ remix });
	} catch (e) {
		next(e);
	}
});
