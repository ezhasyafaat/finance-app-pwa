"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, CalendarClock, Check, Palette, Tags, ChevronRight } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatDate } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import { useUI } from "@/components/UIProvider";

interface Me { user: { email: string; name: string | null } | null; ai: { configured: boolean; model?: string; visionModel?: string } }
interface Period { id: string; name: string; startDate: string; endDate: string; isActive: boolean }

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [periods, setPeriods] = useState<Period[]>([]);
  const [startDay, setStartDay] = useState(25);
  const { confirm } = useUI();

  const loadPeriods = () => api.get<Period[]>("/api/periods").then(setPeriods);
  useEffect(() => {
    api.get<Me>("/api/me").then(setMe);
    loadPeriods();
  }, []);

  async function logout() {
    await api.post("/api/auth/logout");
    router.replace("/login");
    router.refresh();
  }

  async function logoutAll() {
    const ok = await confirm({
      title: "Keluar dari semua perangkat?",
      message: "Semua sesi login di perangkat mana pun akan diputus.",
      confirmLabel: "Keluar",
      danger: true,
    });
    if (!ok) return;
    await api.post("/api/auth/logout-all");
    router.replace("/login");
    router.refresh();
  }

  async function newPeriod() {
    await api.post("/api/periods", { startDay });
    loadPeriods();
  }

  async function setActive(id: string, isActive: boolean) {
    await api.patch(`/api/periods/${id}`, { isActive });
    loadPeriods();
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Pengaturan</h1>

      <section className="card mb-4 p-4">
        <p className="text-sm text-muted">Akun</p>
        <p className="font-medium">{me?.user?.name || me?.user?.email}</p>
        <p className="text-xs text-muted">{me?.user?.email}</p>
      </section>

      <section className="card mb-4 flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Palette size={16} className="text-brand" />
          <div>
            <p className="text-sm font-medium">Tampilan</p>
            <p className="text-xs text-muted">Mode terang / gelap</p>
          </div>
        </div>
        <ThemeToggle />
      </section>

      <Link href="/categories" className="card mb-4 flex items-center justify-between p-4 transition-colors hover:bg-surface-2">
        <div className="flex items-center gap-2">
          <Tags size={16} className="text-brand" />
          <div>
            <p className="text-sm font-medium">Kelola kategori</p>
            <p className="text-xs text-muted">Tambah, ubah, hapus kategori</p>
          </div>
        </div>
        <ChevronRight size={18} className="text-muted" />
      </Link>

      <section className="card mb-4 p-4">
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock size={16} className="text-brand" />
          <p className="text-sm font-medium">Periode</p>
        </div>

        <div className="mb-3 flex items-end gap-2">
          <div className="flex-1">
            <label className="label">Tanggal mulai (gajian)</label>
            <input
              type="number"
              min={1}
              max={31}
              value={startDay}
              onChange={(e) => setStartDay(Number(e.target.value))}
              className="field"
            />
          </div>
          <button onClick={newPeriod} className="btn-brand">Buat periode</button>
        </div>

        <div className="divide-y divide-border">
          {periods.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="font-medium">{p.name}</p>
                <p className="text-xs text-muted">{formatDate(p.startDate)} – {formatDate(p.endDate)}</p>
              </div>
              {p.isActive ? (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 text-xs font-medium text-income"><Check size={14} /> Aktif</span>
                  <button onClick={() => setActive(p.id, false)} className="rounded-full border border-border px-2.5 py-1 text-xs text-muted hover:text-expense">Stop</button>
                </div>
              ) : (
                <button onClick={() => setActive(p.id, true)} className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand/10">Aktifkan</button>
              )}
            </div>
          ))}
          {periods.length === 0 && <p className="py-3 text-center text-sm text-muted">Belum ada periode.</p>}
        </div>
      </section>

      <button onClick={logout} className="btn-ghost w-full text-expense">
        <LogOut size={18} /> Keluar
      </button>
      <button onClick={logoutAll} className="mt-2 w-full text-center text-xs text-muted hover:text-expense">
        Keluar dari semua perangkat
      </button>

      <BottomNav />
    </main>
  );
}
