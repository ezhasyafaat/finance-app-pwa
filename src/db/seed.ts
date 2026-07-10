import { db } from "./index";
import { users, accounts, categories, periods, transactions } from "./schema";
import { DEFAULT_INCOME_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES } from "../lib/defaults";
import { hashPassword } from "../lib/auth";
import { buildPeriodForDate } from "../lib/period";
import { recalcUserBalances } from "../lib/balance";
import { eq } from "drizzle-orm";

/**
 * Seeds a demo user so you can log in immediately.
 *   email:    demo@finance.app
 *   password: password123
 * Safe to re-run: it wipes and recreates the demo user's data.
 */
async function seed() {
  const email = "demo@finance.app";

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    await db.delete(users).where(eq(users.id, existing.id)); // cascades
  }

  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: await hashPassword("password123"), name: "Demo" })
    .returning();

  // Categories
  const incomeCats = await db
    .insert(categories)
    .values(
      DEFAULT_INCOME_CATEGORIES.map((c) => ({
        userId: user.id,
        name: c.name,
        type: "income" as const,
        icon: c.icon,
        color: c.color,
        isDefault: true,
      })),
    )
    .returning();
  const expenseCats = await db
    .insert(categories)
    .values(
      DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
        userId: user.id,
        name: c.name,
        type: "expense" as const,
        icon: c.icon,
        color: c.color,
        isDefault: true,
      })),
    )
    .returning();

  // Accounts
  const [bca, jago, gopay, cash] = await db
    .insert(accounts)
    .values([
      { userId: user.id, name: "BCA", type: "bank", icon: "landmark", color: "#1e40af", initialBalance: 4_500_000, currentBalance: 4_500_000, isPrimary: true },
      { userId: user.id, name: "Jago", type: "bank", icon: "landmark", color: "#f59e0b", initialBalance: 2_000_000, currentBalance: 2_000_000 },
      { userId: user.id, name: "GoPay", type: "ewallet", icon: "smartphone", color: "#00aa13", initialBalance: 150_000, currentBalance: 150_000 },
      { userId: user.id, name: "Cash", type: "cash", icon: "banknote", color: "#16a34a", initialBalance: 300_000, currentBalance: 300_000 },
    ])
    .returning();

  // Active period around today (payday-style, starting on the 25th)
  const today = new Date();
  const p = buildPeriodForDate(today, 25);
  const [period] = await db
    .insert(periods)
    .values({ userId: user.id, name: p.name, startDate: p.startDate, endDate: p.endDate, isActive: true })
    .returning();

  const food = expenseCats.find((c) => c.name === "Food")!;
  const transport = expenseCats.find((c) => c.name === "Transport")!;
  const bills = expenseCats.find((c) => c.name === "Bills")!;
  const salary = incomeCats.find((c) => c.name === "Salary")!;

  const iso = (d: Date) => d.toISOString().slice(0, 10);
  await db.insert(transactions).values([
    { userId: user.id, type: "income", accountId: jago.id, amount: 8_000_000, categoryId: salary.id, merchant: "PT Contoh", description: "gajian", transactionDate: iso(today), periodId: period.id },
    { userId: user.id, type: "expense", accountId: bca.id, amount: 5_000, categoryId: food.id, merchant: "es kelapa", description: "beli es kelapa", transactionDate: iso(today), periodId: period.id },
    { userId: user.id, type: "expense", accountId: cash.id, amount: 150_000, categoryId: transport.id, merchant: "SPBU", description: "isi bensin", transactionDate: iso(today), periodId: period.id },
    { userId: user.id, type: "expense", accountId: bca.id, amount: 450_000, categoryId: bills.id, merchant: "PLN", description: "bayar listrik", transactionDate: iso(today), periodId: period.id },
  ]);

  // Recompute cached current_balance from initial + transaction history.
  await recalcUserBalances(user.id);

  console.log("✔ seeded demo user  →  demo@finance.app / password123");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
