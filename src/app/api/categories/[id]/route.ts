import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

const Patch = z.object({
  name: z.string().min(1).max(80).optional(),
  type: z.enum(["income", "expense"]).optional(),
  icon: z.string().max(40).nullable().optional(),
  color: z.string().max(20).nullable().optional(),
});

async function owned(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, id), eq(categories.userId, userId)));
  return row;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    if (!(await owned(userId, id))) return bad("Category not found.", 404);

    const parsed = Patch.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid data.");
    if (Object.keys(parsed.data).length) {
      await db.update(categories).set(parsed.data).where(eq(categories.id, id));
    }
    return ok({ id });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    if (!(await owned(userId, id))) return bad("Category not found.", 404);
    // Transactions keep their history: categoryId is set null on delete (FK rule).
    await db.delete(categories).where(eq(categories.id, id));
    return ok({ ok: true });
  });
}
