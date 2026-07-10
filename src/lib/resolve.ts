import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, periods } from "@/db/schema";
import { buildPeriodForDate, dateInPeriod } from "./period";

/** Case-insensitive best match of a name against a list of {id,name}. */
function fuzzyMatch<T extends { name: string }>(name: string | null, list: T[]): T | null {
  if (!name) return null;
  const n = name.trim().toLowerCase();
  return (
    list.find((x) => x.name.toLowerCase() === n) ||
    list.find((x) => x.name.toLowerCase().includes(n) || n.includes(x.name.toLowerCase())) ||
    null
  );
}

export async function resolveAccountId(userId: string, name: string | null): Promise<string | null> {
  const rows = await db.select().from(accounts).where(eq(accounts.userId, userId));
  return fuzzyMatch(name, rows)?.id ?? null;
}

export async function resolveCategoryId(
  userId: string,
  name: string | null,
  type: "income" | "expense",
): Promise<string | null> {
  const rows = await db
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.type, type)));
  const match = fuzzyMatch(name, rows) || rows.find((r) => r.name.toLowerCase() === "other");
  return match?.id ?? null;
}

/**
 * Find the period that contains `date`. If none exists, create one based on the
 * user's configured payday start-day (default 25). Marks it active if it covers
 * today.
 */
export async function getOrCreatePeriodForDate(
  userId: string,
  date: string,
  startDay = 25,
): Promise<string> {
  const existing = await db.select().from(periods).where(eq(periods.userId, userId));
  const found = existing.find((p) => dateInPeriod(date, p.startDate, p.endDate));
  if (found) return found.id;

  const draft = buildPeriodForDate(new Date(date), startDay);
  const coversToday = dateInPeriod(new Date().toISOString().slice(0, 10), draft.startDate, draft.endDate);
  const [created] = await db
    .insert(periods)
    .values({ userId, name: draft.name, startDate: draft.startDate, endDate: draft.endDate, isActive: coversToday })
    .returning();
  return created.id;
}
