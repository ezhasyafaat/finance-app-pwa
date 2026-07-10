"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  Eye,
  EyeOff,
  Plus,
  PiggyBank,
  PieChart,
  Target,
  Star,
} from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatMoney, formatDate } from "@/lib/utils";
import { useHideBalance } from "@/lib/useHideBalance";
import { useCountUp } from "@/lib/useCountUp";
import type { DashboardData } from "@/types";
import QuickCapture from "@/components/QuickCapture";
import BottomNav from "@/components/BottomNav";
import ThemeToggle from "@/components/ThemeToggle";
import TxIcon from "@/components/TxIcon";

// Flat pastel tiles — soft tint background, coloured icon (no gradients).
const QUICK_ACTIONS = [
  { href: "/input", label: "Input", icon: Plus, tint: "#dcecfb", fg: "#4a94d1" },
  { href: "/savings", label: "Nabung", icon: PiggyBank, tint: "#d8f0e6", fg: "#2f9e6e" },
  { href: "/reports", label: "Laporan", icon: PieChart, tint: "#e8e6f9", fg: "#7b6fd0" },
  { href: "/budgets", label: "Anggaran", icon: Target, tint: "#fde7d6", fg: "#dd914a" },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string | null>(null);
  const [today, setToday] = useState("");
  const { hidden, toggle, money: mask } = useHideBalance();

  const load = useCallback(() => {
    setLoading(true);
    api.get<DashboardData>("/api/dashboard").then(setData).finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  // Computed client-side (after mount) to avoid an SSR/CSR hydration mismatch.
  useEffect(() => {
    setToday(
      new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(
        new Date(),
      ),
    );
    api
      .get<{ user: { name: string | null; email: string } | null }>("/api/me")
      .then((m) => setName(m.user?.name || m.user?.email?.split("@")[0] || null))
      .catch(() => {});
  }, []);

  const money = (n: number, opts?: { sign?: boolean }) => mask(formatMoney(n, opts));
  const animatedTotal = useCountUp(data?.totalMoney ?? 0);

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      {/* Top bar */}
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted">{today || " "}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">
            Halo{name ? `, ${name}` : ""} 👋
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={load}
            aria-label="Muat ulang"
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-text"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Balance hero — the e-wallet centrepiece */}
      <section
        className="animate-fade-up relative mb-5 overflow-hidden rounded-3xl bg-brand-strong p-6 text-white"
        style={{ boxShadow: "0 20px 40px -22px rgb(var(--brand-strong) / 0.55)" }}
      >
        {/* soft light orbs for depth */}
        <div className="animate-float pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="animate-float pointer-events-none absolute -bottom-16 -left-8 h-40 w-40 rounded-full bg-black/10 blur-2xl" style={{ animationDelay: "1.5s" }} />

        <div className="relative flex items-center justify-between">
          <p className="text-sm font-medium text-white/80">Saldo total</p>
          <button
            onClick={toggle}
            aria-label={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
            className="grid h-8 w-8 place-items-center rounded-full bg-white/15 text-white/90 transition hover:bg-white/25"
          >
            {hidden ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <p className="relative mt-1 text-[2.6rem] font-extrabold leading-tight tracking-tight">
          {money(animatedTotal)}
        </p>

        <div className="relative mt-5 flex gap-3">
          <Link
            href="/reports?type=income"
            aria-label="Lihat pemasukan periode"
            className="flex-1 rounded-2xl bg-white/15 px-3.5 py-2.5 backdrop-blur transition hover:bg-white/25 active:scale-95"
          >
            <div className="flex items-center gap-1.5 text-xs text-white/80">
              <ArrowDownRight size={13} /> Masuk
            </div>
            <p className="mt-0.5 font-bold">{money(data?.incomeThisPeriod ?? 0)}</p>
          </Link>
          <Link
            href="/reports?type=expense"
            aria-label="Lihat pengeluaran periode"
            className="flex-1 rounded-2xl bg-white/15 px-3.5 py-2.5 backdrop-blur transition hover:bg-white/25 active:scale-95"
          >
            <div className="flex items-center gap-1.5 text-xs text-white/80">
              <ArrowUpRight size={13} /> Keluar
            </div>
            <p className="mt-0.5 font-bold">{money(data?.expenseThisPeriod ?? 0)}</p>
          </Link>
        </div>
      </section>

      {/* Quick actions */}
      <section className="animate-fade-up mb-6 grid grid-cols-4 gap-2" style={{ animationDelay: "70ms" }}>
        {QUICK_ACTIONS.map(({ href, label, icon: Icon, tint, fg }) => (
          <Link key={label} href={href} className="group flex flex-col items-center gap-2">
            <span
              className="grid h-14 w-14 place-items-center rounded-2xl transition-transform group-hover:-translate-y-0.5 group-active:scale-90"
              style={{ background: tint, color: fg }}
            >
              <span className="group-hover:wiggle inline-flex"><Icon size={22} /></span>
            </span>
            <span className="text-xs font-semibold text-muted">{label}</span>
          </Link>
        ))}
      </section>

      {/* Quick Capture (AI input) */}
      <section className="animate-fade-up mb-6" style={{ animationDelay: "130ms" }}>
        <h2 className="mb-2 text-sm font-semibold text-muted">Catat cepat</h2>
        <QuickCapture onSaved={load} />
      </section>

      {/* Accounts — horizontal wallet cards */}
      <section className="animate-fade-up mb-6" style={{ animationDelay: "190ms" }}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Rekening</h2>
          <Link href="/accounts" className="text-xs font-medium text-brand">
            Kelola
          </Link>
        </div>

        {loading && !data ? (
          <div className="flex gap-3 overflow-hidden">
            {[0, 1].map((i) => (
              <div key={i} className="h-24 w-40 shrink-0 animate-pulse rounded-2xl bg-surface-2" />
            ))}
          </div>
        ) : data && data.accounts.length > 0 ? (
          <div className="-mr-4 flex snap-x snap-mandatory gap-3 overflow-x-auto pr-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {data.accounts.map((a) => (
              <Link
                key={a.id}
                href={`/accounts/${a.id}`}
                className="relative w-40 shrink-0 snap-start overflow-hidden rounded-2xl p-4 text-white transition-transform active:scale-95"
                style={{ background: a.color ?? "rgb(var(--brand-strong))" }}
              >
                <div className="pointer-events-none absolute -right-6 -top-8 h-24 w-24 rounded-full bg-white/15 blur-xl" />
                <div className="relative flex items-center gap-1">
                  <p className="text-xs font-medium text-white/80">{a.name}</p>
                  {a.isPrimary && <Star size={11} className="fill-white text-white" />}
                </div>
                <p className="relative mt-6 text-lg font-bold">{money(a.currentBalance)}</p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card p-6 text-center text-sm text-muted">
            Belum ada rekening.{" "}
            <Link href="/accounts" className="font-medium text-brand">
              Tambah
            </Link>
          </div>
        )}
      </section>

      {/* Recent transactions */}
      <section className="animate-fade-up" style={{ animationDelay: "250ms" }}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">Transaksi terakhir</h2>
          <Link href="/transactions" className="text-xs font-medium text-brand">
            Lihat semua
          </Link>
        </div>
        <div className="card divide-y divide-border">
          {(data?.recent ?? []).map((t, i) => {
            const income = t.type === "income";
            return (
              <div key={t.id} className="animate-fade-up flex items-center gap-3 p-3.5" style={{ animationDelay: `${280 + i * 45}ms` }}>
                <TxIcon type={t.type} categoryIcon={t.categoryIcon} categoryColor={t.categoryColor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {t.merchant || t.description || t.categoryName || "Transaksi"}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {t.categoryName ?? t.type} · {t.accountName} · {formatDate(t.transactionDate)}
                  </p>
                </div>
                <span className={`shrink-0 font-bold ${income ? "text-income" : "text-expense"}`}>
                  {money(t.amount)}
                </span>
              </div>
            );
          })}
          {data?.recent.length === 0 && (
            <div className="p-8 text-center text-sm text-muted">Belum ada transaksi.</div>
          )}
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
