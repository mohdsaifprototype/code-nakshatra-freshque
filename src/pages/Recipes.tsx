import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChefHat, Clock, Sparkles, Filter, ArrowLeftRight, Check, Flame, Minus, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useNutrition } from "@/contexts/NutritionContext";
import { usePantry } from "@/contexts/PantryContext";
import { api } from "@/lib/api";
import type { Recipe } from "@/types";
import { toast } from "sonner";

export default function Recipes() {
  const { vegetarianOnly, setVegetarianOnly } = useAuth();
  const { items } = usePantry();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<"all" | "match" | "remix">("all");
  const [active, setActive] = useState<Recipe | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saved, setSaved] = useState<Recipe[]>([]);
  const [matches, setMatches] = useState<Recipe[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const pantryNames = useMemo(
    () => items.filter((i) => !i.consumed && !i.expired && i.quantity > 0 && expiryStatus(i.expiryDate) !== "expired").map((i) => i.name),
    [items],
  );

  useEffect(() => {
    const fetchSaved = async () => {
      try {
        const res = await api.listSavedRecipes();
        setSaved(res.recipes);
      } catch (e) {
        console.error("Failed to load saved recipes", e);
      }
    };
    fetchSaved();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingMatches(true);
      try {
        if (pantryNames.length === 0) {
          if (!cancelled) setMatches([]);
          return;
        }
        const res = await api.searchRecipesWithPantry(pantryNames, vegetarianOnly);
        if (!cancelled) setMatches(Array.isArray(res.recipes) ? res.recipes : []);
      } catch (e: any) {
        if (!cancelled) setMatches([]);
        toast.error(e?.message || "Failed to load recipes");
      } finally {
        if (!cancelled) setLoadingMatches(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [pantryNames.join("|"), vegetarianOnly]);

  useEffect(() => {
    const id = searchParams.get("open");
    if (!id) return;
    const all = [...saved, ...matches];
    const found = all.find((r) => r.id === id);
    if (found) setActive(found);
  }, [searchParams, saved, matches]);

  const visible = [...saved, ...matches].filter((r) => {
    if (vegetarianOnly && !r.vegetarian) return false;
    if (tab === "match") return r.source === "spoonacular";
    if (tab === "remix") return r.source === "gemini_remix" || r.source === "ollama_remix" || r.source === "groq_remix";
    return true;
  });

  const handleDelete = async (id: string) => {
    try {
      await api.deleteSavedRecipe(id);
      setSaved(prev => prev.filter(r => r.id !== id));
      setActive(null);
      toast.success("Recipe deleted");
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto animate-fade-in-up">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          {(["all", "match", "remix"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`chip border ${tab === t ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}
            >
              {t === "all" ? "All recipes" : t === "match" ? "Direct match" : "AI remix"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 chip border bg-card">
          <Filter className="size-3.5" />
          <Label htmlFor="veg" className="text-xs cursor-pointer">Vegetarian only</Label>
          <Switch
            id="veg"
            checked={vegetarianOnly}
            onCheckedChange={async (checked) => {
              try {
                await setVegetarianOnly(checked);
              } catch (e: any) {
                toast.error(e?.message || "Failed to save preference");
              }
            }}
          />
        </div>
      </div>
      
      {tab === "remix" && (
        <div className="mb-6 bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <div className="font-display text-lg text-primary flex items-center gap-2">
              <Sparkles className="size-5" /> Pure AI Generation
            </div>
            <div className="text-sm text-muted-foreground mt-1">Not satisfied with the ideas below? Let our AI invent a brand new recipe specifically for you using only your current pantry ingredients.</div>
          </div>
          <Button onClick={async () => {
            setGenerating(true);
            try {
              const pantryNames = items.filter(i => !i.consumed).map(i => i.name);
              const data = await api.generateRecipe(pantryNames, vegetarianOnly);
              setSaved(prev => [data.recipe, ...prev]);
              toast.success("New AI recipe generated and saved!");
            } catch (e: any) {
              toast.error(e.message || "Failed to invent recipe");
            } finally {
              setGenerating(false);
            }
          }} disabled={generating}>
            {generating ? <Loader2 className="size-4 animate-spin mr-2" /> : <Sparkles className="size-4 mr-2" />}
            {generating ? "Inventing..." : "Invent new recipe"}
          </Button>
        </div>
      )}

      {loadingMatches && (
        <div className="mb-4 text-sm text-muted-foreground">Loading recipe matches…</div>
      )}

      {!loadingMatches && matches.length === 0 && (
        <div className="mb-4 text-sm text-muted-foreground">
          Add a few pantry items to get Spoonacular matches.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {visible.map((r) => (
          <button
            key={r.id}
            onClick={() => setActive(r)}
            className="group text-left rounded-2xl border bg-card overflow-hidden hover:-translate-y-0.5 transition-all"
          >
            <div className="aspect-[4/3] overflow-hidden bg-muted">
              <img src={r.image} alt={r.title} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            </div>
            <div className="p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                {r.source === "spoonacular" ? <ChefHat className="size-3" /> : <Sparkles className="size-3 text-primary" />}
                {r.source === "spoonacular" ? "Spoonacular" : "AI remix"}
                <span>·</span>
                <Clock className="size-3" /> {r.readyInMinutes}m
              </div>
              <div className="font-medium mt-1.5 line-clamp-2">{r.title}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className={r.matchPercent === 100
                  ? "chip bg-expiry-fresh/10 text-expiry-fresh border border-expiry-fresh/20"
                  : "chip bg-accent/15 text-accent border border-accent/30"}>
                  {r.matchPercent}% match
                </span>
                <span className="text-[11px] text-muted-foreground">{r.servings} serving{r.servings > 1 ? "s" : ""}</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {active && (
        <RecipeDetail
          recipe={active}
          onDelete={handleDelete}
          onClose={() => {
            setActive(null);
            const url = new URL(window.location.href);
            url.searchParams.delete("open");
            window.history.replaceState({}, "", url.toString());
          }}
        />
      )}
    </div>
  );
}

function RecipeDetail({ recipe, onClose, onDelete }: { recipe: Recipe; onClose: () => void; onDelete?: (id: string) => void }) {
  const { logMeal } = useNutrition();
  const navigate = useNavigate();
  const { items, consumeItem } = usePantry();
  const [servings, setServings] = useState(1);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [infoIngredients, setInfoIngredients] = useState<string[] | null>(null);
  const n = recipe.nutrition || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  const total = {
    calories: Math.round((n.calories || 0) * servings),
    protein: Math.round((n.protein || 0) * servings),
    carbs: Math.round((n.carbs || 0) * servings),
    fat: Math.round((n.fat || 0) * servings),
    fiber: Math.round((n.fiber || 0) * servings),
  };

  const isAI = recipe.source !== "spoonacular";

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (recipe.source !== "spoonacular") return;
      setLoadingInfo(true);
      try {
        const res = await api.getRecipeInfo(recipe.id);
        const extended = res?.recipe?.extendedIngredients;
        const names = Array.isArray(extended)
          ? extended
              .map((x: any) => x?.nameClean || x?.name || x?.originalName || x?.original)
              .filter(Boolean)
              .map((s: any) => String(s))
          : [];
        if (!cancelled) setInfoIngredients(names);
      } catch {
        if (!cancelled) setInfoIngredients(null);
      } finally {
        if (!cancelled) setLoadingInfo(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [recipe.id, recipe.source]);

  const pantryNames = useMemo(
    () =>
      new Set(
        items
          .filter((i) => !i.consumed && !i.expired && i.quantity > 0)
          .map((i) => i.name.trim().toLowerCase()),
      ),
    [items],
  );

  const ingredientsForSplit = recipe.source === "spoonacular" ? infoIngredients : null;
  const split = useMemo(() => {
    if (recipe.source !== "spoonacular") {
      return { have: recipe.usedIngredients, need: recipe.missedIngredients };
    }
    const list = ingredientsForSplit;
    if (!list) return { have: recipe.usedIngredients, need: recipe.missedIngredients };

    const have: string[] = [];
    const need: string[] = [];
    for (const ing of list) {
      const key = ing.trim().toLowerCase();
      if (pantryNames.has(key)) have.push(ing);
      else need.push(ing);
    }
    return { have, need };
  }, [ingredientsForSplit, pantryNames, recipe.missedIngredients, recipe.source, recipe.usedIngredients]);

  const handleCooked = async () => {
    logMeal(recipe, servings);
    
    if (split.have && split.have.length > 0) {
      for (const ingredientName of split.have) {
        const ingKey = ingredientName.trim().toLowerCase();
        const item = items.find(
          (i) => !i.consumed && !i.expired && i.quantity > 0 && i.name.trim().toLowerCase() === ingKey
        );
        if (item) {
          try {
            await api.consumeItem(item.id);
            consumeItem(item.id);
          } catch (e) {
            console.error("Failed to consume item:", item.name, e);
          }
        }
      }
    }

    toast.success(`Logged ${servings} serving${servings > 1 ? "s" : ""} · ${total.calories} kcal`, {
      description: "Updated in Health Hub & Pantry",
      action: { label: "View", onClick: () => navigate("/health") },
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center p-4 animate-fade-in-up" onClick={onClose}>
      <div className="bg-card rounded-2xl max-w-2xl w-full overflow-hidden border shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="aspect-[16/7] overflow-hidden bg-muted relative">
          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover" />
          {isAI && onDelete && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-3 right-3 rounded-full opacity-80 hover:opacity-100"
              onClick={() => onDelete(recipe.id)}
              title="Delete generated recipe"
            >
              <Trash2 className="size-4" />
            </Button>
          )}
        </div>
        <div className="p-5">
          <div className="font-display text-2xl">{recipe.title}</div>
          <div className="mt-1 text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5"><Clock className="size-4" /> {recipe.readyInMinutes} min</span>
            <span>·</span>
            <span>{recipe.servings} serving{recipe.servings > 1 ? "s" : ""} (recipe yield)</span>
            <span>·</span>
            <span className="flex items-center gap-1.5"><Flame className="size-4 text-accent" /> {n.calories} kcal/serving</span>
          </div>

          <div className="mt-4 grid sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">From your pantry</div>
              {recipe.source === "spoonacular" && loadingInfo && (
                <div className="text-sm text-muted-foreground">Loading ingredients…</div>
              )}
              <ul className="space-y-1.5">
                {split.have.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="size-3.5 text-expiry-fresh" /> {i}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
                {recipe.source === "spoonacular" ? "You'll need" : "AI substitutions"}
              </div>
              <ul className="space-y-1.5">
                {split.need.length === 0 ? (
                  <li className="text-sm text-muted-foreground">Everything is in your pantry ✨</li>
                ) : split.need.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <ArrowLeftRight className="size-3.5 text-primary" /> {i}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-4 rounded-xl border bg-muted/30 p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Nutrition you'll log</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Servings</span>
                <div className="flex items-center rounded-lg border bg-card">
                  <button
                    type="button"
                    onClick={() => setServings(Math.max(1, servings - 1))}
                    className="px-2 py-1 hover:bg-muted rounded-l-lg"
                    aria-label="Decrease servings"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="num px-3 text-sm font-medium">{servings}</span>
                  <button
                    type="button"
                    onClick={() => setServings(Math.min(recipe.servings, servings + 1))}
                    className="px-2 py-1 hover:bg-muted rounded-r-lg"
                    aria-label="Increase servings"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                { l: "kcal", v: total.calories },
                { l: "Protein", v: `${total.protein}g` },
                { l: "Carbs", v: `${total.carbs}g` },
                { l: "Fat", v: `${total.fat}g` },
                { l: "Fiber", v: `${total.fiber}g` },
              ].map((m) => (
                <div key={m.l} className="rounded-lg bg-card border py-1.5">
                  <div className="num text-sm font-semibold">{m.v}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.l}</div>
                </div>
              ))}
            </div>
          </div>

          {recipe.instructions && (
            <div className="mt-4">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Instructions</div>
              <div className="text-sm whitespace-pre-wrap leading-relaxed text-foreground p-3 rounded-xl border bg-muted/10">
                {recipe.instructions}
              </div>
            </div>
          )}

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={handleCooked}>
              <Check className="size-4 mr-1" /> Cooked this
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
