import { toast } from "sonner";
import { addDays } from "date-fns";
import { LossTickerTile } from "@/components/dashboard/LossTickerTile";
import { PantrySnapshotTile } from "@/components/dashboard/PantrySnapshotTile";
import { QuickEntryTile } from "@/components/dashboard/QuickEntryTile";
import { ScanReceiptTile } from "@/components/dashboard/ScanReceiptTile";
import { ExpiringSoonTile } from "@/components/dashboard/ExpiringSoonTile";
import { RecipeStripTile } from "@/components/dashboard/RecipeStripTile";
import { WealthChartTile } from "@/components/dashboard/WealthChartTile";
import { usePantry } from "@/contexts/PantryContext";
import type { PantryItem, QuickStaple } from "@/types";

export default function Dashboard() {
  const { items, addItem } = usePantry();

  const handleQuickAdd = (s: QuickStaple) => {
    const now = new Date();
    const item: PantryItem = {
      id: `q-${Date.now()}`,
      name: s.name,
      quantity: s.defaultQty,
      unit: s.unit,
      category: s.category,
      pricePerUnit: s.estimatedPrice,
      priceSource: "ai_oracle",
      purchaseDate: now.toISOString(),
      expiryDate: addDays(now, s.defaultExpiryDays).toISOString(),
    };
    addItem(item);
    toast.success(`Added ${s.defaultQty}${s.unit} of ${s.name}`);
  };

  return (
    <div className="grid grid-cols-12 gap-4 max-w-[1400px] mx-auto animate-fade-in-up">
      <LossTickerTile items={items} />
      <PantrySnapshotTile items={items} />
      <ScanReceiptTile />
      <QuickEntryTile onAdd={handleQuickAdd} />
      <ExpiringSoonTile items={items} />
      <RecipeStripTile />
      <WealthChartTile />
    </div>
  );
}
