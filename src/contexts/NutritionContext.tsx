import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MealLog, Nutrition, NutritionTargets, Recipe } from "@/types";

interface NutritionContextValue {
  targets: NutritionTargets;
  setTargets: (t: NutritionTargets) => void;
  logs: MealLog[];
  logMeal: (recipe: Recipe, servings?: number) => MealLog;
  removeLog: (id: string) => void;
  todayTotals: Nutrition;
  todayLogs: MealLog[];
}

const DEFAULT_TARGETS: NutritionTargets = {
  calories: 2000,
  protein: 75,
  carbs: 250,
  fat: 65,
  fiber: 30,
};

const TARGETS_KEY = "freshque_nutrition_targets";
const LOGS_KEY = "freshque_meal_logs";

const NutritionContext = createContext<NutritionContextValue | null>(null);

const ZERO: Nutrition = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };

function isToday(iso: string) {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export function NutritionProvider({ children }: { children: ReactNode }) {
  const [targets, setTargetsState] = useState<NutritionTargets>(DEFAULT_TARGETS);
  const [logs, setLogs] = useState<MealLog[]>([]);

  useEffect(() => {
    try {
      const t = localStorage.getItem(TARGETS_KEY);
      if (t) setTargetsState({ ...DEFAULT_TARGETS, ...JSON.parse(t) });
      const l = localStorage.getItem(LOGS_KEY);
      if (l) setLogs(JSON.parse(l));
    } catch { /* noop */ }
  }, []);

  const persistLogs = (next: MealLog[]) => {
    setLogs(next);
    localStorage.setItem(LOGS_KEY, JSON.stringify(next));
  };

  const setTargets = (t: NutritionTargets) => {
    setTargetsState(t);
    localStorage.setItem(TARGETS_KEY, JSON.stringify(t));
  };

  const logMeal = useCallback((recipe: Recipe, servings = 1) => {
    const n = recipe.nutrition;
    const entry: MealLog = {
      id: `m-${Date.now()}`,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      servings,
      nutrition: {
        calories: Math.round(n.calories * servings),
        protein: Math.round(n.protein * servings),
        carbs: Math.round(n.carbs * servings),
        fat: Math.round(n.fat * servings),
        fiber: Math.round(n.fiber * servings),
      },
      date: new Date().toISOString(),
    };
    persistLogs([entry, ...logs]);
    return entry;
  }, [logs]);

  const removeLog = (id: string) => persistLogs(logs.filter((l) => l.id !== id));

  const { todayLogs, todayTotals } = useMemo(() => {
    const t = logs.filter((l) => isToday(l.date));
    const tot = t.reduce<Nutrition>((acc, l) => ({
      calories: acc.calories + l.nutrition.calories,
      protein: acc.protein + l.nutrition.protein,
      carbs: acc.carbs + l.nutrition.carbs,
      fat: acc.fat + l.nutrition.fat,
      fiber: acc.fiber + l.nutrition.fiber,
    }), ZERO);
    return { todayLogs: t, todayTotals: tot };
  }, [logs]);

  return (
    <NutritionContext.Provider value={{ targets, setTargets, logs, logMeal, removeLog, todayTotals, todayLogs }}>
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition() {
  const ctx = useContext(NutritionContext);
  if (!ctx) throw new Error("useNutrition must be used within NutritionProvider");
  return ctx;
}
