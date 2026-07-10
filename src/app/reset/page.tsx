"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/apiClient";

function ResetForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("Password minimal 6 karakter.");
    if (password !== confirm) return setError("Konfirmasi password tidak cocok.");
    setLoading(true);
    try {
      await api.post("/api/auth/reset", { token, password });
      setDone(true);
      setTimeout(() => router.replace("/login"), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengatur ulang password.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="card p-5 text-center text-sm text-muted">
        Link reset tidak valid.{" "}
        <Link href="/forgot" className="text-brand">Minta link baru</Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card p-5 text-center text-sm">
        Password berhasil diperbarui. Mengalihkan ke halaman masuk…
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-3 p-5">
      <div>
        <label className="label">Password baru</label>
        <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      </div>
      <div>
        <label className="label">Ulangi password</label>
        <input className="field" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={6} />
      </div>
      {error && <p className="text-sm text-expense">{error}</p>}
      <button className="btn-brand w-full" disabled={loading}>{loading ? "Menyimpan…" : "Atur ulang password"}</button>
      <Link href="/login" className="block text-center text-sm text-muted hover:text-text">Kembali ke masuk</Link>
    </form>
  );
}

export default function ResetPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <h1 className="mb-6 text-center text-2xl font-extrabold tracking-tight">Atur ulang password</h1>
      <Suspense fallback={<div className="card p-5 text-center text-sm text-muted">Memuat…</div>}>
        <ResetForm />
      </Suspense>
    </main>
  );
}
