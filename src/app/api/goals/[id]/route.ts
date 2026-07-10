import { db } from "@/db";
import { savingsGoals, savingsContributions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { and, eq, desc, sql } from "drizzle-orm";
import { z } from "zod";

const Patch = z.object({
  name: z.string().min(1).max(120).optional(),
  targetAmount: z.number().int().positive().max(1_000_000_000_000_000).optional(),
  color: z.string().max(20).nullable().optional(),
  icon: z.string().max(40).nullable().optional(),
  targetDate: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]).nullable().optional(),
  archived: z.boolean().optional(),
});

async function owned(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(savingsGoals)
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)));
  return row;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    const goal = await owned(userId, id);
    if (!goal) return bad("Goal not found.", 404);

    const [{ saved }] = await db
      .select({ saved: sql<number>`COALESCE(SUM(${savingsContributions.amount}), 0)` })
      .from(savingsContributions)
      .where(eq(savingsContributions.goalId, id));

    const contributions = await db
      .select()
      .from(savingsContributions)
      .where(eq(savingsContributions.goalId, id))
      .orderBy(desc(savingsContributions.date), desc(savingsContributions.createdAt));

    return ok({ ...goal, saved: Number(saved), contributions });
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    if (!(await owned(userId, id))) return bad("Goal not found.", 404);

    const parsed = Patch.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid data.");
    const d = { ...parsed.data };
    if (d.targetDate === "") d.targetDate = null;
    if (Object.keys(d).length) {
      await db.update(savingsGoals).set(d).where(eq(savingsGoals.id, id));
    }
    return ok({ id });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    if (!(await owned(userId, id))) return bad("Goal not found.", 404);
    await db.delete(savingsGoals).where(eq(savingsGoals.id, id)); // cascades contributions
    return ok({ ok: true });
  });
}
