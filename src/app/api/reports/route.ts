import { db } from "@/db";
import { transactions, categories, periods } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, handle } from "@/lib/http";
import { getOrCreatePeriodForDate } from "@/lib/resolve";
import { todayIso } from "@/lib/utils";
import { and, eq, sql, desc } from "drizzle-orm";

interface Slice {
  categoryId: string | null;
  name: string;
  color: string | null;
  icon: string | null;
  amount: number;
  pct: number;
}

async function breakdown(userId: string, periodId: string, type: "expense" | "income") {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      name: sql<string>`COALESCE(${categories.name}, 'Tanpa kategori')`,
      color: categories.color,
      icon: categories.icon,
      amount: sql<number>`SUM(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.periodId, periodId),
        eq(transactions.type, type),
      ),
    )
    .groupBy(transactions.categoryId, categories.name, categories.color, categories.icon)
    .orderBy(desc(sql`SUM(${transactions.amount})`));

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const slices: Slice[] = rows.map((r) => ({
    categoryId: r.categoryId,
    name: r.name,
    color: r.color,
    icon: r.icon,
    amount: Number(r.amount),
    pct: total ? Math.round((Number(r.amount) / total) * 100) : 0,
  }));
  return { total, slices };
}

export async function GET(req: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const wanted = new URL(req.url).searchParams.get("periodId");

    let [period] = wanted
      ? await db.select().from(periods).where(and(eq(periods.id, wanted), eq(periods.userId, userId)))
      : await db.select().from(periods).where(and(eq(periods.userId, userId), eq(periods.isActive, true)));
    if (!period) {
      const pid = await getOrCreatePeriodForDate(userId, todayIso());
      [period] = await db.select().from(periods).where(eq(periods.id, pid));
    }

    const [expense, income] = await Promise.all([
      breakdown(userId, period.id, "expense"),
      breakdown(userId, period.id, "income"),
    ]);

    return ok({
      period: { id: period.id, name: period.name, startDate: period.startDate, endDate: period.endDate },
      expense,
      income,
    });
  });
}
