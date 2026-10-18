'use client';

import { createContext, useCallback, useContext, useRef, useState, ReactNode } from 'react';

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

// Toasts de Stitch (design/stitch/toasts.html): tarjeta blanca, barra lateral de 4px e ícono en círculo tenue.
const VARIANT_STYLES: Record<ToastVariant, { icon: string; title: string; circle: string; bar: string }> = {
  success: { icon: 'check_circle', title: 'Listo', circle: 'bg-[#2D9E6B]/15 text-[#2D9E6B]', bar: 'bg-[#2D9E6B]' },
  error: { icon: 'error', title: 'Algo salió mal', circle: 'bg-[#D32F2F]/15 text-[#D32F2F]', bar: 'bg-[#D32F2F]' },
  info: { icon: 'info', title: 'Aviso', circle: 'bg-[#173A5F]/10 text-[#173A5F]', bar: 'bg-[#173A5F]' },
};

const AUTO_DISMISS_MS = 5000;

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const v = VARIANT_STYLES[toast.variant];
  return (
    <div className="bg-white rounded-lg shadow-md border border-[#E2DDD2] flex items-stretch overflow-hidden pointer-events-auto w-full animate-toast-in">
      <div className={`w-1 flex-shrink-0 ${v.bar}`}></div>
      <div className="p-3 flex items-start space-x-2.5 flex-1 min-w-0">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${v.circle}`}>
          <span className="material-symbols-outlined text-[18px]">{v.icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-[#173A5F]">{v.title}</p>
          <p className="text-[11px] text-[#475569] leading-snug mt-0.5">{toast.message}</p>
        </div>
        <button onClick={onDismiss} className="text-[#73777f] hover:text-[#173A5F] p-0.5 transition active:scale-90 flex-shrink-0" aria-label="Cerrar">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>
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
