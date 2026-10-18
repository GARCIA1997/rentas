'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';
import { AlertTriangleIcon, InfoIcon } from './icons';

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
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-[#0B1A2B]/55" onClick={() => settle(false)} />
          {/* Diálogo centrado (kit): ícono circular según intención, título azul. */}
          <div className="bg-surface relative w-full max-w-sm rounded-xl shadow-xl p-6 text-center animate-toast-in">
            <span
              className={`mx-auto mb-3 w-12 h-12 rounded-full flex items-center justify-center ${
                pending.destructive ? 'bg-red-100 dark:bg-red-900/30' : 'bg-accent/15'
              }`}
            >
              {pending.destructive ? (
                <AlertTriangleIcon className="w-6 h-6 text-red-600 dark:text-red-400" />
              ) : (
                <InfoIcon className="w-6 h-6 text-accent" />
              )}
            </span>
            {pending.title && <h3 className="text-lg font-bold text-heading mb-1">{pending.title}</h3>}
            <p className="text-sm text-muted leading-snug mb-5">{pending.message}</p>

            <div className="flex gap-3">
              <button
                onClick={() => settle(false)}
                className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-heading border border-line hover:bg-canvas transition-colors"
              >
                {pending.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                onClick={() => settle(true)}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${
                  pending.destructive ? 'bg-red-600 hover:bg-red-700' : 'bg-accent hover:brightness-110'
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
