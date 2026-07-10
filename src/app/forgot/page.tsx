"use client";
import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/apiClient";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post<{ ok: boolean; resetToken?: string }>("/api/auth/forgot", { email });
      setSent(true);
      // Only present when the server runs with RESET_ECHO=1 (self-host convenience).
      if (r.resetToken) setDevLink(`/reset?token=${r.resetToken}`);
    } catch {
      setSent(true); // never reveal whether the email exists
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6">
      <h1 className="mb-2 text-center text-2xl font-extrabold tracking-tight">Lupa password</h1>
      <p className="mb-6 text-center text-sm text-muted">
        Masukkan email akunmu. Kalau terdaftar, kami kirim link untuk atur ulang password.
      </p>

      {sent ? (
        <div className="card space-y-3 p-5 text-center">
          <p className="text-sm">Kalau email terdaftar, link reset sudah dikirim. Cek kotak masuk.</p>
          {devLink && (
            <Link href={devLink} className="block text-sm font-medium text-brand">
              Buka link reset (mode self-host)
            </Link>
          )}
          <Link href="/login" className="block text-sm text-muted hover:text-text">Kembali ke masuk</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-3 p-5">
          <div>
            <label className="label">Email</label>
            <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button className="btn-brand w-full" disabled={loading}>
            {loading ? "Mengirim…" : "Kirim link reset"}
          </button>
          <Link href="/login" className="block text-center text-sm text-muted hover:text-text">Kembali ke masuk</Link>
        </form>
      )}
    </main>
  );
}
