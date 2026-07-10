"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatMoney } from "@/lib/utils";
import BottomNav from "@/components/BottomNav";
import Icon from "@/components/Icon";

interface Slice { categoryId: string | null; name: string; color: string | null; icon: string | null; amount: number; pct: number; }
interface Section { total: number; slices: Slice[]; }
interface Report {
  period: { id: string; name: string };
  expense: Section;
  income: Section;
}

const FALLBACK = ["#7ab2e2", "#7fcfae", "#a99fe0", "#eaa6c4", "#f0b58a", "#6fc7c2", "#ecd98a", "#e79a94"];

export default function ReportsPage() {
  const router = useRouter();
  const [data, setData] = useState<Report | null>(null);
  const [tab, setTab] = useState<"expense" | "income">("expense");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial tab from ?type= (set when arriving from the dashboard Masuk/Keluar).
    const t = new URLSearchParams(window.location.search).get("type");
    if (t === "income" || t === "expense") setTab(t);
    api.get<Report>("/api/reports").then(setData).finally(() => setLoading(false));
  }, []);

  const section = data?.[tab];
  const color = (s: Slice, i: number) => s.color ?? FALLBACK[i % FALLBACK.length];

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-4 flex items-center gap-2">
        <button onClick={() => router.back()} aria-label="Kembali"
          className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-text">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-lg font-bold">Laporan</h1>
          <p className="text-xs text-muted">{data?.period.name ?? "…"}</p>
        </div>
      </header>

      <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-surface p-1">
        {(["expense", "income"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl py-2 text-sm font-semibold transition-colors ${
              tab === t ? (t === "expense" ? "bg-expense/15 text-expense" : "bg-income/15 text-income") : "text-muted hover:text-text"
            }`}>
            {t === "expense" ? "Pengeluaran" : "Pemasukan"}
          </button>
        ))}
      </div>

      {loading && <div className="h-64 animate-pulse rounded-2xl bg-surface-2" />}

      {!loading && section && (
        <>
          <section className="card mb-4 p-5">
            <p className="text-xs text-muted">Total {tab === "expense" ? "pengeluaran" : "pemasukan"}</p>
            <p className={`mt-0.5 text-3xl font-extrabold tracking-tight ${tab === "expense" ? "text-expense" : "text-income"}`}>
              {formatMoney(section.total)}
            </p>
          </section>

          <div className="card divide-y divide-border">
            {section.slices.map((s, i) => (
              <div key={s.categoryId ?? i} className="p-3.5">
                <div className="mb-1.5 flex items-center gap-2.5">
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                    style={{ background: color(s, i) + "22", color: color(s, i) }}
                  >
                    <Icon name={s.icon} size={15} />
                  </span>
                  <p className="flex-1 truncate font-medium">{s.name}</p>
                  <span className="text-xs text-muted">{s.pct}%</span>
                  <span className="font-bold">{formatMoney(s.amount)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full transition-all" style={{ width: `${s.pct}%`, background: color(s, i) }} />
                </div>
              </div>
            ))}
            {section.slices.length === 0 && (
              <p className="p-8 text-center text-sm text-muted">Belum ada data di periode ini.</p>
            )}
          </div>
        </>
      )}

      <BottomNav />
    </main>
  );
}
