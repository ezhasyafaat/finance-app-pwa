"use client";
import { useEffect, useState } from "react";
import { X, Check, Trash2 } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatMoney } from "@/lib/utils";
import { useUI } from "@/components/UIProvider";
import type { RecentTransaction } from "@/types";

interface Account { id: string; name: string; }
interface Category { id: string; name: string; type: "income" | "expense"; }

/**
 * Edit (or delete) an existing transaction. Reuses the PATCH/DELETE endpoints.
 * `tx` must carry accountId/categoryId (present on the /api/transactions list).
 */
export default function EditTransactionSheet({
  tx,
  onClose,
  onSaved,
}: {
  tx: RecentTransaction | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { confirm, toast } = useUI();

  const isAdjustment = tx?.type === "adjustment";

  useEffect(() => {
    if (!tx) return;
    setType(tx.type === "income" ? "income" : "expense");
    setAmount(Math.abs(tx.amount));
    setAccountId(tx.accountId ?? "");
    setCategoryId(tx.categoryId ?? "");
    setDescription(tx.description ?? tx.merchant ?? "");
    setDate(tx.transactionDate);
    setError(null);
    Promise.all([api.get<Account[]>("/api/accounts"), api.get<Category[]>("/api/categories")])
      .then(([a, c]) => { setAccounts(a); setCategories(c); })
      .catch(() => {});
  }, [tx]);

  if (!tx) return null;

  const cats = categories.filter((c) => c.type === type);

  async function save() {
    if (!accountId) return setError("Pilih akun dulu.");
    if (amount <= 0) return setError("Jumlah harus lebih dari 0.");
    setSaving(true);
    setError(null);
    try {
      await api.patch(`/api/transactions/${tx!.id}`, {
        amount: isAdjustment ? tx!.amount : amount,
        accountId,
        categoryId: categoryId || null,
        description,
        transactionDate: date,
      });
      toast("Perubahan disimpan");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    const ok = await confirm({
      title: "Hapus transaksi?",
      message: "Transaksi ini akan dihapus permanen dan saldo dihitung ulang.",
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;
    setSaving(true);
    try {
      await api.del(`/api/transactions/${tx!.id}`);
      toast("Transaksi dihapus");
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit transaksi</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-surface-2">
            <X size={20} />
          </button>
        </div>

        {!isAdjustment && (
          <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-border p-1">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setType(t); setCategoryId(""); }}
                className={`rounded-lg py-2 text-sm font-semibold transition-colors ${
                  type === t
                    ? t === "expense" ? "bg-expense/15 text-expense" : "bg-income/15 text-income"
                    : "text-muted"
                }`}
              >
                {t === "expense" ? "Pengeluaran" : "Pemasukan"}
              </button>
            ))}
          </div>
        )}

        <div className="mb-1 text-center text-3xl font-extrabold tracking-tight">
          {formatMoney(isAdjustment ? tx.amount : amount, { sign: isAdjustment })}
        </div>
        {!isAdjustment && (
          <input
            type="number"
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="field mb-3 text-center"
            placeholder="Jumlah"
          />
        )}

        <label className="label">Akun</label>
        <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="field mb-3">
          <option value="">Pilih akun…</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>

        {!isAdjustment && (
          <>
            <label className="label">Kategori</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field mb-3">
              <option value="">Tanpa kategori</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </>
        )}

        <label className="label">Catatan</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} className="field mb-3" placeholder="Deskripsi" />

        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field mb-4" />

        {error && <p className="mb-3 text-sm text-expense">{error}</p>}

        <div className="flex gap-2">
          <button onClick={remove} disabled={saving} className="btn-ghost text-expense">
            <Trash2 size={18} />
          </button>
          <button onClick={save} disabled={saving} className="btn-brand flex-1">
            <Check size={18} /> {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
