import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGeminiGenerate = vi.fn();
const mockPantryLean = vi.fn();
const mockPantryFind = vi.fn(() => ({ lean: mockPantryLean }));

vi.mock("../middleware/auth.js", () => ({
  requireAuth: (req, _res, next) => {
    req.user = {
      id: "user_1",
      vegetarianOnly: true,
    };
    next();
  },
}));

vi.mock("../models/PantryItem.js", () => ({
  PantryItem: {
    find: (...args) => mockPantryFind(...args),
  },
}));

vi.mock("../services/geminiService.js", () => ({
  generateRecipe: (...args) => mockGeminiGenerate(...args),
  remixRecipe: vi.fn(),
}));

vi.mock("../services/spoonacularService.js", () => ({
  findRecipesByIngredients: vi.fn(),
  getRecipeInfo: vi.fn(),
}));

describe("recipesRouter /generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPantryLean.mockResolvedValue([]);
    mockGeminiGenerate.mockResolvedValue({
      title: "Gemini Test Dish",
      readyInMinutes: 20,
      servings: 2,
      usedIngredients: ["Rice"],
      missedIngredients: [],
      nutrition: { calories: 300, protein: 10, carbs: 45, fat: 8, fiber: 4 },
      instructions: "Cook and serve.",
    });
  });

  it("uses request pantryNames when provided and returns gemini source recipe", async () => {
    const { recipesRouter } = await import("./recipes.js");
    const app = express();
    app.use(express.json());
    app.use("/api/recipes", recipesRouter);
    app.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));

    const response = await request(app)
      .post("/api/recipes/generate")
      .send({ pantryNames: ["Rice", "Tomato"], vegetarian: false });

    expect(response.status).toBe(200);
    expect(mockGeminiGenerate).toHaveBeenCalledWith({
      pantryNames: ["Rice", "Tomato"],
      vegetarian: false,
    });
    expect(mockPantryFind).not.toHaveBeenCalled();
    expect(response.body.recipe.source).toBe("gemini_remix");
    expect(response.body.recipe.id).toMatch(/^ai_/);
    expect(response.body.recipe.title).toBe("Gemini Test Dish");
  });

  it("falls back to pantry query and user vegetarian preference when body fields are missing", async () => {
    mockPantryLean.mockResolvedValue([{ name: "Onion" }, { name: "Paneer" }]);

    const { recipesRouter } = await import("./recipes.js");
    const app = express();
    app.use(express.json());
    app.use("/api/recipes", recipesRouter);
    app.use((err, _req, res, _next) => res.status(500).json({ error: err.message }));

    const response = await request(app).post("/api/recipes/generate").send({});

    expect(response.status).toBe(200);
    expect(mockPantryFind).toHaveBeenCalledWith({ userId: "user_1", consumed: { $ne: true } });
    expect(mockGeminiGenerate).toHaveBeenCalledWith({
      pantryNames: ["Onion", "Paneer"],
      vegetarian: true,
    });
    expect(response.body.recipe.source).toBe("gemini_remix");
  });
});
