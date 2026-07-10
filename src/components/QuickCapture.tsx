"use client";
import { useState } from "react";
import { Sparkles, CornerDownLeft } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { TransactionDraft } from "@/types";
import TransactionSheet from "./TransactionSheet";

export default function QuickCapture({ onSaved }: { onSaved?: () => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TransactionDraft | null>(null);

  async function parse() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const d = await api.post<TransactionDraft>("/api/ai/parse", { text });
      setDraft(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="card flex items-center gap-2 p-2 pl-4">
        <Sparkles size={18} className="shrink-0 text-brand" />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && parse()}
          placeholder="Ketik transaksi…"
          className="flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-muted"
        />
        <button onClick={parse} disabled={loading} className="btn-brand px-3 py-2">
          {loading ? "…" : <CornerDownLeft size={18} />}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-expense">{error}</p>}

      <TransactionSheet
        draft={draft}
        onClose={() => setDraft(null)}
        onSaved={() => {
          setDraft(null);
          setText("");
          onSaved?.();
        }}
      />
    </div>
  );
}
