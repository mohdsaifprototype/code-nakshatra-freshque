import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { PantryItem } from "@/types";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";


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

export function PantryProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

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
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    } catch (err) {
      console.error("Failed to add item:", err);
      toast.error("Could not save to server");
    }
  }, [refreshPantry, queryClient]);

  const removeItem = useCallback(async (id: string) => {
    try {
      setItems((prev) => prev.filter((i) => i.id !== id));
      await api.deleteItem(id);
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    } catch (err) {
      console.error("Failed to remove item:", err);
      toast.error("Failed to delete from server");
      refreshPantry();
    }
  }, [refreshPantry, queryClient]);


  const consumeItem = useCallback(async (id: string) => {
    try {
      setItems((prev) => prev.filter((i) => i.id !== id));
      await api.consumeItem(id);
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    } catch (err) {
      console.error("Failed to consume item:", err);
      toast.error("Failed to update server");
      refreshPantry();
    }
  }, [refreshPantry, queryClient]);


  const updateItem = useCallback(async (id: string, patch: Partial<PantryItem>) => {
    try {
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
      // Note: backend update not implemented in this context snippet, but would invalidate here too.
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
