import { db } from "@/db";
import { accounts, categories } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { parseTransaction } from "@/lib/ai/parseTransaction";
import { resolveAccountId, resolveCategoryId } from "@/lib/resolve";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const Body = z.object({ text: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const parsed = Body.safeParse(await readJson(req, 16 * 1024));
    if (!parsed.success) return bad("Provide some text to parse.");

    const accountRows = await db
      .select({ name: accounts.name })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.archived, false)));
    const catRows = await db
      .select({ name: categories.name, type: categories.type })
      .from(categories)
      .where(eq(categories.userId, userId));

    const draft = await parseTransaction(parsed.data.text, {
      accountNames: accountRows.map((a) => a.name),
      incomeCategories: catRows.filter((c) => c.type === "income").map((c) => c.name),
      expenseCategories: catRows.filter((c) => c.type === "expense").map((c) => c.name),
    });

    draft.accountId = await resolveAccountId(userId, draft.accountName);
    draft.categoryId = await resolveCategoryId(userId, draft.categoryName, draft.type);
    return ok(draft);
  });
}
