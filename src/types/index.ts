// Shared domain types for Freshque

export type Unit = "kg" | "g" | "L" | "ml" | "pcs" | "pack" | "dozen";
export type Category =
  | "dairy"
  | "produce"
  | "grains"
  | "protein"
  | "spices"
  | "bakery"
  | "snacks"
  | "beverages"
  | "oils"
  | "other";

export type PriceSource = "receipt" | "ai_oracle" | "manual";

export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  category: Category;
  pricePerUnit: number; // ₹ per unit
  priceSource: PriceSource;
  purchaseDate: string; // ISO
  expiryDate: string; // ISO
  consumed?: boolean;
  consumedAt?: string;
  expired?: boolean;
}

export interface ConsumptionLog {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unit: Unit;
  value: number; // ₹
  date: string; // ISO
  outcome: "consumed" | "expired";
}

export interface Nutrition {
  calories: number; // kcal per serving
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber: number; // g
}

export interface Recipe {
  id: string;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  matchPercent: number; // 0..100
  usedIngredients: string[];
  missedIngredients: string[];
  vegetarian: boolean;
  source: "spoonacular" | "gemini_remix";
  nutrition: Nutrition; // per serving
  instructions?: string; // AI generated cooking steps
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export interface MealLog {
  id: string;
  recipeId: string;
  recipeTitle: string;
  servings: number;
  nutrition: Nutrition; // total consumed (servings * per-serving)
  date: string; // ISO
}

export interface QuickStaple {
  key: string;
  name: string;
  emoji: string;
  defaultQty: number;
  unit: Unit;
  category: Category;
  defaultExpiryDays: number;
  estimatedPrice: number;
}

export type ExpiryStatus = "fresh" | "soon" | "critical" | "expired";
