"use client";
import { useCallback, useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { api } from "@/lib/apiClient";
import { formatMoney, formatDate } from "@/lib/utils";
import type { RecentTransaction } from "@/types";
import BottomNav from "@/components/BottomNav";
import EditTransactionSheet from "@/components/EditTransactionSheet";
import TxIcon from "@/components/TxIcon";

type Filter = "all" | "income" | "expense";
const PAGE = 20;

export default function TransactionsPage() {
  const [items, setItems] = useState<RecentTransaction[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState(""); // debounced value actually sent
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [editing, setEditing] = useState<RecentTransaction | null>(null);

  // debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    async (offset: number) => {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("type", filter);
      if (query) params.set("search", query);
      params.set("limit", String(PAGE));
      params.set("offset", String(offset));
      return api.get<RecentTransaction[]>(`/api/transactions?${params.toString()}`);
    },
    [filter, query],
  );

  // reset + first page whenever filter/query changes
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
    setLoading(true);
    fetchPage(0)
      .then((rows) => { setItems(rows); setHasMore(rows.length === PAGE); })
      .finally(() => setLoading(false));
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <h1 className="mb-4 text-2xl font-extrabold tracking-tight">Aktivitas</h1>

      {/* Search */}
      <div className="card mb-3 flex items-center gap-2 px-3.5 py-2.5">
        <Search size={17} className="shrink-0 text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari keterangan atau nominal…"
          className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
        />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Bersihkan" className="text-muted hover:text-text">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter segment */}
      <div className="mb-4 grid grid-cols-3 gap-1 rounded-2xl border border-border bg-surface p-1">
        {(["all", "expense", "income"] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-xl py-2 text-sm font-semibold transition-colors ${filter === f ? "bg-brand text-white shadow-sm" : "text-muted hover:text-text"}`}
          >
            {f === "all" ? "Semua" : f === "expense" ? "Keluar" : "Masuk"}
          </button>
        ))}
      </div>

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
            {query ? `Tidak ada hasil untuk "${query}".` : "Tidak ada transaksi."}
          </p>
        )}
        {!loading &&
          items.map((t) => {
            const income = t.type === "income";
            const adj = t.type === "adjustment";
            return (
              <button
                key={t.id}
                onClick={() => setEditing(t)}
                className="flex w-full items-center gap-3 p-3.5 text-left transition-colors hover:bg-surface-2"
              >
                <TxIcon type={t.type} categoryIcon={t.categoryIcon} categoryColor={t.categoryColor} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{t.merchant || t.description || t.categoryName || t.type}</p>
                  <p className="truncate text-xs text-muted">
                    {t.categoryName ?? t.type} · {t.accountName} · {formatDate(t.transactionDate)}
                  </p>
                </div>
                <span className={`shrink-0 font-bold ${income ? "text-income" : adj ? "text-muted" : "text-expense"}`}>
                  {formatMoney(t.amount, { sign: adj })}
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
