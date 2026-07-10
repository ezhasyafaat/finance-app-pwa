import { db } from "@/db";
import { budgets, categories, transactions, periods } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { getOrCreatePeriodForDate } from "@/lib/resolve";
import { todayIso } from "@/lib/utils";
import { and, eq, asc, sql } from "drizzle-orm";
import { z } from "zod";

const Body = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().int().positive().max(1_000_000_000_000_000),
});

/** Active period id (flagged active, else the one covering today). */
async function activePeriodId(userId: string): Promise<string> {
  const [active] = await db
    .select({ id: periods.id })
    .from(periods)
    .where(and(eq(periods.userId, userId), eq(periods.isActive, true)));
  return active?.id ?? (await getOrCreatePeriodForDate(userId, todayIso()));
}

export async function GET() {
  return handle(async () => {
    const userId = await requireUserId();
    const periodId = await activePeriodId(userId);

    const rows = await db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        amount: budgets.amount,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        spent: sql<number>`COALESCE((
          SELECT SUM(${transactions.amount}) FROM ${transactions}
          WHERE ${transactions.categoryId} = ${budgets.categoryId}
            AND ${transactions.periodId} = ${periodId}
            AND ${transactions.type} = 'expense'
        ), 0)`,
      })
      .from(budgets)
      .leftJoin(categories, eq(budgets.categoryId, categories.id))
      .where(eq(budgets.userId, userId))
      .orderBy(asc(categories.name));

    return ok(rows.map((r) => ({ ...r, spent: Number(r.spent) })));
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const parsed = Body.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid budget data.");
    const d = parsed.data;

    // Category must belong to the user (and exist).
    const [cat] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(and(eq(categories.id, d.categoryId), eq(categories.userId, userId)));
    if (!cat) return bad("Category not found.", 404);

    // One budget per category: update if it already exists.
    const [existing] = await db
      .select()
      .from(budgets)
      .where(and(eq(budgets.userId, userId), eq(budgets.categoryId, d.categoryId)));
    if (existing) {
      await db.update(budgets).set({ amount: d.amount }).where(eq(budgets.id, existing.id));
      return ok({ id: existing.id }, 200);
    }

    const [row] = await db
      .insert(budgets)
      .values({ userId, categoryId: d.categoryId, amount: d.amount })
      .returning();
    return ok(row, 201);
  });
}
