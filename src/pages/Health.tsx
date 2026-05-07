import { useMemo, useState } from "react";
import { Activity, Flame, Target, Trash2, Pencil, Check, X } from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNutrition } from "@/contexts/NutritionContext";
import type { NutritionTargets } from "@/types";
import { format } from "date-fns";

export default function Health() {
  const { targets, setTargets, todayTotals, todayLogs, removeLog } = useNutrition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<NutritionTargets>(targets);

  const calPct = Math.min(100, Math.round((todayTotals.calories / targets.calories) * 100)) || 0;
  const remaining = Math.max(0, targets.calories - todayTotals.calories);

  // Gauge: semi-circle. Two slices: consumed + remaining.
  const gaugeData = useMemo(() => {
    const consumed = Math.min(todayTotals.calories, targets.calories);
    const left = Math.max(0, targets.calories - consumed);
    return [
      { name: "consumed", value: consumed, fill: "hsl(var(--primary))" },
      { name: "remaining", value: left, fill: "hsl(var(--muted))" },
    ];
  }, [todayTotals.calories, targets.calories]);

  const macros = useMemo(() => {
    const rows = [
      { key: "protein", label: "Protein", value: todayTotals.protein, target: targets.protein, color: "hsl(var(--primary))" },
      { key: "carbs", label: "Carbs", value: todayTotals.carbs, target: targets.carbs, color: "hsl(var(--accent))" },
      { key: "fat", label: "Fat", value: todayTotals.fat, target: targets.fat, color: "hsl(var(--expiry-critical))" },
      { key: "fiber", label: "Fiber", value: todayTotals.fiber, target: targets.fiber, color: "hsl(var(--expiry-fresh))" },
    ];
    return rows.map((r) => ({ ...r, pct: Math.min(100, Math.round((r.value / r.target) * 100)) || 0 }));
  }, [todayTotals, targets]);

  const overCal = todayTotals.calories > targets.calories;

  return (
    <div className="grid grid-cols-12 gap-4 max-w-[1400px] mx-auto animate-fade-in-up">
      {/* Header */}
      <div className="col-span-12 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="font-display text-2xl flex items-center gap-2">
            <Activity className="size-6 text-primary" /> Health & Nutrition Hub
          </div>
          <div className="text-sm text-muted-foreground">
            Today, {format(new Date(), "EEE, d MMM")} — your "Cooked This" meals roll up here.
          </div>
        </div>
        {!editing ? (
          <Button variant="outline" size="sm" onClick={() => { setDraft(targets); setEditing(true); }}>
            <Pencil className="size-3.5 mr-1.5" /> Edit targets
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="size-3.5 mr-1.5" /> Cancel
            </Button>
            <Button size="sm" onClick={() => { setTargets(draft); setEditing(false); }}>
              <Check className="size-3.5 mr-1.5" /> Save
            </Button>
          </div>
        )}
      </div>

      {/* Calorie semi-circle gauge */}
      <div className="bento-tile col-span-12 lg:col-span-5">
        <div className="flex items-center justify-between mb-2">
          <div className="font-display text-lg flex items-center gap-2">
            <Flame className="size-4 text-accent" /> Calories
          </div>
          <span className={`chip border ${overCal ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-primary/10 text-primary border-primary/20"}`}>
            {calPct}% of goal
          </span>
        </div>

        <div className="relative h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={gaugeData}
                dataKey="value"
                cx="50%"
                cy="85%"
                startAngle={180}
                endAngle={0}
                innerRadius={110}
                outerRadius={150}
                stroke="none"
                cornerRadius={8}
                paddingAngle={1}
              >
                {gaugeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
            <div className="num font-display text-4xl">{todayTotals.calories.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              of <span className="num">{targets.calories.toLocaleString()}</span> kcal
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          <Stat label="Consumed" value={`${todayTotals.calories} kcal`} />
          <Stat label={overCal ? "Over by" : "Remaining"} value={`${overCal ? todayTotals.calories - targets.calories : remaining} kcal`} accent={overCal ? "destructive" : "primary"} />
          <Stat label="Meals today" value={`${todayLogs.length}`} />
        </div>
      </div>

      {/* Macro bar chart */}
      <div className="bento-tile col-span-12 lg:col-span-7">
        <div className="flex items-center justify-between mb-2">
          <div className="font-display text-lg flex items-center gap-2">
            <Target className="size-4 text-primary" /> Macros vs Targets
          </div>
          <span className="text-xs text-muted-foreground">Grams · today</span>
        </div>

        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={macros}
              layout="vertical"
              margin={{ top: 4, right: 48, bottom: 0, left: 8 }}
              barCategoryGap={14}
            >
              <XAxis type="number" hide domain={[0, (dataMax: number) => Math.max(dataMax, ...macros.map(m => m.target)) * 1.1]} />
              <YAxis
                type="category"
                dataKey="label"
                axisLine={false}
                tickLine={false}
                width={70}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              {/* Target track */}
              <Bar dataKey="target" fill="hsl(var(--muted))" radius={6} barSize={18} />
              {/* Consumed overlay */}
              <Bar dataKey="value" radius={6} barSize={18}>
                {macros.map((m, i) => (
                  <Cell key={i} fill={m.color} />
                ))}
                <LabelList
                  dataKey="value"
                  position="right"
                  formatter={(v: number) => `${v}g`}
                  style={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 600 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          {macros.map((m) => (
            <div key={m.key} className="rounded-xl border bg-card/50 p-2.5">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{m.label}</div>
              <div className="num text-sm font-medium mt-0.5">
                {m.value}<span className="text-muted-foreground"> / {m.target}g</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${m.pct}%`, backgroundColor: m.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit targets panel */}
      {editing && (
        <div className="bento-tile col-span-12">
          <div className="font-display text-lg mb-3">Daily targets</div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {(["calories", "protein", "carbs", "fat", "fiber"] as const).map((k) => (
              <div key={k}>
                <Label className="capitalize text-xs">{k} {k === "calories" ? "(kcal)" : "(g)"}</Label>
                <Input
                  type="number"
                  min={0}
                  value={draft[k]}
                  onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Today's meals */}
      <div className="bento-tile col-span-12">
        <div className="font-display text-lg mb-3">Today's meals</div>
        {todayLogs.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border-2 border-dashed rounded-xl">
            No meals logged yet. Open the Recipe Lab and tap <span className="font-medium text-foreground">Cooked this</span> on a recipe.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Meal</th>
                  <th className="text-right px-3 py-2">Servings</th>
                  <th className="text-right px-3 py-2">kcal</th>
                  <th className="text-right px-3 py-2">P</th>
                  <th className="text-right px-3 py-2">C</th>
                  <th className="text-right px-3 py-2">F</th>
                  <th className="text-right px-3 py-2">Fiber</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {todayLogs.map((l) => (
                  <tr key={l.id} className="border-t hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{l.recipeTitle}</td>
                    <td className="px-3 py-2 text-right num">{l.servings}</td>
                    <td className="px-3 py-2 text-right num">{l.nutrition.calories}</td>
                    <td className="px-3 py-2 text-right num">{l.nutrition.protein}g</td>
                    <td className="px-3 py-2 text-right num">{l.nutrition.carbs}g</td>
                    <td className="px-3 py-2 text-right num">{l.nutrition.fat}g</td>
                    <td className="px-3 py-2 text-right num">{l.nutrition.fiber}g</td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => removeLog(l.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        aria-label="Remove meal"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, accent = "default" }: { label: string; value: string; accent?: "default" | "primary" | "destructive" }) {
  const cls = accent === "primary" ? "text-primary" : accent === "destructive" ? "text-destructive" : "text-foreground";
  return (
    <div className="rounded-xl border bg-card/50 px-3 py-2">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`num text-sm font-semibold mt-0.5 ${cls}`}>{value}</div>
    </div>
  );
}
