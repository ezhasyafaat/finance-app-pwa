import { db } from "@/db";
import { accounts } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { and, eq, asc, desc } from "drizzle-orm";
import { z } from "zod";

const AMOUNT_MAX = 1_000_000_000_000_000;
const Body = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["bank", "ewallet", "cash", "credit_card"]).default("bank"),
  icon: z.string().max(40).optional(),
  color: z.string().max(20).optional(),
  initialBalance: z.number().int().min(-AMOUNT_MAX).max(AMOUNT_MAX).default(0),
});

export async function GET() {
  return handle(async () => {
    const userId = await requireUserId();
    const rows = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.archived, false)))
      .orderBy(desc(accounts.isPrimary), asc(accounts.createdAt));
    return ok(rows);
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const parsed = Body.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid account data.");
    const d = parsed.data;

    // First account for a user becomes the primary by default.
    const existing = await db
      .select({ id: accounts.id })
      .from(accounts)
      .where(and(eq(accounts.userId, userId), eq(accounts.archived, false)));

    const [row] = await db
      .insert(accounts)
      .values({
        userId,
        name: d.name,
        type: d.type,
        icon: d.icon,
        color: d.color,
        initialBalance: d.initialBalance,
        currentBalance: d.initialBalance,
        isPrimary: existing.length === 0,
      })
      .returning();
    return ok(row, 201);
  });
}
