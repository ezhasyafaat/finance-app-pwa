"use client";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Light/dark switch. Reads the class set by the no-FOUC script in layout.tsx,
 * persists the choice to localStorage. Default (unset) is light.
 */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    setMounted(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable — theme still applies for the session */
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Aktifkan mode terang" : "Aktifkan mode gelap"}
      className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-text ${className}`}
    >
      {/* avoid hydration mismatch: render neutral until mounted */}
      {mounted && dark ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
