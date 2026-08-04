'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { AlertTriangleIcon } from './icons';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

type ConfirmInput = string | ConfirmOptions;

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (input: ConfirmInput) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  const confirm = useCallback((input: ConfirmInput) => {
    const options: ConfirmOptions = typeof input === 'string' ? { message: input } : input;
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  const settle = (result: boolean) => {
    pending?.resolve(result);
    setPending(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => settle(false)} />
          <div className="glass-chrome relative w-full sm:max-w-sm rounded-t-[28px] sm:rounded-[28px] p-6 animate-sheet-up sm:animate-none pb-[calc(env(safe-area-inset-bottom)+1.5rem)] sm:pb-6">
            <div className="flex sm:hidden justify-center -mt-2 mb-3">
              <div className="w-10 h-1.5 rounded-full bg-black/15 dark:bg-white/20" />
            </div>

            <div className="flex items-start gap-3 mb-5">
              {pending.destructive && (
                <span className="shrink-0 w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </span>
              )}
              <div className="min-w-0">
                {pending.title && <h3 className="text-heading font-semibold mb-1 tracking-tight">{pending.title}</h3>}
                <p className="text-sm text-muted leading-snug">{pending.message}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => settle(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-muted bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.07] dark:hover:bg-white/[0.1] transition-colors"
              >
                {pending.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                onClick={() => settle(true)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${
                  pending.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-pressed'
                }`}
              >
                {pending.confirmLabel ?? 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx.confirm;
}
