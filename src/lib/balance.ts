import { sql, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { accounts, transactions } from "@/db/schema";

/**
 * Balance model
 * ─────────────
 * current_balance = initial_balance
 *                 + Σ income
 *                 − Σ expense
 *                 + Σ adjustment   (adjustment.amount is signed: may be negative)
 *
 * income/expense amounts are stored positive; the transaction `type` decides
 * the sign. Adjustments store a signed delta so history stays consistent when
 * the app balance is reconciled against the real account balance.
 */

/** Net signed effect of a single transaction on its (source) account balance. */
export function signedEffect(type: string, amount: number): number {
  switch (type) {
    case "income":
      return amount;
    case "expense":
      return -amount;
    case "adjustment":
      return amount; // already signed
    case "transfer":
      return -amount; // leaves the source account (destination handled separately)
    default:
      return 0;
  }
}

/** Recompute + persist current_balance for one account. */
export async function recalcAccountBalance(accountId: string): Promise<number> {
  const [acc] = await db.select().from(accounts).where(eq(accounts.id, accountId));
  if (!acc) return 0;

  // Effect of transactions whose SOURCE account is this one (transfer = outgoing).
  const [row] = await db
    .select({
      delta: sql<number>`
        COALESCE(SUM(
          (CASE ${transactions.type}
            WHEN 'income' THEN ${transactions.amount}
            WHEN 'expense' THEN -${transactions.amount}
            WHEN 'adjustment' THEN ${transactions.amount}
            WHEN 'transfer' THEN -${transactions.amount}
            ELSE 0
          END) - COALESCE(${transactions.adminFee}, 0)
        ), 0)`.as("delta"),
    })
    .from(transactions)
    .where(eq(transactions.accountId, accountId));

  // Incoming transfers: rows where this account is the destination.
  const [inc] = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`.as("total"),
    })
    .from(transactions)
    .where(and(eq(transactions.transferAccountId, accountId), eq(transactions.type, "transfer")));

  const current = acc.initialBalance + Number(row?.delta ?? 0) + Number(inc?.total ?? 0);
  await db.update(accounts).set({ currentBalance: current }).where(eq(accounts.id, accountId));
  return current;
}

/** Recompute current_balance for every account belonging to a user. */
export async function recalcUserBalances(userId: string): Promise<void> {
  const userAccounts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  await Promise.all(userAccounts.map((a) => recalcAccountBalance(a.id)));
}

/** Total money across all (non-archived) accounts. */
export async function totalMoney(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${accounts.currentBalance}), 0)` })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.archived, false)));
  return Number(row?.total ?? 0);
}
