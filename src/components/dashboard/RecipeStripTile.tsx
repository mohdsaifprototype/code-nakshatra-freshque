import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePantry } from "@/contexts/PantryContext";
import { api } from "@/lib/api";
import type { Recipe } from "@/types";

export function RecipeStripTile() {
  const navigate = useNavigate();
  const { vegetarianOnly } = useAuth();
  const { items } = usePantry();
  const [recipes, setRecipes] = useState<Recipe[]>([]);

  const pantryNames = useMemo(
    () => items.filter((i) => !i.consumed && !i.expired && i.quantity > 0).map((i) => i.name),
    [items],
  );

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (pantryNames.length === 0) {
          setRecipes([]);
          return;
        }
        const res = await api.searchRecipesWithPantry(pantryNames, vegetarianOnly);
        if (!cancelled) setRecipes(Array.isArray(res.recipes) ? res.recipes.slice(0, 3) : []);
      } catch {
        if (!cancelled) setRecipes([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [pantryNames.join("|"), vegetarianOnly]);

  const top = recipes.slice(0, 3);
  return (
    <div className="bento-tile col-span-12 xl:col-span-7">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-display text-lg flex items-center gap-2">
            From your pantry
            <span className="chip bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="size-3" /> Hybrid AI
            </span>
          </div>
          <div className="text-xs text-muted-foreground">Spoonacular matches + AI remixes</div>
        </div>
        <button
          onClick={() => navigate("/recipes")}
          className="text-xs text-primary inline-flex items-center gap-1 hover:gap-2 transition-all"
        >
          Recipe lab <ArrowRight className="size-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {top.length === 0 && (
          <div className="sm:col-span-3 text-sm text-muted-foreground border rounded-xl bg-muted/20 p-4">
            Add a few pantry items to see recipe matches here.
          </div>
        )}
        {top.map((r) => (
          <button
            key={r.id}
            onClick={() => navigate(`/recipes?open=${encodeURIComponent(r.id)}`)}
            className="group text-left rounded-xl overflow-hidden border bg-card hover:-translate-y-0.5 transition-all"
          >
            <div className="aspect-[4/3] bg-muted overflow-hidden">
              <img
                src={r.image}
                alt={r.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            </div>
            <div className="p-3">
              <div className="text-sm font-medium leading-tight line-clamp-2">{r.title}</div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{r.readyInMinutes} min</span>
                <span
                  className={
                    r.matchPercent === 100
                      ? "chip bg-expiry-fresh/10 text-expiry-fresh border border-expiry-fresh/20"
                      : "chip bg-accent/15 text-accent border border-accent/30"
                  }
                >
                  {r.matchPercent}% match
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
