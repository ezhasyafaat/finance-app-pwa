"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Search, X, Star, Eye, EyeOff } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatMoney, formatDate } from "@/lib/utils";
import { useHideBalance } from "@/lib/useHideBalance";
import type { RecentTransaction } from "@/types";
import BottomNav from "@/components/BottomNav";
import EditTransactionSheet from "@/components/EditTransactionSheet";
import TxIcon from "@/components/TxIcon";

interface Account {
  id: string;
  name: string;
  type: string;
  color: string | null;
  currentBalance: number;
  isPrimary: boolean;
}

const PAGE = 20;

export default function AccountDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [account, setAccount] = useState<Account | null>(null);
  const [items, setItems] = useState<RecentTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [editing, setEditing] = useState<RecentTransaction | null>(null);
  const { hidden, toggle, money } = useHideBalance();

  const loadAccount = useCallback(() => {
    api.get<Account>(`/api/accounts/${id}`).then(setAccount).catch(() => setAccount(null));
  }, [id]);
  useEffect(() => loadAccount(), [loadAccount]);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    (offset: number) => {
      const p = new URLSearchParams({ accountId: id, limit: String(PAGE), offset: String(offset) });
      if (query) p.set("search", query);
      return api.get<RecentTransaction[]>(`/api/transactions?${p.toString()}`);
    },
    [id, query],
  );

  useEffect(() => {
    setLoading(true);
    fetchPage(0)
      .then((rows) => {
        setItems(rows);
        setHasMore(rows.length === PAGE);
      })
      .finally(() => setLoading(false));
  }, [fetchPage]);

  async function loadMore() {
    setLoadingMore(true);
    try {
      const rows = await fetchPage(items.length);
      setItems((prev) => [...prev, ...rows]);
      setHasMore(rows.length === PAGE);
    } finally {
      setLoadingMore(false);
    }
  }

  function reloadAfterEdit() {
    setEditing(null);
    loadAccount();
    setLoading(true);
    fetchPage(0)
      .then((rows) => { setItems(rows); setHasMore(rows.length === PAGE); })
      .finally(() => setLoading(false));
  }

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
        <h1 className="text-lg font-bold">Detail rekening</h1>
        <button
          onClick={toggle}
          aria-label={hidden ? "Tampilkan saldo" : "Sembunyikan saldo"}
          className="ml-auto grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-text"
        >
          {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </header>

      {/* Balance card */}
      <section
        className="relative mb-5 overflow-hidden rounded-3xl p-6 text-white"
        style={{
          background: account?.color || "rgb(var(--brand-strong))",
          boxShadow: "0 20px 40px -22px rgb(var(--shadow) / 0.5)",
        }}
      >
        <div className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/15 blur-2xl" />
        <div className="relative flex items-center gap-1.5">
          <p className="text-sm font-medium text-white/85">{account?.name ?? "…"}</p>
          {account?.isPrimary && <Star size={12} className="fill-white text-white" />}
        </div>
        <p className="relative mt-1 text-[2.3rem] font-extrabold leading-tight tracking-tight">
          {money(formatMoney(account?.currentBalance ?? 0))}
        </p>
        {account && (
          <p className="relative mt-1 text-xs capitalize text-white/70">{account.type.replace("_", " ")}</p>
        )}
      </section>

      {/* Search */}
      <div className="card mb-3 flex items-center gap-2 px-3.5 py-2.5">
        <Search size={17} className="shrink-0 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari di rekening ini…"
          className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
        />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Bersihkan" className="text-muted hover:text-text">
            <X size={16} />
          </button>
        )}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-muted">Riwayat transaksi</h2>
      <div className="card divide-y divide-border">
        {loading &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3.5">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-surface-2" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-surface-2" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-2" />
              </div>
            </div>
          ))}
        {!loading && items.length === 0 && (
          <p className="p-8 text-center text-sm text-muted">
            {query ? `Tidak ada hasil untuk "${query}".` : "Belum ada transaksi di rekening ini."}
          </p>
        )}
        {!loading &&
          items.map((t) => {
            const income = t.type === "income";
            const adj = t.type === "adjustment";
            const transfer = t.type === "transfer";
            const outgoing = transfer && t.accountId === id; // this account is the source
            return (
              <button
                key={t.id}
                onClick={() => setEditing(t)}
                className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-surface-2"
              >
                <TxIcon type={t.type} categoryIcon={t.categoryIcon} categoryColor={t.categoryColor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {transfer ? (t.description || "Transfer") : t.merchant || t.description || t.categoryName || t.type}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {transfer
                      ? outgoing
                        ? `ke ${t.transferAccountName ?? "?"} · ${formatDate(t.transactionDate)}`
                        : `dari ${t.accountName ?? "?"} · ${formatDate(t.transactionDate)}`
                      : `${t.categoryName ?? t.type} · ${formatDate(t.transactionDate)}`}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-bold ${
                    transfer ? (outgoing ? "text-expense" : "text-income") : income ? "text-income" : adj ? "text-muted" : "text-expense"
                  }`}
                >
                  {transfer ? money(`${outgoing ? "−" : "+"}${formatMoney(t.amount)}`) : money(formatMoney(t.amount, { sign: adj }))}
                </span>
              </button>
            );
          })}
      </div>

      {!loading && hasMore && (
        <button onClick={loadMore} disabled={loadingMore} className="btn-ghost mt-3 w-full">
          {loadingMore ? "Memuat…" : "Muat lebih"}
        </button>
      )}

      <EditTransactionSheet tx={editing} onClose={() => setEditing(null)} onSaved={reloadAfterEdit} />

      <BottomNav />
    </main>
  );
}
