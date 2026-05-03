"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastTone = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
};

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastContextValue = {
  showToast: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function toastIcon(tone: ToastTone) {
  if (tone === "success") return <CheckCircle2 size={18} />;
  if (tone === "error") return <XCircle size={18} />;
  return <Info size={18} />;
}

function toastToneClass(tone: ToastTone) {
  if (tone === "success") return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
  if (tone === "error") return "border-red-400/30 bg-red-500/10 text-red-100";
  return "border-[var(--app-accent)]/30 bg-[var(--app-accent-soft)] text-[var(--foreground)]";
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((toast: ToastInput) => {
    const id = crypto.randomUUID();
    const nextToast: Toast = {
      id,
      title: toast.title,
      description: toast.description,
      tone: toast.tone || "info",
    };

    setToasts((current) => [nextToast, ...current].slice(0, 4));
    window.setTimeout(() => dismissToast(id), 3200);
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[10000] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={["pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl animate-[fadeIn_.15s_ease-out]", toastToneClass(toast.tone)].join(" ")}
            role={toast.tone === "error" ? "alert" : "status"}
          >
            <div className="flex gap-3">
              <div className="mt-0.5 shrink-0">{toastIcon(toast.tone)}</div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold">{toast.title}</div>
                {toast.description && <div className="mt-1 text-xs text-current/75">{toast.description}</div>}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded-lg p-1 text-current/70 transition hover:bg-white/10 hover:text-current"
              >
                <X size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => {},
    } satisfies ToastContextValue;
  }
  return context;
}
