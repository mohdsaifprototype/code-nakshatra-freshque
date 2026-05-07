import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateContent = vi.fn();

vi.mock("@google/generative-ai", () => {
  return {
    GoogleGenerativeAI: class {
      constructor(_apiKey) {}
      getGenerativeModel() {
        return {
          generateContent: mockGenerateContent,
        };
      }
    },
  };
});

describe("geminiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-gemini-key";
  });

  it("generateRecipe returns parsed recipe when Gemini JSON is valid", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            title: "Pantry Masala Rice",
            readyInMinutes: 25,
            servings: 2,
            usedIngredients: ["Rice", "Tomato"],
            missedIngredients: [],
            nutrition: { calories: 400, protein: 8, carbs: 65, fat: 10, fiber: 4 },
            instructions: "Cook and serve.",
          }),
      },
    });

    const { generateRecipe } = await import("./geminiService.js");
    const recipe = await generateRecipe({ pantryNames: ["Rice", "Tomato"], vegetarian: true });

    expect(recipe.title).toBe("Pantry Masala Rice");
    expect(recipe.usedIngredients).toContain("Rice");
    expect(recipe.nutrition.calories).toBe(400);
  });

  it("generateRecipe falls back when Gemini returns invalid JSON", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => "not-json",
      },
    });

    const { generateRecipe } = await import("./geminiService.js");
    const recipe = await generateRecipe({ pantryNames: ["Onion", "Potato"], vegetarian: true });

    expect(recipe.title).toBe("Quick Pantry Stir Fry");
    expect(recipe.instructions).toContain("invalid");
  });

  it("remixRecipe falls back to safe output for invalid Gemini shape", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({ foo: "bar" }),
      },
    });

    const { remixRecipe } = await import("./geminiService.js");
    const remix = await remixRecipe({
      pantryNames: ["Paneer", "Tomato"],
      recipeId: "123",
      title: "Paneer Curry",
      vegetarian: true,
    });

    expect(remix.substitutions).toEqual([]);
    expect(remix.instructions).toBe("");
  });

  it("extractItemsFromReceipt throws on invalid Gemini JSON", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => "```json\ninvalid\n```",
      },
    });

    const { extractItemsFromReceipt } = await import("./geminiService.js");

    await expect(
      extractItemsFromReceipt({
        buffer: Buffer.from("fake"),
        mimeType: "image/png",
      }),
    ).rejects.toThrow("Gemini returned invalid JSON");
  });
});
