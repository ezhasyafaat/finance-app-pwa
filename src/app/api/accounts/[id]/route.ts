import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { requireUserId } from "@/lib/auth";
import { ok, bad, handle, readJson } from "@/lib/http";
import { recalcAccountBalance } from "@/lib/balance";
import { getOrCreatePeriodForDate } from "@/lib/resolve";
import { todayIso } from "@/lib/utils";
import { and, eq, asc } from "drizzle-orm";
import { z } from "zod";

const AMOUNT_MAX = 1_000_000_000_000_000;
const Patch = z.object({
  name: z.string().min(1).max(120).optional(),
  type: z.enum(["bank", "ewallet", "cash", "credit_card"]).optional(),
  icon: z.string().max(40).optional(),
  color: z.string().max(20).optional(),
  initialBalance: z.number().int().min(-AMOUNT_MAX).max(AMOUNT_MAX).optional(),
  // Pin this account to the front of balance lists (only one per user).
  isPrimary: z.boolean().optional(),
  // Balance Adjustment: set the account to a real-world balance. Creates a
  // signed 'adjustment' transaction so history stays consistent.
  adjustTo: z.number().int().min(-AMOUNT_MAX).max(AMOUNT_MAX).optional(),
});

async function owned(userId: string, id: string) {
  const [row] = await db.select().from(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
  return row;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    const acc = await owned(userId, id);
    if (!acc) return bad("Account not found.", 404);
    return ok(acc);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    const acc = await owned(userId, id);
    if (!acc) return bad("Account not found.", 404);

    const parsed = Patch.safeParse(await readJson(req));
    if (!parsed.success) return bad("Invalid data.");
    const d = parsed.data;

    if (typeof d.adjustTo === "number") {
      const delta = d.adjustTo - acc.currentBalance;
      if (delta !== 0) {
        const date = todayIso();
        const periodId = await getOrCreatePeriodForDate(userId, date);
        await db.insert(transactions).values({
          userId,
          type: "adjustment",
          accountId: id,
          amount: delta, // signed
          merchant: null,
          description: "Balance adjustment",
          transactionDate: date,
          periodId,
        });
      }
    }

    // Setting this account primary clears the flag on the user's other accounts.
    if (d.isPrimary === true) {
      await db.update(accounts).set({ isPrimary: false }).where(eq(accounts.userId, userId));
    }

    const fields: Record<string, unknown> = {};
    for (const k of ["name", "type", "icon", "color", "initialBalance", "isPrimary"] as const) {
      if (d[k] !== undefined) fields[k] = d[k];
    }
    if (Object.keys(fields).length) {
      await db.update(accounts).set(fields).where(eq(accounts.id, id));
    }

    const currentBalance = await recalcAccountBalance(id);
    return ok({ id, currentBalance });
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await params;
    const acc = await owned(userId, id);
    if (!acc) return bad("Account not found.", 404);
    // Soft-delete to preserve transaction history.
    await db.update(accounts).set({ archived: true, isPrimary: false }).where(eq(accounts.id, id));

    // If the deleted account was primary, promote the oldest remaining one.
    if (acc.isPrimary) {
      const [next] = await db
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.userId, userId), eq(accounts.archived, false)))
        .orderBy(asc(accounts.createdAt))
        .limit(1);
      if (next) await db.update(accounts).set({ isPrimary: true }).where(eq(accounts.id, next.id));
    }
    return ok({ ok: true });
  });
}
