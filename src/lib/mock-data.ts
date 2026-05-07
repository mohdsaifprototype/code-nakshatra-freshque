import type { ConsumptionLog, PantryItem, QuickStaple, Recipe } from "@/types";
import { addDays, subDays } from "date-fns";

const today = new Date();
const iso = (d: Date) => d.toISOString();

export const QUICK_STAPLES: QuickStaple[] = [
  { key: "milk", name: "Milk", emoji: "🥛", defaultQty: 1, unit: "L", category: "dairy", defaultExpiryDays: 3, estimatedPrice: 68 },
  { key: "eggs", name: "Eggs", emoji: "🥚", defaultQty: 6, unit: "pcs", category: "protein", defaultExpiryDays: 14, estimatedPrice: 8 },
  { key: "paneer", name: "Paneer", emoji: "🧀", defaultQty: 200, unit: "g", category: "dairy", defaultExpiryDays: 5, estimatedPrice: 0.45 },
  { key: "tomatoes", name: "Tomatoes", emoji: "🍅", defaultQty: 500, unit: "g", category: "produce", defaultExpiryDays: 7, estimatedPrice: 0.05 },
  { key: "onions", name: "Onions", emoji: "🧅", defaultQty: 1, unit: "kg", category: "produce", defaultExpiryDays: 21, estimatedPrice: 35 },
  { key: "curd", name: "Curd", emoji: "🍶", defaultQty: 400, unit: "g", category: "dairy", defaultExpiryDays: 5, estimatedPrice: 0.18 },
  { key: "atta", name: "Atta", emoji: "🌾", defaultQty: 1, unit: "kg", category: "grains", defaultExpiryDays: 60, estimatedPrice: 48 },
  { key: "rice", name: "Rice", emoji: "🍚", defaultQty: 1, unit: "kg", category: "grains", defaultExpiryDays: 180, estimatedPrice: 75 },
  { key: "dal", name: "Toor Dal", emoji: "🟡", defaultQty: 500, unit: "g", category: "grains", defaultExpiryDays: 180, estimatedPrice: 0.18 },
  { key: "bread", name: "Bread", emoji: "🍞", defaultQty: 1, unit: "pack", category: "bakery", defaultExpiryDays: 4, estimatedPrice: 45 },
];

export const MOCK_PANTRY: PantryItem[] = [
  { id: "p1", name: "Milk", quantity: 1, unit: "L", category: "dairy", pricePerUnit: 68, priceSource: "receipt", purchaseDate: iso(subDays(today, 1)), expiryDate: iso(addDays(today, 1)) },
  { id: "p2", name: "Paneer", quantity: 200, unit: "g", category: "dairy", pricePerUnit: 0.45, priceSource: "ai_oracle", purchaseDate: iso(subDays(today, 2)), expiryDate: iso(addDays(today, 1)) },
  { id: "p3", name: "Tomatoes", quantity: 500, unit: "g", category: "produce", pricePerUnit: 0.06, priceSource: "receipt", purchaseDate: iso(subDays(today, 3)), expiryDate: iso(addDays(today, 4)) },
  { id: "p4", name: "Onions", quantity: 1.2, unit: "kg", category: "produce", pricePerUnit: 35, priceSource: "receipt", purchaseDate: iso(subDays(today, 5)), expiryDate: iso(addDays(today, 16)) },
  { id: "p5", name: "Curd", quantity: 400, unit: "g", category: "dairy", pricePerUnit: 0.18, priceSource: "ai_oracle", purchaseDate: iso(subDays(today, 1)), expiryDate: iso(addDays(today, 2)) },
  { id: "p6", name: "Atta (Aashirvaad)", quantity: 1, unit: "kg", category: "grains", pricePerUnit: 48, priceSource: "receipt", purchaseDate: iso(subDays(today, 10)), expiryDate: iso(addDays(today, 50)) },
  { id: "p7", name: "Basmati Rice", quantity: 5, unit: "kg", category: "grains", pricePerUnit: 92, priceSource: "receipt", purchaseDate: iso(subDays(today, 14)), expiryDate: iso(addDays(today, 165)) },
  { id: "p8", name: "Bread (Britannia)", quantity: 1, unit: "pack", category: "bakery", pricePerUnit: 45, priceSource: "receipt", purchaseDate: iso(subDays(today, 2)), expiryDate: iso(addDays(today, 1)) },
  { id: "p9", name: "Bananas", quantity: 6, unit: "pcs", category: "produce", pricePerUnit: 8, priceSource: "ai_oracle", purchaseDate: iso(subDays(today, 2)), expiryDate: iso(addDays(today, 3)) },
  { id: "p10", name: "Spinach", quantity: 1, unit: "pack", category: "produce", pricePerUnit: 30, priceSource: "receipt", purchaseDate: iso(subDays(today, 1)), expiryDate: iso(addDays(today, 1)) },
  { id: "p11", name: "Toor Dal", quantity: 500, unit: "g", category: "grains", pricePerUnit: 0.18, priceSource: "receipt", purchaseDate: iso(subDays(today, 20)), expiryDate: iso(addDays(today, 160)) },
  { id: "p12", name: "Ghee", quantity: 500, unit: "ml", category: "dairy", pricePerUnit: 1.2, priceSource: "receipt", purchaseDate: iso(subDays(today, 12)), expiryDate: iso(addDays(today, 90)) },
  { id: "p13", name: "Capsicum", quantity: 250, unit: "g", category: "produce", pricePerUnit: 0.12, priceSource: "ai_oracle", purchaseDate: iso(subDays(today, 4)), expiryDate: iso(addDays(today, 5)) },
  { id: "p14", name: "Cheese Slices", quantity: 1, unit: "pack", category: "dairy", pricePerUnit: 165, priceSource: "receipt", purchaseDate: iso(subDays(today, 6)), expiryDate: iso(addDays(today, 30)) },
];

export const MOCK_LOGS_30D: ConsumptionLog[] = (() => {
  const out: ConsumptionLog[] = [];
  const items = ["Milk", "Tomatoes", "Bread", "Curd", "Spinach", "Bananas", "Paneer"];
  // 12 months of daily logs to power the monthly wealth chart
  for (let d = 365; d >= 0; d--) {
    const date = iso(subDays(today, d));
    if (Math.random() > 0.25) {
      const it = items[Math.floor(Math.random() * items.length)];
      out.push({
        id: `c-${d}-a`,
        itemId: "x",
        itemName: it,
        quantity: 1,
        unit: "pcs",
        value: 30 + Math.round(Math.random() * 120),
        date,
        outcome: "consumed",
      });
    }
    if (Math.random() > 0.7) {
      const it = items[Math.floor(Math.random() * items.length)];
      out.push({
        id: `c-${d}-b`,
        itemId: "x",
        itemName: it,
        quantity: 1,
        unit: "pcs",
        value: 20 + Math.round(Math.random() * 80),
        date,
        outcome: "expired",
      });
    }
  }
  return out;
})();

export const MOCK_RECIPES: Recipe[] = [
  {
    id: "r1",
    title: "Paneer Bhurji with Tomato",
    image: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=70",
    readyInMinutes: 20,
    servings: 2,
    matchPercent: 100,
    usedIngredients: ["Paneer", "Tomatoes", "Onions"],
    missedIngredients: [],
    vegetarian: true,
    source: "spoonacular",
    nutrition: { calories: 380, protein: 18, carbs: 14, fat: 28, fiber: 4 },
  },
  {
    id: "r2",
    title: "Curd Rice Tadka",
    image: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=70",
    readyInMinutes: 15,
    servings: 2,
    matchPercent: 100,
    usedIngredients: ["Curd", "Basmati Rice"],
    missedIngredients: [],
    vegetarian: true,
    source: "spoonacular",
    nutrition: { calories: 320, protein: 9, carbs: 52, fat: 8, fiber: 2 },
  },
  {
    id: "r3",
    title: "Palak Paneer (AI Remix)",
    image: "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=70",
    readyInMinutes: 30,
    servings: 3,
    matchPercent: 85,
    usedIngredients: ["Spinach", "Paneer", "Tomatoes", "Onions"],
    missedIngredients: ["Cream → use Curd"],
    vegetarian: true,
    source: "gemini_remix",
    nutrition: { calories: 420, protein: 22, carbs: 16, fat: 30, fiber: 6 },
  },
  {
    id: "r4",
    title: "Banana Atta Pancakes",
    image: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?auto=format&fit=crop&w=600&q=70",
    readyInMinutes: 25,
    servings: 2,
    matchPercent: 90,
    usedIngredients: ["Bananas", "Atta (Aashirvaad)", "Milk"],
    missedIngredients: ["Honey"],
    vegetarian: true,
    source: "gemini_remix",
    nutrition: { calories: 290, protein: 8, carbs: 54, fat: 5, fiber: 5 },
  },
];
