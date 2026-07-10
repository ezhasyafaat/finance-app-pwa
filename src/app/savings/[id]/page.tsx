"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Minus, Pencil, Trash2, PiggyBank } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatMoney, formatDate } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import ProgressRing from "@/components/ProgressRing";
import Icon, { GOAL_ICONS } from "@/components/Icon";
import IconPicker from "@/components/IconPicker";
import { useUI } from "@/components/UIProvider";

interface Contribution { id: string; amount: number; note: string | null; date: string; }
interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  saved: number;
  color: string | null;
  icon: string | null;
  targetDate: string | null;
  contributions: Contribution[];
}

export default function GoalDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [mode, setMode] = useState<null | "deposit" | "withdraw">(null);
  const [editing, setEditing] = useState(false);
  const { confirm, toast } = useUI();

  const load = useCallback(() => {
    api.get<Goal>(`/api/goals/${id}`).then(setGoal).catch(() => setGoal(null));
  }, [id]);
  useEffect(() => load(), [load]);

  async function removeGoal() {
    const ok = await confirm({
      title: "Hapus target tabungan?",
      message: "Target ini beserta seluruh riwayat setorannya akan dihapus.",
      confirmLabel: "Hapus",
      danger: true,
    });
    if (!ok) return;
    await api.del(`/api/goals/${id}`);
    toast("Target tabungan dihapus");
    router.replace("/savings");
  }

  const pct = goal && goal.targetAmount ? goal.saved / goal.targetAmount : 0;
  const color = goal?.color ?? "rgb(var(--brand))";
  const remaining = goal ? Math.max(0, goal.targetAmount - goal.saved) : 0;

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-4 flex items-center gap-2">
        <button onClick={() => router.back()} aria-label="Kembali"
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-text">
          <ArrowLeft size={18} />
        </button>
        <h1 className="flex-1 truncate text-lg font-bold">{goal?.name ?? "…"}</h1>
        <button onClick={() => setEditing(true)} aria-label="Edit" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-brand"><Pencil size={17} /></button>
        <button onClick={removeGoal} aria-label="Hapus" className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-expense"><Trash2 size={17} /></button>
      </header>

      {/* Progress hero */}
      <section className="card mb-4 flex flex-col items-center gap-3 p-6">
        <ProgressRing value={pct} color={color} size={160} stroke={14}>
          <div className="text-center">
            <span className="mb-0.5 flex justify-center" style={{ color }}><Icon name={goal?.icon} size={26} /></span>
            <p className="text-3xl font-extrabold" style={{ color }}>{Math.round(pct * 100)}%</p>
            <p className="text-xs text-muted">tercapai</p>
          </div>
        </ProgressRing>
        <div className="text-center">
          <p className="text-2xl font-extrabold">{formatMoney(goal?.saved ?? 0)}</p>
          <p className="text-sm text-muted">dari {formatMoney(goal?.targetAmount ?? 0)}</p>
          {remaining > 0 && <p className="mt-1 text-xs text-muted">kurang {formatMoney(remaining)}</p>}
          {goal?.targetDate && <p className="mt-1 text-xs text-muted">Target: {formatDate(goal.targetDate)}</p>}
        </div>
        <div className="mt-1 grid w-full grid-cols-2 gap-2">
          <button onClick={() => setMode("deposit")} className="btn-brand"><Plus size={18} /> Setor</button>
          <button onClick={() => setMode("withdraw")} className="btn-ghost"><Minus size={18} /> Tarik</button>
        </div>
      </section>

      {/* History */}
      <h2 className="mb-2 text-sm font-semibold text-muted">Riwayat</h2>
      <div className="card divide-y divide-border">
        {(goal?.contributions ?? []).map((c) => {
          const dep = c.amount >= 0;
          return (
            <div key={c.id} className="flex items-center gap-3 p-3.5">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${dep ? "bg-income/15 text-income" : "bg-expense/15 text-expense"}`}>
                {dep ? <Plus size={16} /> : <Minus size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{c.note || (dep ? "Setoran" : "Penarikan")}</p>
                <p className="text-xs text-muted">{formatDate(c.date)}</p>
              </div>
              <span className={`font-bold ${dep ? "text-income" : "text-expense"}`}>{formatMoney(c.amount, { sign: true })}</span>
            </div>
          );
        })}
        {goal && goal.contributions.length === 0 && (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted">
            <PiggyBank size={28} className="text-muted" />
            Belum ada setoran. Mulai nabung sekarang.
          </div>
        )}
      </div>

      {mode && <ContributeSheet goalId={id} mode={mode} onClose={() => setMode(null)} onSaved={() => { setMode(null); load(); }} />}
      {editing && goal && <EditGoalSheet goal={goal} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); load(); }} />}

      <BottomNav />
    </main>
  );
}

function ContributeSheet({ goalId, mode, onClose, onSaved }: { goalId: string; mode: "deposit" | "withdraw"; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const dep = mode === "deposit";

  async function save() {
    if (amount <= 0) return;
    setSaving(true);
    try {
      await api.post(`/api/goals/${goalId}/contributions`, { amount: dep ? amount : -amount, note: note || null });
      onSaved();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl border-t border-border bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-semibold">{dep ? "Setor tabungan" : "Tarik tabungan"}</h2>
        <div className={`mb-2 text-center text-3xl font-extrabold ${dep ? "text-income" : "text-expense"}`}>{formatMoney(amount)}</div>
        <input className="field mb-3 text-center" type="number" value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} placeholder="Jumlah" />
        <label className="label">Catatan (opsional)</label>
        <input className="field mb-4" value={note} onChange={(e) => setNote(e.target.value)} placeholder="mis. sisihan gaji" />
        <button onClick={save} disabled={amount <= 0 || saving} className="btn-brand w-full">{saving ? "Menyimpan…" : "Simpan"}</button>
      </div>
    </div>
  );
}

function EditGoalSheet({ goal, onClose, onSaved }: { goal: Goal; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(goal.name);
  const [target, setTarget] = useState(goal.targetAmount);
  const [icon, setIcon] = useState(goal.icon ?? GOAL_ICONS[0]);
  const [targetDate, setTargetDate] = useState(goal.targetDate ?? "");
  const [saving, setSaving] = useState(false);
  const color = goal.color ?? "#7ab2e2";

  async function save() {
    if (!name.trim() || target <= 0) return;
    setSaving(true);
    try {
      await api.patch(`/api/goals/${goal.id}`, { name, targetAmount: target, icon, targetDate: targetDate || null });
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
          <h2 className="text-lg font-semibold">Edit target</h2>
        </div>
        <label className="label">Nama target</label>
        <input className="field mb-3" value={name} onChange={(e) => setName(e.target.value)} />
        <label className="label">Target nominal</label>
        <input className="field mb-3" type="number" value={target || ""} onChange={(e) => setTarget(Number(e.target.value))} />
        <label className="label">Target tanggal (opsional)</label>
        <input className="field mb-3" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
        <label className="label">Ikon</label>
        <div className="mb-4 max-h-40 overflow-y-auto pr-1">
          <IconPicker icons={GOAL_ICONS} value={icon} onChange={setIcon} color={color} />
        </div>
        <button onClick={save} disabled={!name.trim() || target <= 0 || saving} className="btn-brand w-full">{saving ? "Menyimpan…" : "Simpan"}</button>
      </div>
    </div>
  );
}
