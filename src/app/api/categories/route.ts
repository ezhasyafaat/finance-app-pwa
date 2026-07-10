import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { and, eq, asc } from "drizzle-orm";
import { z } from "zod";

const Body = z.object({
  name: z.string().min(1).max(80),
  type: z.enum(["income", "expense"]),
  icon: z.string().max(40).optional(),
  color: z.string().max(20).optional(),
});

export async function GET(req: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const type = new URL(req.url).searchParams.get("type");
    const where =
      type === "income" || type === "expense"
        ? and(eq(categories.userId, userId), eq(categories.type, type))
        : eq(categories.userId, userId);
    const rows = await db.select().from(categories).where(where).orderBy(asc(categories.name));
    return ok(rows);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const parsed = Body.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid category data.");
    const d = parsed.data;
    const [row] = await db
      .insert(categories)
      .values({ userId, name: d.name, type: d.type, icon: d.icon, color: d.color })
      .returning();
    return ok(row, 201);
  });
}
