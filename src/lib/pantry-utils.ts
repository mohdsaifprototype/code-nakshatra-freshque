import { differenceInDays, differenceInHours, parseISO } from "date-fns";
import type { ExpiryStatus, PantryItem } from "@/types";

export function expiryStatus(expiryISO: string): ExpiryStatus {
  const now = new Date();
  const exp = parseISO(expiryISO);
  const hours = differenceInHours(exp, now);
  if (hours < 0) return "expired";
  if (hours <= 48) return "critical";
  const days = differenceInDays(exp, now);
  if (days <= 7) return "soon";
  return "fresh";
}

export function daysUntil(expiryISO: string): number {
  return differenceInDays(parseISO(expiryISO), new Date());
}

export function hoursUntil(expiryISO: string): number {
  return differenceInHours(parseISO(expiryISO), new Date());
}

export function itemValue(item: PantryItem): number {
  return Math.round(item.quantity * item.pricePerUnit);
}

export function totalValue(items: PantryItem[]): number {
  return items.reduce((sum, i) => sum + itemValue(i), 0);
}

export function potentialLoss(items: PantryItem[]): number {
  return items
    .filter((i) => !i.consumed && !i.expired)
    .filter((i) => expiryStatus(i.expiryDate) === "critical")
    .reduce((sum, i) => sum + itemValue(i), 0);
}

export function formatINR(value: number, opts?: { compact?: boolean }): string {
  if (opts?.compact && value >= 1000) {
    return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value / 1000) + "k";
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export const expiryLabel: Record<ExpiryStatus, string> = {
  fresh: "Fresh",
  soon: "This week",
  critical: "≤ 48h",
  expired: "Expired",
};

export const expiryClasses: Record<ExpiryStatus, string> = {
  fresh: "bg-expiry-fresh/10 text-expiry-fresh border border-expiry-fresh/20",
  soon: "bg-expiry-soon/10 text-expiry-soon border border-expiry-soon/30",
  critical: "bg-expiry-critical/10 text-expiry-critical border border-expiry-critical/30",
  expired: "bg-expiry-expired/10 text-expiry-expired border border-expiry-expired/30",
};
