import { useMemo, useState } from "react";
import { Plus, Search, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { usePantry } from "@/contexts/PantryContext";
import {
  daysUntil,
  expiryClasses,
  expiryLabel,
  expiryStatus,
  formatINR,
  itemValue,
} from "@/lib/pantry-utils";
import type { Category, PantryItem, Unit } from "@/types";
import { addDays } from "date-fns";

const categories: Category[] = ["dairy", "produce", "grains", "protein", "spices", "bakery", "snacks", "beverages", "oils", "other"];
const units: Unit[] = ["kg", "g", "L", "ml", "pcs", "pack", "dozen"];

export default function Pantry() {
  const { items, addItem, removeItem, consumeItem } = usePantry();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "fresh" | "soon" | "critical" | "expired">("all");
  const [open, setOpen] = useState(false);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (i.consumed) return false;
      if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter !== "all" && expiryStatus(i.expiryDate) !== filter) return false;
      return true;
    });
  }, [items, q, filter]);

  const remove = (id: string) => {
    removeItem(id);
    toast.success("Removed");
  };
  const consume = (id: string) => {
    consumeItem(id);
    toast.success("Logged as consumed");
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-4 animate-fade-in-up">
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pantry…" className="pl-9" />
        </div>
        <div className="flex gap-1.5">
          {(["all", "critical", "soon", "fresh", "expired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`chip border ${filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-muted"}`}
            >
              {f === "all" ? "All" : expiryLabel[f as keyof typeof expiryLabel]}
            </button>
          ))}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="ml-auto"><Plus className="size-4 mr-1" /> Manual entry</Button>
          </DialogTrigger>
          <ManualAddDialog onAdd={(it) => { addItem(it); setOpen(false); toast.success(`Added ${it.name}`); }} />
        </Dialog>
      </div>

      <div className="bento-tile p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="text-left">
                <th className="px-4 py-2.5 font-medium">Item</th>
                <th className="px-4 py-2.5 font-medium">Category</th>
                <th className="px-4 py-2.5 font-medium">Qty</th>
                <th className="px-4 py-2.5 font-medium num">Value</th>
                <th className="px-4 py-2.5 font-medium">Expiry</th>
                <th className="px-4 py-2.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => {
                const status = expiryStatus(i.expiryDate);
                const d = daysUntil(i.expiryDate);
                return (
                  <tr key={i.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        <span className={`size-2 rounded-full bg-expiry-${status}`} />
                        {i.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground capitalize">
                        {i.priceSource.replace("_", " ")} price
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{i.category}</td>
                    <td className="px-4 py-3 num">{i.quantity}{i.unit === "pcs" ? "" : i.unit}</td>
                    <td className="px-4 py-3 num font-medium">{formatINR(itemValue(i))}</td>
                    <td className="px-4 py-3">
                      <span className={`chip ${expiryClasses[status]}`}>
                        {status === "expired" ? "Expired" : `${d}d left`}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => consume(i.id)} title="Mark consumed">
                          <Check className="size-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(i.id)} title="Delete">
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No items match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ManualAddDialog({ onAdd }: { onAdd: (i: PantryItem) => void }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState<Unit>("pcs");
  const [category, setCategory] = useState<Category>("produce");
  const [price, setPrice] = useState("0");
  const [days, setDays] = useState("7");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const now = new Date();
    onAdd({
      id: `m-${Date.now()}`,
      name: name.trim().slice(0, 80),
      quantity: Number(qty) || 1,
      unit,
      category,
      pricePerUnit: Number(price) || 0,
      priceSource: "manual",
      purchaseDate: now.toISOString(),
      expiryDate: addDays(now, Number(days) || 7).toISOString(),
    });
    setName(""); setQty("1"); setPrice("0"); setDays("7");
  };

  return (
    <DialogContent>
      <DialogHeader><DialogTitle>Add pantry item</DialogTitle></DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <Label>Name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="e.g. Mangoes" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Quantity</Label>
            <Input type="number" min="0" step="0.01" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <Label>Unit</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as Unit)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{categories.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Price per unit (₹)</Label>
            <Input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Expires in (days)</Label>
          <Input type="number" min="0" value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <DialogFooter>
          <Button type="submit">Add to pantry</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
