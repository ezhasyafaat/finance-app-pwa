import { db } from "@/db";
import { accounts, transactions, categories, periods } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, handle } from "@/lib/http";
import { totalMoney } from "@/lib/balance";
import { getOrCreatePeriodForDate } from "@/lib/resolve";
import { todayIso } from "@/lib/utils";
import { and, eq, desc, sql } from "drizzle-orm";
import type { DashboardData } from "@/types";

export async function GET() {
  return handle(async () => {
    const userId = await requireUserId();

    // Active period = flagged active, else the one covering today (created if needed).
    let [active] = await db
      .select()
      .from(periods)
      .where(and(eq(periods.userId, userId), eq(periods.isActive, true)));
    if (!active) {
      const pid = await getOrCreatePeriodForDate(userId, todayIso());
      [active] = await db.select().from(periods).where(eq(periods.id, pid));
    }

    const accountRows = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.archived, false)))
      .orderBy(desc(accounts.isPrimary), desc(accounts.currentBalance));

    // Income / expense totals for the active period.
    const [sums] = active
      ? await db
          .select({
            expense: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'expense' THEN ${transactions.amount} ELSE 0 END), 0)`,
            income: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'income' THEN ${transactions.amount} ELSE 0 END), 0)`,
          })
          .from(transactions)
          .where(and(eq(transactions.userId, userId), eq(transactions.periodId, active.id)))
      : [{ expense: 0, income: 0 }];

    const recent = await db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        merchant: transactions.merchant,
        description: transactions.description,
        transactionDate: transactions.transactionDate,
        accountName: accounts.name,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
      })
      .from(transactions)
      .leftJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.transactionDate), desc(transactions.createdAt))
      .limit(10);

    const data: DashboardData = {
      totalMoney: await totalMoney(userId),
      expenseThisPeriod: Number(sums?.expense ?? 0),
      incomeThisPeriod: Number(sums?.income ?? 0),
      period: active
        ? { id: active.id, name: active.name, startDate: active.startDate, endDate: active.endDate }
        : null,
      accounts: accountRows.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        icon: a.icon,
        color: a.color,
        currentBalance: a.currentBalance,
        isPrimary: a.isPrimary,
      })),
      recent: recent.map((r) => ({ ...r })),
    };
    return ok(data);
  });
}
