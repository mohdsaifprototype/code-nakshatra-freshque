import { useEffect, useRef } from "react";
import { usePantry } from "@/contexts/PantryContext";
import { useNotifications } from "@/contexts/NotificationsContext";
import { hoursUntil, itemValue, formatINR } from "@/lib/pantry-utils";

const SPOILAGE_KEY = "freshque_notif_spoilage_seen";
const FINANCIAL_THRESHOLD = 200; // ₹ — alert when at-risk value exceeds this

/**
 * Background bridge that watches client state and emits notifications for
 * the documented system triggers:
 *  1. Daily Spoilage & Expiry Alerts  (items entering 48h window)
 *  2. Financial Risk (Loss Ticker)    (₹ value at risk crosses threshold)
 *
 * Other triggers (intake confirmation, replenishment, security) are emitted
 * directly from the relevant flows (Scan page, CartContext, AuthContext).
 *
 * Mirrors the server-side Node-cron job (`server/src/cron/jobs.js`) so the UI
 * works even before the backend is wired up.
 */
export function NotificationsBridge() {
  const { items } = usePantry();
  const { push } = useNotifications();
  const lastFinancialAlertRef = useRef<number>(0);

  // 1. Spoilage scan — fire once per item per day for items in the 48h window.
  useEffect(() => {
    const seen: Record<string, string> = (() => {
      try {
        return JSON.parse(localStorage.getItem(SPOILAGE_KEY) || "{}");
      } catch {
        return {};
      }
    })();
    const today = new Date().toISOString().slice(0, 10);

    const expiringSoon = items
      .filter((i) => !i.consumed && !i.expired)
      .map((i) => ({ item: i, hours: hoursUntil(i.expiryDate) }))
      .filter(({ hours }) => hours >= 0 && hours <= 48);

    const fresh = expiringSoon.filter(({ item }) => seen[item.id] !== today);
    if (fresh.length > 0) {
      const names = fresh.map((f) => f.item.name).slice(0, 3).join(", ");
      const more = fresh.length > 3 ? ` +${fresh.length - 3} more` : "";
      push({
        kind: "spoilage",
        title: `${fresh.length} item${fresh.length === 1 ? "" : "s"} expiring within 48h`,
        body: `${names}${more}. Check Recipe Lab for ideas to use them up.`,
        href: "/recipes",
      });
      for (const f of fresh) seen[f.item.id] = today;
      localStorage.setItem(SPOILAGE_KEY, JSON.stringify(seen));
    }
  }, [items, push]);

  // 2. Financial risk — emit when at-risk value crosses the threshold.
  useEffect(() => {
    const atRisk = items
      .filter((i) => !i.consumed && !i.expired)
      .filter((i) => {
        const h = hoursUntil(i.expiryDate);
        return h >= 0 && h <= 48;
      })
      .reduce((sum, i) => sum + itemValue(i), 0);

    if (atRisk >= FINANCIAL_THRESHOLD && atRisk !== lastFinancialAlertRef.current) {
      lastFinancialAlertRef.current = atRisk;
      push({
        kind: "financial",
        title: `${formatINR(atRisk)} of inventory at risk`,
        body: "Consume or cook these items before they spoil to avoid the loss.",
        href: "/dashboard",
      });
    } else if (atRisk < FINANCIAL_THRESHOLD) {
      lastFinancialAlertRef.current = 0;
    }
  }, [items, push]);

  return null;
}
