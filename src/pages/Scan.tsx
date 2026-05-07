import { useRef, useState } from "react";
import { Camera, Loader2, Sparkles, Upload, X, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatINR } from "@/lib/pantry-utils";
import { useNotifications } from "@/contexts/NotificationsContext";
import { usePantry } from "@/contexts/PantryContext";
import { api } from "@/lib/api";

interface ParsedRow {
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  category: string;
}

const CATEGORIES = ["dairy", "produce", "grains", "protein", "spices", "bakery", "snacks", "beverages", "oils", "other"] as const;
const UNITS = ["kg", "g", "L", "ml", "pcs", "pack", "dozen"] as const;

// Default expiry days per category
const CATEGORY_EXPIRY_DAYS: Record<string, number> = {
  dairy:     5,
  produce:   7,
  grains:    180,
  protein:   3,
  spices:    365,
  bakery:    4,
  snacks:    90,
  beverages: 30,
  oils:      150,  // ~5 months
  other:     30,
};

const MOCK_PARSED: ParsedRow[] = [
  { name: "Amul Milk 1L", quantity: 2, unit: "L", pricePerUnit: 68, category: "dairy" },
  { name: "Tomatoes", quantity: 1, unit: "kg", pricePerUnit: 60, category: "produce" },
  { name: "Britannia Bread", quantity: 1, unit: "pack", pricePerUnit: 45, category: "bakery" },
  { name: "Aashirvaad Atta 5kg", quantity: 1, unit: "pack", pricePerUnit: 245, category: "grains" },
  { name: "Onions", quantity: 2, unit: "kg", pricePerUnit: 35, category: "produce" },
];

function toPositiveNumber(value: unknown, fallback: number) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }
  if (typeof value === "string") {
    const cleaned = value.replace(/[^\d.]/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  }
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function normaliseRow(raw: any): ParsedRow {
  const quantity = toPositiveNumber(raw?.quantity ?? raw?.qty, 1);
  const unitPriceRaw = raw?.pricePerUnit ?? raw?.unitPrice ?? raw?.price ?? raw?.price_inr;
  const totalPriceRaw = raw?.amount ?? raw?.lineTotal ?? raw?.total;
  const unitPrice = toPositiveNumber(unitPriceRaw, 0);
  const totalPrice = toPositiveNumber(totalPriceRaw, 0);
  const pricePerUnit = unitPrice > 0 ? unitPrice : totalPrice > 0 ? totalPrice / Math.max(1, quantity) : 0;
  const unit = typeof raw?.unit === "string" && UNITS.includes(raw.unit as any) ? raw.unit : "pcs";
  const category = typeof raw?.category === "string" ? raw.category : "other";
  return {
    name: typeof raw?.name === "string" ? raw.name : "",
    quantity,
    unit,
    pricePerUnit,
    category,
  };
}

export default function Scan() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const { push: pushNotification } = useNotifications();
  const { addItem } = usePantry();

  const handleFile = async (file: File) => {
    if (file.size > 8 * 1024 * 1024) return toast.error("Max 8MB");
    setPreview(URL.createObjectURL(file));
    setScanning(true);
    
    try {
      const data = await api.scanReceipt(file);
      const parsedRows = Array.isArray(data.items)
        ? data.items
            .map(normaliseRow)
            .filter((row) => row.name.trim().length > 0)
        : [];
      setRows(parsedRows);
      setScanning(false);
      toast.success(`Found ${parsedRows.length} items`);
      pushNotification({
        kind: "intake",
        title: "Receipt scan ready for review",
        body: `OCR extracted ${parsedRows.length} items. Review and confirm before they're added to your pantry.`,
        href: "/scan",
      });
    } catch (e: any) {
      console.error("Scan error:", e);
      setScanning(false);
      toast.error(`Scan failed: ${e.message}. See console for details.`);
    }
  };

  const total = (rows ?? []).reduce((s, r) => s + r.quantity * r.pricePerUnit, 0);

  const confirm = () => {
    if (rows) {
      rows.forEach((r) => {
        addItem({
          id: crypto.randomUUID(),
          name: r.name,
          category: r.category as any || "other",
          quantity: r.quantity,
          unit: r.unit as any,
          pricePerUnit: r.pricePerUnit,
          priceSource: "receipt", 
          purchaseDate: new Date().toISOString(),
          expiryDate: new Date(Date.now() + (CATEGORY_EXPIRY_DAYS[r.category] ?? 7) * 24 * 60 * 60 * 1000).toISOString(),
          consumed: false,
        });
      });
    }
    toast.success(`${rows?.length ?? 0} items added to pantry`);
    setPreview(null);
    setRows(null);
  };

  return (
    <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-4 animate-fade-in-up">
      <div className="bento-tile">
        <div className="font-display text-xl flex items-center gap-2">
          <Sparkles className="size-5 text-primary" /> Receipt scan
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Snap or upload your grocery receipt. Our OCR engine will extract item names, quantities and ₹ prices.
        </p>

        <div
          className="mt-4 rounded-xl border-2 border-dashed bg-muted/30 aspect-[4/3] grid place-items-center overflow-hidden relative"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
        >
          {preview ? (
            <img src={preview} alt="Receipt preview" className="w-full h-full object-contain" />
          ) : (
            <div className="text-center p-6">
              <div className="size-12 mx-auto rounded-2xl bg-primary/10 text-primary grid place-items-center mb-3">
                <Camera className="size-6" />
              </div>
              <div className="font-medium">Drop receipt here</div>
              <div className="text-xs text-muted-foreground mt-1">PNG, JPG up to 8MB</div>
            </div>
          )}
          {scanning && (
            <div className="absolute inset-0 bg-background/70 backdrop-blur-sm grid place-items-center">
              <div className="flex items-center gap-2 text-primary">
                <Loader2 className="size-4 animate-spin" /> Scanning receipt…
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <Button onClick={() => fileRef.current?.click()} className="flex-1">
            <Upload className="size-4 mr-1" /> Choose file
          </Button>
          <Button variant="outline" onClick={() => { setPreview(null); setRows([]); }} className="flex-1">
            Skip & Add Manually
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {preview && (
            <Button variant="outline" onClick={() => { setPreview(null); setRows(null); }}>
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="bento-tile">
        <div className="flex items-center justify-between">
          <div className="font-display text-xl">Review extracted items</div>
          {rows && <span className="chip bg-primary/10 text-primary border border-primary/20">{rows.length} items</span>}
        </div>

        {!rows ? (
          <div className="mt-10 text-center text-muted-foreground text-sm">
            Upload a receipt to see extracted items here.
          </div>
        ) : (
          <>
            <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto pr-1">
              {rows.map((r, idx) => (
                <div key={idx} className="relative grid grid-cols-12 gap-1.5 items-center rounded-lg border p-2 pr-10">
                  {/* Name */}
                  <Input
                    className="col-span-4 text-sm"
                    value={r.name}
                    placeholder="Item name"
                    onChange={(e) => setRows((prev) => prev!.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                  />
                  {/* Category */}
                  <select
                    className="col-span-2 h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                    value={r.category || "other"}
                    onChange={(e) => setRows((prev) => prev!.map((x, i) => i === idx ? { ...x, category: e.target.value } : x))}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                  {/* Qty */}
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="col-span-2 num text-sm"
                    value={r.quantity}
                    onChange={(e) => setRows((prev) => prev!.map((x, i) => i === idx ? { ...x, quantity: Number(e.target.value) } : x))}
                  />
                  {/* Unit */}
                  <select
                    className="col-span-2 h-9 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                    value={r.unit}
                    onChange={(e) => setRows((prev) => prev!.map((x, i) => i === idx ? { ...x, unit: e.target.value } : x))}
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  {/* Price */}
                  <Input
                    type="text"
                    inputMode="decimal"
                    pattern="^\\d*(\\.\\d{0,2})?$"
                    className="col-span-2 num text-sm"
                    value={r.pricePerUnit === 0 ? "" : r.pricePerUnit}
                    placeholder="Price (₹/unit)"
                    onChange={(e) => setRows((prev) => prev!.map((x, i) => i === idx ? { ...x, pricePerUnit: Number(e.target.value) } : x))}
                  />
                  {/* Delete (moved out so it doesn't look like an empty input box) */}
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                    aria-label="Remove item"
                    onClick={() => setRows((prev) => prev!.filter((_, i) => i !== idx))}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full mt-2 border-dashed" 
                onClick={() => setRows((prev) => [...(prev || []), { name: "", quantity: 1, unit: "pcs", pricePerUnit: 0, category: "other" }])}
              >
                <Plus className="size-4 mr-1" /> Add item
              </Button>
            </div>
            <div className="mt-4 pt-3 border-t flex items-center justify-between">
              <div>
                <div className="text-xs text-muted-foreground">Receipt total</div>
                <div className="display num text-2xl">{formatINR(total)}</div>
              </div>
              <Button onClick={confirm}><Check className="size-4 mr-1" /> Add to pantry</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
