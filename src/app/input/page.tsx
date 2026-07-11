"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ScanLine, Sparkles } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatMoney, todayIso } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";

interface Account { id: string; name: string; }
interface Category { id: string; name: string; type: "income" | "expense"; }
type Mode = "expense" | "income" | "transfer";

export default function InputPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [type, setType] = useState<Mode>("expense");
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get<Account[]>("/api/accounts"), api.get<Category[]>("/api/categories")])
      .then(([a, c]) => {
        setAccounts(a);
        setCategories(c);
        if (a[0]) setAccountId(a[0].id);
      })
      .catch(() => {});
  }, []);

  const cats = categories.filter((c) => c.type === type);
  const amountColor = type === "expense" ? "text-expense" : type === "income" ? "text-income" : "text-brand";

  async function save() {
    if (!accountId) return setError(type === "transfer" ? "Pilih akun asal dulu." : "Pilih akun dulu.");
    if (amount <= 0) return setError("Jumlah harus lebih dari 0.");
    if (type === "transfer") {
      if (!toAccountId) return setError("Pilih akun tujuan.");
      if (toAccountId === accountId) return setError("Akun asal dan tujuan tidak boleh sama.");
    }
    setSaving(true);
    setError(null);
    try {
      await api.post("/api/transactions", {
        type,
        accountId,
        ...(type === "transfer" ? { toAccountId } : { categoryId: categoryId || null }),
        amount,
        description,
        transactionDate: date,
      });
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setSaving(false);
    }
  }

  const MODES: { v: Mode; label: string; on: string }[] = [
    { v: "expense", label: "Keluar", on: "bg-expense/15 text-expense" },
    { v: "income", label: "Masuk", on: "bg-income/15 text-income" },
    { v: "transfer", label: "Transfer", on: "bg-brand/15 text-brand" },
  ];

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-4 flex items-center gap-2">
        <button
          onClick={() => router.back()}
          aria-label="Kembali"
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-text"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-bold">Input transaksi</h1>
        <Link
          href="/scan"
          className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-2 text-xs font-medium text-brand"
        >
          <ScanLine size={15} /> Scan struk
        </Link>
      </header>

      {/* type toggle */}
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-xl border border-border p-1">
        {MODES.map((m) => (
          <button
            key={m.v}
            onClick={() => { setType(m.v); setCategoryId(""); }}
            className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${type === m.v ? m.on : "text-muted"}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* amount */}
      <div className="card mb-4 p-5 text-center">
        <p className="text-xs text-muted">Jumlah</p>
        <p className={`mt-1 text-4xl font-extrabold tracking-tight ${amountColor}`}>{formatMoney(amount)}</p>
        <input
          type="number"
          value={amount || ""}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="field mt-3 text-center"
          placeholder="0"
          autoFocus
        />
      </div>

      <label className="label">{type === "transfer" ? "Dari akun" : "Akun"}</label>
      <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="field mb-3">
        <option value="">Pilih akun…</option>
        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
      </select>

      {type === "transfer" ? (
        <>
          <label className="label">Ke akun</label>
          <select value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="field mb-3">
            <option value="">Pilih akun tujuan…</option>
            {accounts.filter((a) => a.id !== accountId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </>
      ) : (
        <>
          <label className="label">Kategori</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field mb-3">
            <option value="">Tanpa kategori</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </>
      )}

      <label className="label">Catatan</label>
      <input value={description} onChange={(e) => setDescription(e.target.value)} className="field mb-3" placeholder="Deskripsi (opsional)" />

      <label className="label">Tanggal</label>
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field mb-4" />

      {error && <p className="mb-3 text-sm text-expense">{error}</p>}

      <button onClick={save} disabled={saving} className="btn-brand w-full">
        <Check size={18} /> {saving ? "Menyimpan…" : "Simpan transaksi"}
      </button>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted">
        <Sparkles size={13} className="text-brand" /> Butuh cepat? Pakai Catat Cepat di beranda.
      </p>

      <BottomNav />
    </main>
  );
}
