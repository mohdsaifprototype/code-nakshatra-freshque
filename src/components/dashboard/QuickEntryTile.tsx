import { Plus } from "lucide-react";
import { QUICK_STAPLES } from "@/lib/mock-data";
import type { QuickStaple } from "@/types";

export function QuickEntryTile({ onAdd }: { onAdd: (s: QuickStaple) => void }) {
  return (
    <div className="bento-tile col-span-12 xl:col-span-8">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-display text-lg">One-tap entry</div>
          <div className="text-xs text-muted-foreground">Indian staples · pre-set quantity & expiry</div>
        </div>
        <span className="chip bg-secondary text-secondary-foreground">Speed lane</span>
      </div>
      <div className="grid grid-cols-5 sm:grid-cols-5 lg:grid-cols-10 gap-2">
        {QUICK_STAPLES.map((s) => (
          <button
            key={s.key}
            onClick={() => onAdd(s)}
            className="group relative rounded-xl border bg-card hover:bg-secondary/60 transition-all p-2.5 text-center hover:-translate-y-0.5"
            title={`Add ${s.defaultQty} ${s.unit} of ${s.name}`}
          >
            <div className="text-2xl">{s.emoji}</div>
            <div className="text-[11px] mt-1 font-medium leading-tight">{s.name}</div>
            <div className="text-[10px] text-muted-foreground">
              {s.defaultQty}{s.unit === "pcs" ? "" : s.unit}
            </div>
            <div className="absolute top-1 right-1 size-4 rounded-full bg-primary/0 group-hover:bg-primary/10 grid place-items-center transition">
              <Plus className="size-3 text-primary opacity-0 group-hover:opacity-100" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
