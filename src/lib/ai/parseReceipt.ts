import { chat, extractJson, getAIConfig } from "./client";
import { todayIso } from "../utils";
import type { ReceiptDraft } from "@/types";

interface Ctx {
  accountNames: string[];
  expenseCategories: string[];
  today?: string;
}

/**
 * Receipt Scanner: send a photo (data URL / base64) to the vision model and
 * extract merchant, date, items, total, and a best-guess category.
 * Returns an expense TransactionDraft ready for review.
 */
export async function parseReceipt(imageDataUrl: string, ctx: Ctx): Promise<ReceiptDraft> {
  const today = ctx.today || todayIso();
  const cfg = getAIConfig();

  const system = [
    "You extract structured data from a photo of a store receipt (often Indonesian).",
    "Return strict JSON only.",
    "- total: the grand total in integer rupiah (no separators).",
    "- date: yyyy-mm-dd from the receipt; if unreadable use TODAY.",
    "- merchant: the store name.",
    "- items: array of {name, qty, price} (price in rupiah). Omit if unreadable.",
    "- category: closest match from EXPENSE_CATEGORIES for what was bought; else 'Other'.",
    "- account: null (the user picks the payment account).",
    `TODAY = ${today}`,
    `EXPENSE_CATEGORIES = ${JSON.stringify(ctx.expenseCategories)}`,
    'JSON shape: {"merchant","date","total","category","items":[{"name","qty","price"}],"confidence"}',
  ].join("\n");

  const raw = await chat({
    model: cfg.visionModel,
    messages: [
      { role: "system", content: system },
      {
        role: "user",
        content: [
          { type: "text", text: "Extract this receipt." },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  });

  const j = extractJson<Record<string, unknown>>(raw);
  return {
    type: "expense",
    amount: Math.max(0, Math.round(Number(j.total) || 0)),
    accountName: null,
    categoryName: (j.category as string) || "Other",
    merchant: (j.merchant as string) || null,
    description: (j.merchant as string) || "Receipt",
    transactionDate: (j.date as string) || today,
    items: Array.isArray(j.items) ? (j.items as ReceiptDraft["items"]) : undefined,
    confidence: typeof j.confidence === "number" ? j.confidence : 0.5,
  };
}
