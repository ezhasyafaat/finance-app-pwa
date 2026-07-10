"use client";
import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatMoney } from "@/lib/utils";
import type { TransactionDraft } from "@/types";

interface Account { id: string; name: string; }
interface Category { id: string; name: string; type: "income" | "expense"; }

export default function TransactionSheet({
  draft,
  onClose,
  onSaved,
}: {
  draft: TransactionDraft | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<TransactionDraft | null>(draft);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setForm(draft), [draft]);

  useEffect(() => {
    if (!draft) return;
    Promise.all([api.get<Account[]>("/api/accounts"), api.get<Category[]>("/api/categories")])
      .then(([a, c]) => {
        setAccounts(a);
        setCategories(c);
      })
      .catch(() => {});
  }, [draft]);

  if (!form) return null;

  const cats = categories.filter((c) => c.type === form.type);

  async function save() {
    if (!form) return;
    if (!form.accountId) return setError("Pilih akun dulu.");
    if (form.amount <= 0) return setError("Jumlah harus lebih dari 0.");
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/transactions", {
        type: form.type,
        accountId: form.accountId,
        amount: form.amount,
        categoryId: form.categoryId ?? null,
        merchant: form.merchant,
        description: form.description,
        transactionDate: form.transactionDate,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  const set = (patch: Partial<TransactionDraft>) => setForm({ ...form, ...patch });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Review transaksi</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-muted hover:bg-bg">
            <X size={20} />
          </button>
        </div>

        {/* type toggle */}
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl border border-border p-1">
          {(["expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => set({ type: t, categoryId: null })}
              className={`rounded-lg py-2 text-sm font-medium ${
                form.type === t
                  ? t === "expense"
                    ? "bg-expense/15 text-expense"
                    : "bg-income/15 text-income"
                  : "text-muted"
              }`}
            >
              {t === "expense" ? "Pengeluaran" : "Pemasukan"}
            </button>
          ))}
        </div>

        <div className="mb-1 text-center text-3xl font-bold tracking-tight">
          {formatMoney(form.amount)}
        </div>
        <input
          type="number"
          value={form.amount || ""}
          onChange={(e) => set({ amount: Number(e.target.value) })}
          className="field mb-3 text-center"
          placeholder="Jumlah"
        />

        <label className="label">Akun</label>
        <select
          value={form.accountId ?? ""}
          onChange={(e) => set({ accountId: e.target.value })}
          className="field mb-3"
        >
          <option value="">Pilih akun…</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>

        <label className="label">Kategori</label>
        <select
          value={form.categoryId ?? ""}
          onChange={(e) => set({ categoryId: e.target.value })}
          className="field mb-3"
        >
          <option value="">Tanpa kategori</option>
          {cats.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <label className="label">Catatan</label>
        <input
          value={form.description ?? ""}
          onChange={(e) => set({ description: e.target.value })}
          className="field mb-3"
          placeholder="Deskripsi"
        />

        <input
          type="date"
          value={form.transactionDate ?? ""}
          onChange={(e) => set({ transactionDate: e.target.value })}
          className="field mb-4"
        />

        {error && <p className="mb-3 text-sm text-expense">{error}</p>}

        <button onClick={save} disabled={saving} className="btn-brand w-full">
          <Check size={18} /> {saving ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </div>
  );
}
