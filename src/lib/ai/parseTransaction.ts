import { chat, extractJson, getAIConfig } from "./client";
import { parseAmountFallback, todayIso } from "../utils";
import type { TransactionDraft } from "@/types";

interface Ctx {
  accountNames: string[];
  incomeCategories: string[];
  expenseCategories: string[];
  today?: string;
}

/**
 * Turn a natural-language line ("beli es kelapa 5000 pake bca") into a
 * structured TransactionDraft. Matches against the user's own accounts and
 * categories so the result maps cleanly onto their data.
 */
export async function parseTransaction(text: string, ctx: Ctx): Promise<TransactionDraft> {
  const today = ctx.today || todayIso();

  const system = [
    "You are a finance data-entry assistant for an Indonesian personal-finance app.",
    "Convert the user's short note into ONE transaction as strict JSON.",
    "",
    "Rules:",
    "- amount: integer in rupiah (whole number, no separators). Interpret Indonesian shorthand: 'rb'/'ribu'/'k' = x1.000, 'jt'/'juta' = x1.000.000. Example: '150rb' -> 150000, '8 juta' -> 8000000.",
    "- type: 'income' for money received (gaji/gajian/bonus/cashback/masuk/terima), otherwise 'expense'.",
    "- account: choose the closest match from ACCOUNTS. If none clearly matches, null.",
    "- category: choose the closest match from the category list for the chosen type. If unsure, use 'Other'.",
    "- merchant: short store/vendor name if present, else null.",
    "- description: the original note, cleaned up.",
    "- date: yyyy-mm-dd. Default to TODAY unless the note says otherwise.",
    "",
    `TODAY = ${today}`,
    `ACCOUNTS = ${JSON.stringify(ctx.accountNames)}`,
    `INCOME_CATEGORIES = ${JSON.stringify(ctx.incomeCategories)}`,
    `EXPENSE_CATEGORIES = ${JSON.stringify(ctx.expenseCategories)}`,
    "",
    'Respond ONLY with JSON: {"type","amount","account","category","merchant","description","date","confidence"}',
    "confidence is 0..1.",
  ].join("\n");

  let draft: TransactionDraft;
  try {
    const raw = await chat({
      json: true,
      messages: [
        { role: "system", content: system },
        { role: "user", content: text },
      ],
    });
    const j = extractJson<Record<string, unknown>>(raw);
    draft = {
      type: (j.type === "income" ? "income" : "expense") as TransactionDraft["type"],
      amount: Math.max(0, Math.round(Number(j.amount) || 0)),
      accountName: (j.account as string) || null,
      categoryName: (j.category as string) || null,
      merchant: (j.merchant as string) || null,
      description: (j.description as string) || text,
      transactionDate: (j.date as string) || today,
      confidence: typeof j.confidence === "number" ? j.confidence : 0.6,
    };
  } catch (err) {
    // Fallback: no AI / bad response → best-effort heuristic parse.
    const amount = parseAmountFallback(text) ?? 0;
    const isIncome = /gaji|gajian|bonus|cashback|masuk|terima|refund/i.test(text);
    draft = {
      type: isIncome ? "income" : "expense",
      amount,
      accountName: ctx.accountNames.find((a) => text.toLowerCase().includes(a.toLowerCase())) ?? null,
      categoryName: "Other",
      merchant: null,
      description: text,
      transactionDate: today,
      confidence: 0.2,
    };
  }

  return draft;
}

export { getAIConfig };
