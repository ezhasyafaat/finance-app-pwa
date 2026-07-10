import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY || "IDR";
const LOCALE = process.env.NEXT_PUBLIC_LOCALE || "id-ID";

/** Format an integer amount (in smallest currency unit) as a currency string. */
export function formatMoney(amount: number, opts?: { sign?: boolean }): string {
  const value = new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
  if (opts?.sign && amount !== 0) return `${amount < 0 ? "−" : "+"}${value}`;
  return value;
}

export function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export const todayIso = () => new Date().toISOString().slice(0, 10);

/**
 * Fallback parser for Indonesian money shorthand — used only if the AI is
 * unavailable. Handles: "5000", "5rb", "5 ribu", "8jt", "8 juta", "1.5jt", "150k".
 * Returns the amount in whole rupiah, or null.
 */
export function parseAmountFallback(text: string): number | null {
  const t = text.toLowerCase().replace(/\s+/g, " ");
  const m = t.match(/(\d+(?:[.,]\d+)?)\s*(jt|juta|rb|ribu|k|m)?/);
  if (!m) return null;
  const num = parseFloat(m[1].replace(",", "."));
  const unit = m[2];
  let mult = 1;
  if (unit === "jt" || unit === "juta" || unit === "m") mult = 1_000_000;
  else if (unit === "rb" || unit === "ribu" || unit === "k") mult = 1_000;
  return Math.round(num * mult);
}
