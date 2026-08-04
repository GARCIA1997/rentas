'use client';

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';
import { CheckCircleIcon, XCircleIcon, InfoIcon } from './icons';

export type ToastVariant = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<ToastVariant, { icon: typeof CheckCircleIcon; iconClass: string }> = {
  success: { icon: CheckCircleIcon, iconClass: 'text-emerald-600 dark:text-emerald-400' },
  error: { icon: XCircleIcon, iconClass: 'text-red-600 dark:text-red-400' },
  info: { icon: InfoIcon, iconClass: 'text-primary' },
};

const AUTO_DISMISS_MS = 5000;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { icon: Icon, iconClass } = VARIANT_STYLES[toast.variant];

  return (
    <div className="glass-chrome pointer-events-auto flex items-start gap-3 rounded-2xl px-4 py-3.5 w-full animate-toast-in">
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconClass}`} />
      <p className="flex-1 text-sm text-heading leading-snug">{toast.message}</p>
      <button
        onClick={onDismiss}
        className="shrink-0 text-muted hover:text-heading w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors -mt-0.5 -mr-1"
        aria-label="Cerrar"
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev, { id, message, variant }]);
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-0 inset-x-0 z-[70] flex flex-col items-center gap-2 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pointer-events-none sm:items-end sm:pr-6 sm:pt-6">
        {toasts.map((toast) => (
          <div key={toast.id} className="w-full sm:w-96">
            <ToastItem toast={toast} onDismiss={() => dismiss(toast.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
