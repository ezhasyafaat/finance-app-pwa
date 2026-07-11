"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, PiggyBank } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatMoney } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import Icon, { GOAL_ICONS } from "@/components/Icon";
import IconPicker from "@/components/IconPicker";

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  saved: number;
  color: string | null;
  icon: string | null;
  instrument: string | null;
  targetDate: string | null;
}

const PALETTE = ["#7ab2e2", "#7fcfae", "#a99fe0", "#eaa6c4", "#f0b58a", "#6fc7c2"];

export default function SavingsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const load = () => {
    setLoading(true);
    api.get<Goal[]>("/api/goals").then(setGoals).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

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
        <h1 className="text-lg font-bold">Tabungan</h1>
        <button onClick={() => setAdding(true)} className="btn-brand ml-auto px-3 py-2">
          <Plus size={18} /> Target
        </button>
      </header>

      {loading && (
        <div className="space-y-3">
          {[0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface-2" />)}
        </div>
      )}

      {!loading && goals.length === 0 && (
        <div className="card flex flex-col items-center gap-3 p-10 text-center">
          <span className="animate-float grid h-16 w-16 place-items-center rounded-2xl bg-brand/12 text-brand">
            <PiggyBank size={30} />
          </span>
          <p className="text-sm text-muted">Belum ada target tabungan.<br />Buat target pertamamu.</p>
          <button onClick={() => setAdding(true)} className="btn-brand">
            <Plus size={18} /> Buat target
          </button>
        </div>
      )}

      <div className="space-y-3">
        {goals.map((g, i) => {
          const pct = g.targetAmount ? Math.min(1, g.saved / g.targetAmount) : 0;
          const color = g.color ?? "#7ab2e2";
          return (
            <Link
              key={g.id}
              href={`/savings/${g.id}`}
              className="card animate-fade-up block p-4 transition-transform hover:-translate-y-0.5 active:scale-[0.99]"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: color + "22", color }}>
                  <Icon name={g.icon} size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{g.name}</p>
                  {g.instrument && (
                    <span className="mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: color + "22", color }}>
                      {g.instrument}
                    </span>
                  )}
                </div>
                <span className="text-sm font-extrabold" style={{ color }}>{Math.round(pct * 100)}%</span>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct * 100}%`, background: color }} />
              </div>
              <div className="mt-2 flex items-baseline justify-between text-xs">
                <span className="font-bold">{formatMoney(g.saved)}</span>
                <span className="text-muted">dari {formatMoney(g.targetAmount)}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {adding && <AddGoal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); load(); }} />}

      <BottomNav />
    </main>
  );
}

function AddGoal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState(0);
  const [color, setColor] = useState(PALETTE[0]);
  const [icon, setIcon] = useState(GOAL_ICONS[0]);
  const [instrument, setInstrument] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || target <= 0) return;
    setSaving(true);
    try {
      await api.post("/api/goals", {
        name,
        targetAmount: target,
        color,
        icon,
        instrument: instrument.trim() || null,
        targetDate: targetDate || null,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ background: color + "22", color }}>
            <Icon name={icon} size={22} />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Target tabungan baru</h2>
            <p className="text-xs text-muted">{name.trim() || "Pratinjau"}</p>
          </div>
        </div>

        <label className="label">Nama target</label>
        <input className="field mb-3" value={name} onChange={(e) => setName(e.target.value)} placeholder="Beli motor, dana darurat…" />

        <label className="label">Instrumen (opsional)</label>
        <input className="field mb-3" value={instrument} onChange={(e) => setInstrument(e.target.value)} placeholder="Emas, saham, crypto…" maxLength={40} />

        <label className="label">Target nominal</label>
        <input className="field mb-3" type="number" value={target || ""} onChange={(e) => setTarget(Number(e.target.value))} placeholder="0" />
        <label className="label">Target tanggal (opsional)</label>
        <input className="field mb-3" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />

        <label className="label">Warna</label>
        <div className="mb-3 flex gap-2">
          {PALETTE.map((c) => (
            <button key={c} onClick={() => setColor(c)} aria-label={c}
              className={`h-8 w-8 rounded-full ${color === c ? "scale-110" : ""}`}
              style={{ background: c, boxShadow: color === c ? `0 0 0 2px rgb(var(--surface)), 0 0 0 4px ${c}` : undefined }} />
          ))}
        </div>

        <label className="label">Ikon</label>
        <div className="mb-4 max-h-40 overflow-y-auto pr-1">
          <IconPicker icons={GOAL_ICONS} value={icon} onChange={setIcon} color={color} />
        </div>

        <button onClick={save} disabled={!name.trim() || target <= 0 || saving} className="btn-brand w-full">
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </div>
  );
}
