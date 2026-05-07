import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { MOCK_PANTRY } from "@/lib/mock-data";
import type { PantryItem } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";


interface PantryContextValue {
  items: PantryItem[];
  setItems: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  addItem: (item: PantryItem) => void;
  removeItem: (id: string) => void;
  consumeItem: (id: string) => void;
  updateItem: (id: string, patch: Partial<PantryItem>) => void;
}

const PantryContext = createContext<PantryContextValue | null>(null);
const STORAGE_KEY = "freshque_pantry";

function normaliseName(name: string) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function PantryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPantry = useCallback(async () => {
    try {
      const res = await api.listPantry();
      if (res && Array.isArray(res.items)) {
        setItems(res.items);
      }
    } catch (err) {
      console.error("Failed to fetch pantry:", err);
      // Fallback to local storage if API fails
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setItems(parsed);
        } catch { /* noop */ }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPantry();
  }, [refreshPantry]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);


  const addItem = useCallback(async (item: PantryItem) => {
    try {
      await api.createItem(item);
      await refreshPantry();
    } catch (err) {
      console.error("Failed to add item:", err);
      // Optimistic update fallback or just toast error
      toast.error("Could not save to server");
    }
  }, [refreshPantry]);

  const removeItem = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setItems((prev) => prev.filter((i) => i.id !== id));
      await api.deleteItem(id);
    } catch (err) {
      console.error("Failed to remove item:", err);
      toast.error("Failed to delete from server");
      refreshPantry(); // Revert to server state
    }
  }, [refreshPantry]);


  const consumeItem = useCallback(async (id: string) => {
    try {
      // Optimistic update
      setItems((prev) => prev.filter((i) => i.id !== id));
      await api.consumeItem(id);
    } catch (err) {
      console.error("Failed to consume item:", err);
      toast.error("Failed to update server");
      refreshPantry();
    }
  }, [refreshPantry]);


  const updateItem = useCallback(async (id: string, patch: Partial<PantryItem>) => {
    // Note: patch is not explicitly in API yet, but we can implement it or use createItem as update if backend supports it.
    // For now, let's just update local state if no API endpoint exists, or assume API exists.
    try {
      // Assuming api.updateItem exists or similar
      // await api.updateItem(id, patch);
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    } catch (err) {
      console.error("Failed to update item:", err);
    }
  }, []);


  const value = useMemo<PantryContextValue>(
    () => ({ items, setItems, addItem, removeItem, consumeItem, updateItem }),
    [items, addItem, removeItem, consumeItem, updateItem],
  );

  return <PantryContext.Provider value={value}>{children}</PantryContext.Provider>;
}

export function usePantry() {
  const ctx = useContext(PantryContext);
  if (!ctx) throw new Error("usePantry must be used within PantryProvider");
  return ctx;
}
