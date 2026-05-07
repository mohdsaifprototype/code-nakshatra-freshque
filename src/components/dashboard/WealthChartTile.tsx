import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { format, parseISO, startOfMonth } from "date-fns";
import { formatINR } from "@/lib/pantry-utils";

export function WealthChartTile() {
  const data = useMemo(() => {
    const byMonth: Record<string, { key: string; month: string; saved: number; wasted: number }> = {};
    // Start empty until real stats are fetched from the backend.
    const logs: Array<{ date: string; outcome: "consumed" | "expired"; value: number }> = [];
    for (const l of logs) {
      const d = parseISO(l.date);
      const key = format(startOfMonth(d), "yyyy-MM");
      const label = format(d, "MMM yy");
      if (!byMonth[key]) byMonth[key] = { key, month: label, saved: 0, wasted: 0 };
      if (l.outcome === "consumed") byMonth[key].saved += l.value;
      else byMonth[key].wasted += l.value;
    }
    return Object.values(byMonth).sort((a, b) => a.key.localeCompare(b.key));
  }, []);

  const totals = useMemo(
    () =>
      data.reduce(
        (acc, d) => ({ saved: acc.saved + d.saved, wasted: acc.wasted + d.wasted }),
        { saved: 0, wasted: 0 },
      ),
    [data],
  );
  const wastePct = totals.saved + totals.wasted > 0
    ? Math.round((totals.wasted * 100) / (totals.saved + totals.wasted))
    : 0;

  return (
    <div className="bento-tile col-span-12">
      <div className="flex items-end justify-between mb-3 flex-wrap gap-3">
        <div>
          <div className="font-display text-lg">Wealth saved vs wasted</div>
          <div className="text-xs text-muted-foreground">Last 12 months · ₹ value of consumed vs expired food</div>
        </div>
        <div className="flex items-center gap-5">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Saved</div>
            <div className="num display text-2xl text-wealth-saved">{formatINR(totals.saved)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Wasted</div>
            <div className="num display text-2xl text-wealth-wasted">{formatINR(totals.wasted)}</div>
          </div>
          <div className="hidden sm:block">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Waste rate</div>
            <div className="num display text-2xl">{wastePct}%</div>
          </div>
        </div>
      </div>
      <div className="h-64 -ml-2">
        {data.length === 0 ? (
          <div className="h-full grid place-items-center text-sm text-muted-foreground">
            No data yet — log a “Cooked this” meal or let items expire to see your 30‑day trend.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 6" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(v) => formatINR(v as number, { compact: true })}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                contentStyle={{
                  background: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(value: number, name) => [formatINR(value), name === "saved" ? "Saved" : "Wasted"]}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
                iconType="circle"
                formatter={(v) => (v === "saved" ? "Saved" : "Wasted")}
              />
              <Bar dataKey="saved" fill="hsl(var(--wealth-saved))" radius={[6, 6, 0, 0]} />
              <Bar dataKey="wasted" fill="hsl(var(--wealth-wasted))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
