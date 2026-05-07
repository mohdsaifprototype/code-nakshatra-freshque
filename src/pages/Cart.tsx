import { Sparkles, Trash2, Plus, Minus, ShoppingCart, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { QUICK_STAPLES } from "@/lib/mock-data";
import { formatINR } from "@/lib/pantry-utils";
import { format, parseISO } from "date-fns";

export default function Cart() {
  const { items, addStaple, updateQty, removeItem, clearPurchased, totalEstimated } = useCart();

  const auto = items.filter((i) => i.auto);
  const manual = items.filter((i) => !i.auto);

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h2 className="font-display text-2xl flex items-center gap-2">
            <ShoppingCart className="size-6 text-primary" /> Shopping Cart
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            The moment a staple runs out in your pantry, it's added here automatically.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {items.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearPurchased}>
              <CheckCircle2 className="size-4 mr-1.5" /> Mark all purchased
            </Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-3 gap-3">
        <div className="bento-tile p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Items in cart</div>
          <div className="display num text-4xl mt-1">{items.length}</div>
        </div>
        <div className="bento-tile p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Auto-added staples</div>
          <div className="display num text-4xl mt-1 text-primary">{auto.length}</div>
        </div>
        <div className="bento-tile p-5">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Estimated total</div>
          <div className="display num text-4xl mt-1">{formatINR(totalEstimated)}</div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bento-tile p-10 text-center">
          <ShoppingCart className="size-10 mx-auto text-muted-foreground" />
          <div className="font-display text-xl mt-3">Your cart is empty</div>
          <p className="text-sm text-muted-foreground mt-1">Your pantry is fully stocked. Nice work.</p>
        </div>
      ) : (
        <>
          {auto.length > 0 && (
            <Section
              title="Smart restock"
              icon={<Sparkles className="size-4 text-primary" />}
              subtitle="Auto-added because these staples finished in your pantry"
            >
              {auto.map((i) => (
                <CartRow key={i.id} item={i} onQty={updateQty} onRemove={removeItem} />
              ))}
            </Section>
          )}

          {manual.length > 0 && (
            <Section title="Added by you" subtitle="Items you put in manually">
              {manual.map((i) => (
                <CartRow key={i.id} item={i} onQty={updateQty} onRemove={removeItem} />
              ))}
            </Section>
          )}
        </>
      )}

      {/* Quick add staples */}
      <div className="bento-tile p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-display text-lg">Quick add</div>
            <div className="text-xs text-muted-foreground">Tap a staple to drop it in your cart</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_STAPLES.map((s) => {
            const inCart = items.some((i) => i.stapleKey === s.key);
            return (
              <button
                key={s.key}
                onClick={() => addStaple(s.key)}
                disabled={inCart}
                className="chip border bg-card hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="mr-1">{s.emoji}</span> {s.name}
                {inCart && <CheckCircle2 className="size-3 ml-1 text-primary" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bento-tile p-0 overflow-hidden">
      <div className="px-5 py-4 border-b bg-muted/30">
        <div className="font-display text-lg flex items-center gap-2">{icon}{title}</div>
        {subtitle && <div className="text-xs text-muted-foreground mt-0.5">{subtitle}</div>}
      </div>
      <div className="divide-y">{children}</div>
    </div>
  );
}

function CartRow({ item, onQty, onRemove }: { item: ReturnType<typeof useCart>["items"][number]; onQty: (id: string, q: number) => void; onRemove: (id: string) => void }) {
  const estTotal = Math.round(item.estimatedPrice * (item.unit === "g" || item.unit === "ml" ? 1 : item.quantity));
  return (
    <div className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
      <div className="size-10 rounded-xl bg-muted grid place-items-center text-xl shrink-0">
        {item.emoji || "🛒"}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="font-medium truncate">{item.name}</div>
          {item.auto && (
            <Badge variant="secondary" className="text-[10px] h-5">
              <Sparkles className="size-3 mr-1" /> Auto
            </Badge>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          Added {format(parseISO(item.addedAt), "d MMM")} · {formatINR(estTotal)}
        </div>
      </div>

      <div className="flex items-center gap-1 rounded-lg border bg-card">
        <Button size="icon" variant="ghost" className="size-8" onClick={() => onQty(item.id, item.quantity - 1)}>
          <Minus className="size-3.5" />
        </Button>
        <div className="num text-sm min-w-[48px] text-center">
          {item.quantity}
          <span className="text-muted-foreground ml-0.5 text-xs">{item.unit === "pcs" ? "" : item.unit}</span>
        </div>
        <Button size="icon" variant="ghost" className="size-8" onClick={() => onQty(item.id, item.quantity + 1)}>
          <Plus className="size-3.5" />
        </Button>
      </div>

      <Button size="icon" variant="ghost" onClick={() => onRemove(item.id)} title="Remove">
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </div>
  );
}
