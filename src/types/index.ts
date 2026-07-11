export type TxType = "income" | "expense" | "transfer" | "adjustment";
export type AccountType = "bank" | "ewallet" | "cash" | "credit_card";

/** A parsed-but-unsaved transaction produced by the AI (names, not IDs). */
export interface TransactionDraft {
  // AI drafts are only ever income or expense; adjustments are created directly.
  type: "income" | "expense";
  amount: number;
  categoryName: string | null;
  accountName: string | null;
  merchant: string | null;
  description: string | null;
  transactionDate: string | null; // yyyy-mm-dd
  // resolved server-side against the user's data:
  accountId?: string | null;
  categoryId?: string | null;
  confidence?: number;
}

/** Receipt Scanner output. */
export interface ReceiptDraft extends TransactionDraft {
  items?: { name: string; qty?: number; price?: number }[];
}

export interface DashboardData {
  totalMoney: number;
  expenseThisPeriod: number;
  incomeThisPeriod: number;
  period: { id: string; name: string; startDate: string; endDate: string } | null;
  accounts: {
    id: string;
    name: string;
    type: AccountType;
    icon: string | null;
    color: string | null;
    currentBalance: number;
    isPrimary: boolean;
  }[];
  recent: RecentTransaction[];
}

export interface RecentTransaction {
  id: string;
  type: TxType;
  amount: number;
  merchant: string | null;
  description: string | null;
  transactionDate: string;
  accountName: string | null;
  transferAccountId: string | null;
  transferAccountName: string | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  // present on the /api/transactions list (not on the dashboard recent list)
  accountId?: string;
  categoryId?: string | null;
}
