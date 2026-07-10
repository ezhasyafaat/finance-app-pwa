import { db } from "@/db";
import { periods } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const Patch = z.object({
  name: z.string().max(60).optional(),
  startDate: isoDate.optional(),
  endDate: isoDate.optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    const [row] = await db.select().from(periods).where(and(eq(periods.id, id), eq(periods.userId, userId)));
    if (!row) return bad("Period not found.", 404);

    const parsed = Patch.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid data.");
    const d = parsed.data;

    // Only one active period at a time.
    if (d.isActive) {
      await db.update(periods).set({ isActive: false }).where(eq(periods.userId, userId));
    }
    await db.update(periods).set(d).where(eq(periods.id, id));
    return ok({ id });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    await db.delete(periods).where(and(eq(periods.id, id), eq(periods.userId, userId)));
    return ok({ ok: true });
  });
}
