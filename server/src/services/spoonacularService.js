const BASE = "https://api.spoonacular.com";

function key() {
  if (!process.env.SPOONACULAR_API_KEY) throw new Error("SPOONACULAR_API_KEY is not configured");
  return process.env.SPOONACULAR_API_KEY;
}

export async function findRecipesByIngredients(ingredients, { vegetarian = true, number = 12 } = {}) {
  const params = new URLSearchParams({
    apiKey: key(),
    includeIngredients: ingredients.slice(0, 20).join(","),
    number: String(number),
    addRecipeInformation: "true",
    addRecipeNutrition: "true",
    fillIngredients: "true",
    sort: "max-used-ingredients",
  });
  if (vegetarian) {
    params.append("diet", "vegetarian");
  }

  const res = await fetch(`${BASE}/recipes/complexSearch?${params}`);
  if (!res.ok) {
    if (res.status === 402) {
      console.warn("[spoonacularService] API quota exceeded (402). Returning fallback recipes.");
      return [
        {
          id: "mock_" + Date.now(),
          title: "Pantry Surprise (API Quota Exceeded)",
          image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80",
          readyInMinutes: 20,
          servings: 2,
          usedIngredientCount: ingredients.length > 0 ? 1 : 0,
          missedIngredientCount: 0,
          usedIngredients: ingredients.slice(0, 2),
          missedIngredients: [],
          matchPercent: 100,
          vegetarian,
          source: "spoonacular",
          nutrition: { calories: 350, protein: 12, carbs: 45, fat: 8, fiber: 5 }
        }
      ];
    }
    throw new Error(`Spoonacular ${res.status}`);
  }
  const data = await res.json();
  
  return data.results.map((r) => {
    const findNutrient = (name) => r.nutrition?.nutrients?.find((n) => n.name === name)?.amount || 0;
    const usedCount = r.usedIngredientCount || r.usedIngredients?.length || 0;
    const missedCount = r.missedIngredientCount || r.missedIngredients?.length || 0;

    return {
      id: String(r.id),
      title: r.title,
      image: r.image,
      readyInMinutes: r.readyInMinutes || 30,
      servings: r.servings || 1,
      usedIngredientCount: usedCount,
      missedIngredientCount: missedCount,
      usedIngredients: r.usedIngredients?.map((x) => x.name) || [],
      missedIngredients: r.missedIngredients?.map((x) => x.name) || [],
      matchPercent: Math.round(
        (usedCount * 100) / Math.max(1, usedCount + missedCount),
      ),
      vegetarian: typeof r.vegetarian === 'boolean' ? r.vegetarian : vegetarian,
      source: "spoonacular",
      nutrition: {
        calories: findNutrient("Calories"),
        protein: findNutrient("Protein"),
        carbs: findNutrient("Carbohydrates"),
        fat: findNutrient("Fat"),
        fiber: findNutrient("Fiber"),
      }
    };
  });
}

export async function getRecipeInfo(id) {
  const res = await fetch(`${BASE}/recipes/${id}/information?apiKey=${key()}&includeNutrition=false`);
  if (!res.ok) throw new Error(`Spoonacular ${res.status}`);
  return res.json();
}
