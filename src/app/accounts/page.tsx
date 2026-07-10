"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Scale, Trash2, Star, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatMoney } from "@/lib/utils";
import { useHideBalance } from "@/lib/useHideBalance";
import { useUI } from "@/components/UIProvider";
import BottomNav from "@/components/BottomNav";

interface Account {
  id: string;
  name: string;
  type: string;
  color: string | null;
  initialBalance: number;
  currentBalance: number;
  isPrimary: boolean;
}

const TYPES = [
  { v: "bank", l: "Bank" },
  { v: "ewallet", l: "E-Wallet" },
  { v: "cash", l: "Cash" },
  { v: "credit_card", l: "Kartu Kredit" },
];

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [adjust, setAdjust] = useState<Account | null>(null);
  const { hidden, toggle, money } = useHideBalance();
  const { confirm, toast } = useUI();

  const load = () => api.get<Account[]>("/api/accounts").then(setAccounts);
  useEffect(() => { load(); }, []);

  async function makePrimary(a: Account) {
    if (a.isPrimary) return;
    await api.patch(`/api/accounts/${a.id}`, { isPrimary: true });
    toast(`${a.name} jadi rekening utama`);
    load();
  }

  async function remove(a: Account) {
    const ok = await confirm({
      title: "Hapus rekening?",
      message: `"${a.name}" tidak lagi dihitung. Riwayat transaksinya tetap tersimpan.`,
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;
    await api.del(`/api/accounts/${a.id}`);
    toast("Rekening dihapus");
    load();
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">Rekening</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={toggle}
            aria-label={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-text"
          >
            {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-brand px-3 py-2">
            <Plus size={18} /> Tambah
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {accounts.map((a) => (
          <div key={a.id} className="card p-4">
            <Link href={`/accounts/${a.id}`} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-xs font-bold text-white"
                  style={{ background: a.color ?? "rgb(var(--brand-strong))" }}
                >
                  {a.name.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold">{a.name}</p>
                    {a.isPrimary && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-brand/12 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                        <Star size={9} className="fill-brand" /> Utama
                      </span>
                    )}
                  </div>
                  <p className="text-xs capitalize text-muted">{a.type.replace("_", " ")}</p>
                </div>
              </div>
              <p className="text-right font-bold">{money(formatMoney(a.currentBalance))}</p>
            </Link>

            <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3">
              <button
                onClick={() => makePrimary(a)}
                disabled={a.isPrimary}
                className="chip disabled:opacity-40"
              >
                <Star size={13} className={a.isPrimary ? "fill-brand text-brand" : ""} />
                {a.isPrimary ? "Utama" : "Jadikan utama"}
              </button>
              <button onClick={() => setAdjust(a)} className="chip">
                <Scale size={13} /> Sesuaikan
              </button>
              <button
                onClick={() => remove(a)}
                className="ml-auto grid h-8 w-8 place-items-center rounded-full text-muted transition-colors hover:bg-expense/12 hover:text-expense"
                aria-label={`Hapus ${a.name}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {accounts.length === 0 && (
          <div className="card p-8 text-center text-sm text-muted">
            Belum ada rekening. Tambahkan rekening pertamamu.
          </div>
        )}
      </div>

      {showAdd && <AddAccount onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {adjust && <AdjustBalance account={adjust} onClose={() => setAdjust(null)} onSaved={() => { setAdjust(null); load(); }} />}

      <BottomNav />
    </main>
  );
}

function AddAccount({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("bank");
  const [color, setColor] = useState("#7ab2e2");
  const [initialBalance, setInitial] = useState(0);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await api.post("/api/accounts", { name, type, color, initialBalance });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title="Tambah rekening" onClose={onClose}>
      <label className="label">Nama</label>
      <input className="field mb-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama rekening" />
      <label className="label">Tipe</label>
      <select className="field mb-3" value={type} onChange={(e) => setType(e.target.value)}>
        {TYPES.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
      </select>
      <label className="label">Saldo awal</label>
      <input className="field mb-3" type="number" value={initialBalance || ""} onChange={(e) => setInitial(Number(e.target.value))} placeholder="0" />
      <label className="label">Warna</label>
      <input className="field mb-4 h-11" type="color" value={color} onChange={(e) => setColor(e.target.value)} />
      <button onClick={save} disabled={!name || saving} className="btn-brand w-full">
        {saving ? "Menyimpan…" : "Simpan"}
      </button>
    </Sheet>
  );
}

function AdjustBalance({ account, onClose, onSaved }: { account: Account; onClose: () => void; onSaved: () => void }) {
  const [real, setReal] = useState(account.currentBalance);
  const [saving, setSaving] = useState(false);
  const delta = real - account.currentBalance;

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/api/accounts/${account.id}`, { adjustTo: real });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet title={`Sesuaikan saldo — ${account.name}`} onClose={onClose}>
      <p className="mb-3 text-sm text-muted">
        Saldo aplikasi: <b>{formatMoney(account.currentBalance)}</b>. Masukkan saldo asli rekening; selisih dicatat sebagai transaksi Adjustment.
      </p>
      <label className="label">Saldo asli</label>
      <input className="field mb-2" type="number" value={real || ""} onChange={(e) => setReal(Number(e.target.value))} />
      {delta !== 0 && (
        <p className={`mb-3 text-sm ${delta < 0 ? "text-expense" : "text-income"}`}>
          Adjustment: {formatMoney(delta, { sign: true })}
        </p>
      )}
      <button onClick={save} disabled={saving} className="btn-brand w-full">
        {saving ? "Menyimpan…" : "Simpan"}
      </button>
    </Sheet>
  );
}

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-sm text-muted">Tutup</button>
        </div>
        {children}
      </div>
    </div>
  );
}
