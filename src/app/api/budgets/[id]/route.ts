import { db } from "@/db";
import { budgets } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const Patch = z.object({ amount: z.number().int().positive().max(1_000_000_000_000_000) });

async function owned(userId: string, id: string) {
  const [row] = await db.select().from(budgets).where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
  return row;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    if (!(await owned(userId, id))) return bad("Budget not found.", 404);
    const parsed = Patch.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid data.");
    await db.update(budgets).set({ amount: parsed.data.amount }).where(eq(budgets.id, id));
    return ok({ id });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    if (!(await owned(userId, id))) return bad("Budget not found.", 404);
    await db.delete(budgets).where(eq(budgets.id, id));
    return ok({ ok: true });
  });
}
