import { useEffect, useState } from "react";
import { TrendingDown, AlertTriangle } from "lucide-react";
import { formatINR, potentialLoss } from "@/lib/pantry-utils";
import type { PantryItem } from "@/types";

export function LossTickerTile({ items }: { items: PantryItem[] }) {
  const target = potentialLoss(items);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const from = display;
    const duration = 700;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(from + (target - from) * p));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const criticalCount = items.filter((i) => {
    const h = (new Date(i.expiryDate).getTime() - Date.now()) / 36e5;
    return h >= 0 && h <= 48;
  }).length;

  return (
    <div
      className="bento-tile col-span-12 md:col-span-6 xl:col-span-4 overflow-hidden text-primary-foreground"
      style={{ background: "var(--gradient-loss)", boxShadow: "var(--shadow-glow)" }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-white/85 text-sm">
            <AlertTriangle className="size-4" />
            Potential loss · next 48h
          </div>
          <div className="num display text-5xl xl:text-6xl mt-3 text-white">
            {formatINR(display)}
          </div>
        </div>
        <div className="size-10 rounded-full bg-white/15 grid place-items-center animate-tick">
          <TrendingDown className="size-5 text-white" />
        </div>
      </div>
      <div className="mt-5 flex items-center gap-3 text-sm text-white/90">
        <span className="chip bg-white/15 text-white border border-white/20">
          {criticalCount} item{criticalCount === 1 ? "" : "s"} expiring
        </span>
        <span className="text-white/70">Cook them today to save this value.</span>
      </div>
    </div>
  );
}
