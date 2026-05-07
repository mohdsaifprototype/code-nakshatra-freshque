import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import { daysUntil, expiryClasses, expiryLabel, expiryStatus, formatINR, hoursUntil, itemValue } from "@/lib/pantry-utils";
import type { PantryItem } from "@/types";

export function ExpiringSoonTile({ items }: { items: PantryItem[] }) {
  const navigate = useNavigate();
  const sorted = [...items]
    .filter((i) => !i.consumed && !i.expired)
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
    .slice(0, 7);

  return (
    <div className="bento-tile col-span-12 md:col-span-6 xl:col-span-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-display text-lg">Expiring soon</div>
          <div className="text-xs text-muted-foreground">Cook these to recover ₹ value</div>
        </div>
        <button
          onClick={() => navigate("/pantry")}
          className="text-xs text-primary inline-flex items-center gap-1 hover:gap-2 transition-all"
        >
          See all <ArrowRight className="size-3.5" />
        </button>
      </div>
      <ul className="space-y-1.5">
        {sorted.map((i) => {
          const status = expiryStatus(i.expiryDate);
          const h = hoursUntil(i.expiryDate);
          const d = daysUntil(i.expiryDate);
          const when =
            status === "expired" ? "Expired" : h <= 48 ? `${Math.max(0, h)}h left` : `${d}d left`;
          return (
            <li
              key={i.id}
              className="flex items-center gap-3 rounded-lg px-2.5 py-2 hover:bg-muted/50 transition-colors"
            >
              <span className={`size-2 rounded-full bg-expiry-${status}`} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{i.name}</div>
                <div className="text-[11px] text-muted-foreground">
                  {i.quantity}{i.unit} · {i.category}
                </div>
              </div>
              <div className="text-right">
                <div className="num text-sm font-medium">{formatINR(itemValue(i))}</div>
                <div className={`chip mt-0.5 ${expiryClasses[status]}`}>
                  <Clock className="size-3" />
                  {when}
                </div>
              </div>
            </li>
          );
        })}
        {sorted.length === 0 && (
          <li className="text-sm text-muted-foreground p-4 text-center">Nothing in your pantry yet.</li>
        )}
      </ul>
      <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
        <span>{expiryLabel.critical} = next 48 hours</span>
        <span>{expiryLabel.soon} = next 7 days</span>
      </div>
    </div>
  );
}
