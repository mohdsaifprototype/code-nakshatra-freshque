import { Package, IndianRupee, CalendarClock } from "lucide-react";
import { expiryStatus, formatINR, totalValue } from "@/lib/pantry-utils";
import type { PantryItem } from "@/types";

export function PantrySnapshotTile({ items }: { items: PantryItem[] }) {
  const total = totalValue(items);
  const expiringWeek = items.filter((i) => {
    const s = expiryStatus(i.expiryDate);
    return s === "soon" || s === "critical";
  }).length;

  const stats = [
    { icon: Package, label: "Items", value: items.length.toString() },
    { icon: IndianRupee, label: "Pantry value", value: formatINR(total, { compact: true }) },
    { icon: CalendarClock, label: "Expiring this week", value: expiringWeek.toString() },
  ];

  return (
    <div className="bento-tile col-span-12 md:col-span-6 xl:col-span-4">
      <div className="text-sm text-muted-foreground">Pantry snapshot</div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {stats.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl bg-muted/40 p-3">
            <Icon className="size-4 text-muted-foreground" />
            <div className="num display text-2xl mt-2">{value}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
