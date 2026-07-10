import {
  pgTable,
  uuid,
  varchar,
  text,
  bigint,
  boolean,
  timestamp,
  date,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";

/**
 * Money is stored as BIGINT in the smallest unit of the currency.
 * For IDR (no decimals) this is just whole rupiah, e.g. 5000 == Rp5.000.
 * Keeping money as integers avoids floating-point rounding errors.
 */

export const accountType = pgEnum("account_type", [
  "bank",
  "ewallet",
  "cash",
  "credit_card",
]);

export const categoryType = pgEnum("category_type", ["income", "expense"]);

export const transactionType = pgEnum("transaction_type", [
  "income",
  "expense",
  "transfer",
  "adjustment",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: varchar("name", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    type: accountType("type").notNull().default("bank"),
    icon: varchar("icon", { length: 40 }),
    color: varchar("color", { length: 20 }),
    // initial balance set once by the user; current balance is derived + cached
    initialBalance: bigint("initial_balance", { mode: "number" }).notNull().default(0),
    currentBalance: bigint("current_balance", { mode: "number" }).notNull().default(0),
    // Primary account is pinned to the front of balance lists. Only one per user.
    isPrimary: boolean("is_primary").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ userIdx: index("accounts_user_idx").on(t.userId) }),
);

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    type: categoryType("type").notNull(),
    icon: varchar("icon", { length: 40 }),
    color: varchar("color", { length: 20 }),
    isDefault: boolean("is_default").notNull().default(false),
  },
  (t) => ({ userIdx: index("categories_user_idx").on(t.userId) }),
);

export const periods = pgTable(
  "periods",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 60 }).notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ userIdx: index("periods_user_idx").on(t.userId) }),
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: transactionType("type").notNull(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    // Always stored positive. The `type` determines the sign in balance math.
    amount: bigint("amount", { mode: "number" }).notNull(),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    merchant: varchar("merchant", { length: 160 }),
    description: text("description"),
    transactionDate: date("transaction_date").notNull(),
    periodId: uuid("period_id").references(() => periods.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userIdx: index("transactions_user_idx").on(t.userId),
    accountIdx: index("transactions_account_idx").on(t.accountId),
    periodIdx: index("transactions_period_idx").on(t.periodId),
    dateIdx: index("transactions_date_idx").on(t.transactionDate),
  }),
);

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    // Set when logged out / revoked; a revoked session's JWT is dead everywhere.
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    userAgent: varchar("user_agent", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ userIdx: index("sessions_user_idx").on(t.userId) }),
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // SHA-256 of the raw token; the raw value is never stored.
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ hashIdx: index("password_reset_hash_idx").on(t.tokenHash) }),
);

export const savingsGoals = pgTable(
  "savings_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    targetAmount: bigint("target_amount", { mode: "number" }).notNull(),
    color: varchar("color", { length: 20 }),
    icon: varchar("icon", { length: 40 }),
    targetDate: date("target_date"),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ userIdx: index("savings_goals_user_idx").on(t.userId) }),
);

export const savingsContributions = pgTable(
  "savings_contributions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => savingsGoals.id, { onDelete: "cascade" }),
    // Signed: positive = deposit (setor), negative = withdrawal (tarik).
    amount: bigint("amount", { mode: "number" }).notNull(),
    note: text("note"),
    date: date("date").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ goalIdx: index("savings_contributions_goal_idx").on(t.goalId) }),
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    // Spending limit per period for this category (whole rupiah).
    amount: bigint("amount", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({ userIdx: index("budgets_user_idx").on(t.userId) }),
);

export type User = typeof users.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Period = typeof periods.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type SavingsContribution = typeof savingsContributions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type Session = typeof sessions.$inferSelect;
