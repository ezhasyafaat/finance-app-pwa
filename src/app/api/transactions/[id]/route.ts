import { db } from "@/db";
import { transactions, accounts, categories } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { recalcAccountBalance } from "@/lib/balance";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const AMOUNT_MAX = 1_000_000_000_000_000; // 1e15, well within bigint
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.");

const Patch = z.object({
  amount: z.number().int().min(1).max(AMOUNT_MAX).optional(),
  categoryId: z.string().uuid().nullable().optional(),
  accountId: z.string().uuid().optional(),
  merchant: z.string().max(160).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  transactionDate: isoDate.optional(),
});

async function owned(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
  return row;
}

/** True if the account belongs to the user. */
async function ownsAccount(userId: string, accountId: string) {
  const [a] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));
  return Boolean(a);
}

/** True if the category belongs to the user. */
async function ownsCategory(userId: string, categoryId: string) {
  const [c] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.userId, userId)));
  return Boolean(c);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    const tx = await owned(userId, id);
    if (!tx) return bad("Transaction not found.", 404);

    const parsed = Patch.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid data.");
    const d = parsed.data;

    // Never let a transaction be reassigned to another user's account/category.
    if (d.accountId && !(await ownsAccount(userId, d.accountId))) return bad("Account not found.", 404);
    if (d.categoryId && !(await ownsCategory(userId, d.categoryId))) return bad("Category not found.", 404);

    // Adjustments store a signed amount; income/expense stay positive.
    const patch = { ...d };
    if (patch.amount !== undefined && tx.type !== "adjustment") patch.amount = Math.abs(patch.amount);

    await db.update(transactions).set(patch).where(eq(transactions.id, id));

    await recalcAccountBalance(tx.accountId);
    if (d.accountId && d.accountId !== tx.accountId) await recalcAccountBalance(d.accountId);
    return ok({ id });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    const tx = await owned(userId, id);
    if (!tx) return bad("Transaction not found.", 404);
    await db.delete(transactions).where(eq(transactions.id, id));
    await recalcAccountBalance(tx.accountId);
    return ok({ ok: true });
  });
}
