import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { QUICK_STAPLES } from "@/lib/mock-data";
import { usePantry } from "@/contexts/PantryContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import type { PantryItem, Unit, Category } from "@/types";

export interface CartItem {
  id: string;
  name: string;
  quantity: number;
  unit: Unit;
  category: Category;
  estimatedPrice: number; // ₹ per purchased pack/unit
  emoji?: string;
  auto: boolean; // auto-added by smart restock
  addedAt: string; // ISO
  stapleKey?: string;
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  totalEstimated: number;
  addItem: (i: Omit<CartItem, "id" | "addedAt">) => void;
  addStaple: (key: string) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clearPurchased: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "freshque_cart";

const stapleByKey = new Map(QUICK_STAPLES.map((s) => [s.key, s]));
const stapleByName = (name: string) =>
  QUICK_STAPLES.find((s) => name.toLowerCase().includes(s.name.toLowerCase()));

// Does the pantry currently "have" this staple in stock?
function pantryHasStaple(pantry: PantryItem[], stapleKey: string) {
  return pantry.some(
    (p) =>
      !p.consumed &&
      !p.expired &&
      p.quantity > 0 &&
      stapleByName(p.name)?.key === stapleKey,
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { items: pantry } = usePantry();
  const { push: pushNotification } = useNotifications();

  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem: CartContextValue["addItem"] = useCallback((i) => {
    setItems((prev) => {
      const existing = prev.find(
        (p) => p.name.toLowerCase() === i.name.toLowerCase() && p.unit === i.unit,
      );
      if (existing) {
        return prev.map((p) =>
          p.id === existing.id ? { ...p, quantity: p.quantity + i.quantity } : p,
        );
      }
      return [
        { ...i, id: `cart-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, addedAt: new Date().toISOString() },
        ...prev,
      ];
    });
  }, []);

  const addStaple = useCallback((key: string) => {
    const s = stapleByKey.get(key);
    if (!s) return;
    addItem({
      name: s.name,
      quantity: s.defaultQty,
      unit: s.unit,
      category: s.category,
      estimatedPrice: s.estimatedPrice * (s.unit === "g" || s.unit === "ml" ? s.defaultQty : 1),
      emoji: s.emoji,
      auto: false,
      stapleKey: s.key,
    });
  }, [addItem]);

  const updateQty = useCallback((id: string, qty: number) => {
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, quantity: Math.max(0, qty) } : p)));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearPurchased = useCallback(() => {
    setItems([]);
    toast.success("Cart cleared");
  }, []);

  // --- Reactive auto-restock ---
  // Track which staples were in stock last render. The moment a staple transitions
  // from "in stock" to "out of stock" (quantity 0 / consumed / expired / removed),
  // add it to the cart automatically. No manual re-scan needed.
  const prevStockRef = useRef<Record<string, boolean> | null>(null);
  const didMountRef = useRef(false);

  useEffect(() => {
    const currentStock: Record<string, boolean> = {};
    for (const s of QUICK_STAPLES) {
      currentStock[s.key] = pantryHasStaple(pantry, s.key);
    }

    // First run: seed the baseline. Also auto-add anything already missing
    // if it's not already in the cart, so users see the feature in action.
    if (!didMountRef.current) {
      didMountRef.current = true;
      prevStockRef.current = currentStock;

      setItems((prev) => {
        const toAdd: CartItem[] = [];
        for (const s of QUICK_STAPLES) {
          if (!currentStock[s.key] && !prev.some((c) => c.stapleKey === s.key)) {
            toAdd.push(buildAutoCartItem(s));
          }
        }
        return toAdd.length ? [...toAdd, ...prev] : prev;
      });
      return;
    }

    const prevStock = prevStockRef.current || {};
    const newlyOut: string[] = [];
    for (const s of QUICK_STAPLES) {
      if (prevStock[s.key] && !currentStock[s.key]) {
        newlyOut.push(s.key);
      }
    }
    prevStockRef.current = currentStock;

    if (newlyOut.length === 0) return;

    setItems((prev) => {
      const toAdd: CartItem[] = [];
      for (const key of newlyOut) {
        const s = stapleByKey.get(key);
        if (!s) continue;
        if (prev.some((c) => c.stapleKey === key)) continue;
        toAdd.push(buildAutoCartItem(s));
      }
      if (toAdd.length === 0) return prev;
      const summary =
        toAdd.length === 1
          ? `${toAdd[0].name} finished — added to cart`
          : `${toAdd.length} staples finished — added to cart`;
      toast.success(summary);
      pushNotification({
        kind: "replenishment",
        title: "Auto-restock triggered",
        body: `${toAdd.map((t) => t.name).join(", ")} added to your Smart Shopping Cart.`,
        href: "/cart",
      });
      return [...toAdd, ...prev];
    });
  }, [pantry, pushNotification]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    count: items.length,
    totalEstimated: Math.round(items.reduce((s, i) => s + i.estimatedPrice * (i.unit === "g" || i.unit === "ml" ? 1 : i.quantity), 0)),
    addItem,
    addStaple,
    updateQty,
    removeItem,
    clearPurchased,
  }), [items, addItem, addStaple, updateQty, removeItem, clearPurchased]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function buildAutoCartItem(s: typeof QUICK_STAPLES[number]): CartItem {
  return {
    id: `auto-${s.key}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: s.name,
    quantity: s.defaultQty,
    unit: s.unit,
    category: s.category,
    estimatedPrice: s.estimatedPrice * (s.unit === "g" || s.unit === "ml" ? s.defaultQty : 1),
    emoji: s.emoji,
    auto: true,
    addedAt: new Date().toISOString(),
    stapleKey: s.key,
  };
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
