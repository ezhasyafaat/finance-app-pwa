"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, ImageUp } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { ReceiptDraft } from "@/types";
import TransactionSheet from "@/components/TransactionSheet";
import BottomNav from "@/components/BottomNav";

// Downscale before upload to keep the base64 payload small.
async function toDataUrl(file: File, maxDim = 1400): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", 0.8);
}

export default function ScanPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReceiptDraft | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const dataUrl = await toDataUrl(file);
      setPreview(dataUrl);
      const d = await api.post<ReceiptDraft>("/api/ai/receipt", { image: dataUrl });
      setDraft(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal membaca struk.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <h1 className="mb-1 text-2xl font-extrabold tracking-tight">Scan Struk</h1>
      <p className="mb-5 text-sm text-muted">Foto struk, AI akan membaca merchant, tanggal, item, dan total.</p>

      <div className="card flex flex-col items-center justify-center gap-4 p-8">
        {preview ? (
          <img src={preview} alt="preview" className="max-h-64 rounded-xl object-contain" />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-xl border-2 border-dashed border-border text-muted">
            <Camera size={40} />
          </div>
        )}

        {loading && (
          <p className="flex items-center gap-2 text-sm text-muted">
            <Loader2 size={16} className="animate-spin" /> Membaca struk…
          </p>
        )}
        {error && <p className="text-sm text-expense">{error}</p>}

        <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        <div className="grid w-full grid-cols-2 gap-2">
          <button onClick={() => inputRef.current?.click()} className="btn-brand">
            <Camera size={18} /> Foto
          </button>
          <button
            onClick={() => { if (inputRef.current) { inputRef.current.removeAttribute("capture"); inputRef.current.click(); } }}
            className="btn-ghost"
          >
            <ImageUp size={18} /> Galeri
          </button>
        </div>
      </div>

      <TransactionSheet
        draft={draft}
        onClose={() => setDraft(null)}
        onSaved={() => { setDraft(null); router.push("/"); }}
      />

      <BottomNav />
    </main>
  );
}
