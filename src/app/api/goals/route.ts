import { db } from "@/db";
import { savingsGoals, savingsContributions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { and, eq, asc, sql } from "drizzle-orm";
import { z } from "zod";

const Body = z.object({
  name: z.string().min(1).max(120),
  targetAmount: z.number().int().positive().max(1_000_000_000_000_000),
  color: z.string().max(20).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export async function GET() {
  return handle(async () => {
    const userId = await requireUserId();
    // saved = SUM(signed contributions) per goal, joined in one grouped query.
    const rows = await db
      .select({
        id: savingsGoals.id,
        name: savingsGoals.name,
        targetAmount: savingsGoals.targetAmount,
        color: savingsGoals.color,
        icon: savingsGoals.icon,
        targetDate: savingsGoals.targetDate,
        createdAt: savingsGoals.createdAt,
        saved: sql<number>`COALESCE(SUM(${savingsContributions.amount}), 0)`,
      })
      .from(savingsGoals)
      .leftJoin(savingsContributions, eq(savingsContributions.goalId, savingsGoals.id))
      .where(and(eq(savingsGoals.userId, userId), eq(savingsGoals.archived, false)))
      .groupBy(savingsGoals.id)
      .orderBy(asc(savingsGoals.createdAt));

    return ok(rows.map((r) => ({ ...r, saved: Number(r.saved) })));
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const parsed = Body.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid goal data.");
    const d = parsed.data;
    const [row] = await db
      .insert(savingsGoals)
      .values({
        userId,
        name: d.name,
        targetAmount: d.targetAmount,
        color: d.color,
        icon: d.icon,
        targetDate: d.targetDate || null,
      })
      .returning();
    return ok(row, 201);
  });
}
