"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/register", { name, email, password });
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pendaftaran gagal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <h1 className="mb-6 text-center text-2xl font-extrabold tracking-tight">Buat akun</h1>
      <form onSubmit={submit} className="card space-y-3 p-5">
        <div>
          <label className="label">Nama</label>
          <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        {error && <p className="text-sm text-expense">{error}</p>}
        <button className="btn-brand w-full" disabled={loading}>
          {loading ? "Mendaftar…" : "Daftar"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Sudah punya akun? <Link href="/login" className="text-brand">Masuk</Link>
      </p>
    </main>
  );
}
