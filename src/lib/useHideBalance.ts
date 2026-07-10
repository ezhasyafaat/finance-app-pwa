"use client";
import { useEffect, useState } from "react";

/**
 * Persisted "hide balance" preference. Stored in localStorage so it survives
 * refresh and logout (it's a device UI preference, not account data), and syncs
 * across mounted components / tabs via a custom event + the storage event.
 */
const KEY = "pf_hide_balance";
const EVT = "pf-hide-balance";
const MASK = "Rp ••••••";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function useHideBalance() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    setHidden(read());
    const sync = () => setHidden(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = () => {
    const next = !read();
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* storage unavailable — still flips for this session */
    }
    setHidden(next);
    window.dispatchEvent(new Event(EVT));
  };

  /** Format an amount, masking it when hidden. */
  const money = (formatted: string) => (hidden ? MASK : formatted);

  return { hidden, toggle, money, MASK };
}
