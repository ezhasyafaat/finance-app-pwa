"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/login", { email, password });
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <div className="mb-8 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt="PGN Kaya"
          className="mx-auto mb-3 h-20 w-20"
          style={{ filter: "drop-shadow(0 12px 24px rgb(var(--brand-strong) / 0.35))" }}
        />
        <h1 className="text-2xl font-extrabold tracking-tight">PGN Kaya</h1>
        <p className="text-sm text-muted">Catat transaksi dalam &lt; 10 detik.</p>
      </div>
      <form onSubmit={submit} className="card space-y-3 p-5">
        <div>
          <label className="label">Email</label>
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-expense">{error}</p>}
        <button className="btn-brand w-full" disabled={loading}>
          {loading ? "Masuk…" : "Masuk"}
        </button>
      </form>
      <p className="mt-3 text-center text-sm">
        <Link href="/forgot" className="text-muted hover:text-text">Lupa password?</Link>
      </p>
      <p className="mt-3 text-center text-sm text-muted">
        Belum punya akun? <Link href="/register" className="text-brand">Daftar</Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted">Demo: demo@finance.app / password123</p>
    </main>
  );
}
