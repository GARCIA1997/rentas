'use client';

import { createContext, useCallback, useContext, useState, ReactNode } from 'react';

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
          <div className="absolute inset-0 bg-[#173A5F]/50" onClick={() => settle(false)} />
          {/* Markup portado de Stitch: design/stitch/modal-confirm.html */}
          <div className="bg-white relative w-full max-w-[342px] rounded-lg shadow-2xl border border-[#A7B0BB]/30 p-5 text-center animate-toast-in">
            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3.5 ${pending.destructive ? 'bg-[#FEE2E2]' : 'bg-[#2D9E6B]/15'}`}>
              <span className={`material-symbols-outlined text-[26px] ${pending.destructive ? 'text-[#DC2626]' : 'text-[#2D9E6B]'}`}>
                {pending.destructive ? 'delete' : 'help'}
              </span>
            </div>
            {pending.title && <h3 className="text-lg font-bold text-[#173A5F] tracking-tight mb-1.5">{pending.title}</h3>}
            <p className="text-xs text-[#43474E] leading-relaxed mb-5 px-1 font-medium">{pending.message}</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => settle(false)}
                className="h-10 px-3 bg-white text-[#173A5F] text-xs font-semibold rounded-lg border border-[#A7B0BB] hover:bg-[#F5F1E8]/60 active:scale-[0.98] transition-all flex items-center justify-center"
              >
                {pending.cancelLabel ?? 'Cancelar'}
              </button>
              <button
                type="button"
                onClick={() => settle(true)}
                className={`h-10 px-3 text-white text-xs font-bold rounded-lg shadow-sm active:scale-[0.98] transition-all flex items-center justify-center ${
                  pending.destructive ? 'bg-[#DC2626] hover:bg-red-700' : 'bg-[#2D9E6B] hover:bg-[#25855A]'
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
