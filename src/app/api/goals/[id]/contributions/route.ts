import { db } from "@/db";
import { savingsGoals, savingsContributions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { todayIso } from "@/lib/utils";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const AMOUNT_MAX = 1_000_000_000_000_000;
const Body = z.object({
  // Signed: positive deposits, negative withdraws.
  amount: z.number().int().min(-AMOUNT_MAX).max(AMOUNT_MAX).refine((n) => n !== 0, "Amount cannot be zero."),
  note: z.string().max(300).nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    const [goal] = await db
      .select()
      .from(savingsGoals)
      .where(and(eq(savingsGoals.id, id), eq(savingsGoals.userId, userId)));
    if (!goal) return bad("Goal not found.", 404);

    const parsed = Body.safeParse(await readJson(req));
    if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? "Invalid data.");
    const d = parsed.data;

    const [row] = await db
      .insert(savingsContributions)
      .values({
        userId,
        goalId: id,
        amount: d.amount,
        note: d.note ?? null,
        date: d.date || todayIso(),
      })
      .returning();
    return ok(row, 201);
  });
}
