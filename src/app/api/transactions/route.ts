import { db } from "@/db";
import { transactions, accounts, categories } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { recalcAccountBalance } from "@/lib/balance";
import { getOrCreatePeriodForDate } from "@/lib/resolve";
import { todayIso } from "@/lib/utils";
import { and, or, eq, desc, ilike } from "drizzle-orm";
import { z } from "zod";

const AMOUNT_MAX = 1_000_000_000_000_000; // 1e15
const Body = z.object({
  type: z.enum(["income", "expense", "adjustment"]),
  accountId: z.string().uuid(),
  amount: z.number().int().min(-AMOUNT_MAX).max(AMOUNT_MAX),
  categoryId: z.string().uuid().nullable().optional(),
  merchant: z.string().max(160).nullable().optional(),
  description: z.string().max(1000).nullable().optional(),
  transactionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(req: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const periodId = url.searchParams.get("periodId");
    const accountId = url.searchParams.get("accountId");
    const type = url.searchParams.get("type");
    const search = url.searchParams.get("search")?.trim();
    const limit = Math.min(Number(url.searchParams.get("limit") ?? 100), 500);
    const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

    const filters = [eq(transactions.userId, userId)];
    if (periodId) filters.push(eq(transactions.periodId, periodId));
    if (accountId) filters.push(eq(transactions.accountId, accountId));
    if (type === "income" || type === "expense" || type === "adjustment") {
      filters.push(eq(transactions.type, type));
    }

    // Free-text search over the note (merchant/description) or an exact amount.
    if (search) {
      const like = `%${search}%`;
      const conds = [ilike(transactions.description, like), ilike(transactions.merchant, like)];
      const digits = search.replace(/[^\d]/g, "");
      if (digits) conds.push(eq(transactions.amount, Number(digits)));
      filters.push(or(...conds)!);
    }

    const rows = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        merchant: transactions.merchant,
        description: transactions.description,
        transactionDate: transactions.transactionDate,
        accountId: transactions.accountId,
        accountName: accounts.name,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...filters))
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
      .limit(limit)
      .offset(offset);

    return ok(rows);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const parsed = Body.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid transaction data.");
    const d = parsed.data;

    // Verify account ownership.
    const [acc] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, d.accountId), eq(accounts.userId, userId)));
    if (!acc) return bad("Account not found.", 404);

    // Verify category ownership if one was supplied.
    if (d.categoryId) {
      const [cat] = await db
        .select({ id: categories.id })
        .from(categories)
        .where(and(eq(categories.id, d.categoryId), eq(categories.userId, userId)));
      if (!cat) return bad("Category not found.", 404);
    }

    const date = d.transactionDate || todayIso();
    const periodId = await getOrCreatePeriodForDate(userId, date);

    // income/expense stored positive; adjustment keeps its sign.
    const amount = d.type === "adjustment" ? d.amount : Math.abs(d.amount);

    const [row] = await db
      .insert(transactions)
      .values({
        userId,
        type: d.type,
        accountId: d.accountId,
        amount,
        categoryId: d.categoryId ?? null,
        merchant: d.merchant ?? null,
        description: d.description ?? null,
        transactionDate: date,
        periodId,
      })
      .returning();

    const currentBalance = await recalcAccountBalance(d.accountId);
    return ok({ transaction: row, accountBalance: currentBalance }, 201);
  });
}
