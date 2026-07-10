"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Target } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatMoney } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import Icon from "@/components/Icon";
import { useUI } from "@/components/UIProvider";

interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  spent: number;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
}
interface Category { id: string; name: string; type: "income" | "expense"; color: string | null; }

export default function BudgetsPage() {
  const router = useRouter();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const { confirm, toast } = useUI();

  const load = () => {
    setLoading(true);
    api.get<Budget[]>("/api/budgets").then(setBudgets).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  async function remove(b: Budget) {
    const ok = await confirm({
      title: "Hapus anggaran?",
      message: `Batas untuk ${b.categoryName} akan dihapus.`,
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;
    await api.del(`/api/budgets/${b.id}`);
    toast("Anggaran dihapus");
    load();
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-4 flex items-center gap-2">
        <button onClick={() => router.back()} aria-label="Kembali"
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-text">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold">Anggaran</h1>
          <p className="text-xs text-muted">Batas pengeluaran per periode aktif</p>
        </div>
        <button onClick={() => setAdding(true)} className="btn-brand px-3 py-2"><Plus size={18} /></button>
      </header>

      {loading && <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-surface-2" />)}</div>}

      {!loading && budgets.length === 0 && (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <span className="animate-float grid h-16 w-16 place-items-center rounded-2xl bg-brand/12 text-brand"><Target size={30} /></span>
          <p className="text-sm text-muted">Belum ada anggaran.<br />Set batas biar pengeluaran terkontrol.</p>
          <button onClick={() => setAdding(true)} className="btn-brand"><Plus size={18} /> Buat anggaran</button>
        </div>
      )}

      <div className="space-y-3">
        {budgets.map((b, i) => {
          const pct = b.amount ? Math.min(100, Math.round((b.spent / b.amount) * 100)) : 0;
          const over = b.spent > b.amount;
          const color = over ? "rgb(var(--expense))" : (b.categoryColor ?? "rgb(var(--brand))");
          return (
            <div key={b.id} className="card animate-fade-up p-4 transition-transform hover:-translate-y-0.5" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                  style={{ background: (b.categoryColor ?? "#9aa7b8") + "22", color: b.categoryColor ?? "#9aa7b8" }}
                >
                  <Icon name={b.categoryIcon} size={18} />
                </span>
                <p className="flex-1 font-semibold">{b.categoryName ?? "—"}</p>
                <button onClick={() => remove(b)} className="text-muted transition-colors hover:text-expense"><Trash2 size={15} /></button>
              </div>
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className={`font-bold ${over ? "text-expense" : ""}`}>{formatMoney(b.spent)}</span>
                <span className="text-xs text-muted">dari {formatMoney(b.amount)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
              </div>
              {over && <p className="mt-1.5 text-xs font-medium text-expense">Lewat batas {formatMoney(b.spent - b.amount)}</p>}
            </div>
          );
        })}
      </div>

      {adding && <AddBudget existing={budgets.map((b) => b.categoryId)} onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}

      <BottomNav />
    </main>
  );
}

function AddBudget({ existing, onClose, onSaved }: { existing: string[]; onClose: () => void; onSaved: () => void }) {
  const [cats, setCats] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<Category[]>("/api/categories?type=expense").then((c) => setCats(c.filter((x) => !existing.includes(x.id))));
  }, [existing]);

  async function save() {
    if (!categoryId || amount <= 0) return;
    setSaving(true);
    try {
      await api.post("/api/budgets", { categoryId, amount });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">Anggaran baru</h2>
        <label className="label">Kategori (pengeluaran)</label>
        <select className="field mb-3" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Pilih kategori…</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="label">Batas nominal</label>
        <input className="field mb-4" type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="0" />
        <button onClick={save} disabled={!categoryId || amount <= 0 || saving} className="btn-brand w-full">{saving ? "Menyimpan…" : "Simpan"}</button>
      </div>
    </div>
  );
}
