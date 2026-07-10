"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AlertTriangle, HelpCircle, Check, X, Info } from "lucide-react";

interface ConfirmOpts {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}
type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; msg: string; type: ToastType; }

interface UICtx {
  confirm: (o: ConfirmOpts) => Promise<boolean>;
  toast: (msg: string, type?: ToastType) => void;
}

const Ctx = createContext<UICtx | null>(null);

export function useUI(): UICtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUI must be used inside <UIProvider>");
  return c;
}

export default function UIProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const confirm = useCallback(
    (o: ConfirmOpts) => new Promise<boolean>((resolve) => setDialog({ ...o, resolve })),
    [],
  );

  const toast = useCallback((msg: string, type: ToastType = "success") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  return (
    <Ctx.Provider value={{ confirm, toast }}>
      {children}

      {/* Confirm dialog */}
      {dialog && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={() => close(false)}
        >
          <div
            className="animate-pop w-full max-w-sm rounded-t-3xl border-t border-border bg-surface p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:rounded-3xl sm:border sm:pb-5"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="mb-3 flex items-start justify-between">
              <span
                className={`grid h-11 w-11 place-items-center rounded-2xl ${
                  dialog.danger ? "bg-expense/12 text-expense" : "bg-brand/12 text-brand"
                }`}
              >
                {dialog.danger ? <AlertTriangle size={22} /> : <HelpCircle size={22} />}
              </span>
              <button onClick={() => close(false)} aria-label="Tutup" className="rounded-full p-1.5 text-muted hover:bg-surface-2">
                <X size={18} />
              </button>
            </div>
            <h2 className="text-lg font-bold tracking-tight">{dialog.title ?? "Konfirmasi"}</h2>
            {dialog.message && <p className="mt-1 text-sm text-muted">{dialog.message}</p>}
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button onClick={() => close(false)} className="btn-ghost">
                {dialog.cancelLabel ?? "Batal"}
              </button>
              <button onClick={() => close(true)} className={dialog.danger ? "btn-danger" : "btn-brand"} autoFocus>
                {dialog.confirmLabel ?? "Ya"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[70] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-fade-up pointer-events-auto flex max-w-sm items-center gap-2 rounded-full border border-border bg-surface px-4 py-2.5 text-sm font-medium shadow-lg"
          >
            <span
              className={`grid h-5 w-5 place-items-center rounded-full text-white ${
                t.type === "success" ? "bg-income" : t.type === "error" ? "bg-expense" : "bg-brand"
              }`}
            >
              {t.type === "error" ? <X size={12} /> : t.type === "info" ? <Info size={12} /> : <Check size={12} />}
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
