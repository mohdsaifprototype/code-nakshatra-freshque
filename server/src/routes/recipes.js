import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { PantryItem } from "../models/PantryItem.js";
import { findRecipesByIngredients, getRecipeInfo } from "../services/spoonacularService.js";
import { remixRecipe as ollamaRemix, generateRecipe as ollamaGenerate } from "../services/ollamaService.js";
import { remixRecipe as geminiRemix, generateRecipe as geminiGenerate } from "../services/geminiService.js";

const getAIService = () => {
  return process.env.AI_BACKEND === "gemini" 
    ? { remixRecipe: geminiRemix, generateRecipe: geminiGenerate } 
    : { remixRecipe: ollamaRemix, generateRecipe: ollamaGenerate };
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
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    const veg = parsed.data.vegetarian ?? req.user.vegetarianOnly ?? true;
    const ingredients = parsed.data.pantryNames;
    const recipes = await findRecipesByIngredients(ingredients, { vegetarian: veg });
    res.json({ recipes });
  } catch (e) {
    next(e);
  }
});

recipesRouter.post("/generate", async (req, res, next) => {
  try {
    const bodyPantryNames = Array.isArray(req.body?.pantryNames) ? req.body.pantryNames : null;
    const pantryNames =
      bodyPantryNames ??
      (await PantryItem.find({ userId: req.user.id, consumed: { $ne: true } }).lean()).map((i) => i.name);
    const vegetarian = req.body?.vegetarian ?? req.user.vegetarianOnly ?? false;

    const { generateRecipe } = getAIService();
    const recipe = await generateRecipe({
      pantryNames,
      vegetarian,
    });
    
    const fullRecipe = {
      id: "ai_" + Date.now(),
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
      matchPercent: 100,
      vegetarian,
      source: process.env.AI_BACKEND === "gemini" ? "gemini_remix" : "ollama_remix",
      ...recipe,
    };
    
    res.json({ recipe: fullRecipe });
  } catch (e) {
    next(e);
  }
});

recipesRouter.get("/search", async (req, res, next) => {
  try {
    const items = await PantryItem.find({ userId: req.user.id, consumed: { $ne: true } }).lean();
    const ingredients = items.map((i) => i.name);
    const veg = req.query.vegetarian === "true";
    const recipes = await findRecipesByIngredients(ingredients, { vegetarian: veg });
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
    const schema = z.object({ recipeId: z.string().min(1), targetTitle: z.string().max(200).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    const items = await PantryItem.find({ userId: req.user.id, consumed: { $ne: true } }).lean();
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

