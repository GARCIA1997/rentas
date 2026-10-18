'use client';

import { ReactNode } from 'react';

export function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-[#0B1A2B]/55" onClick={onClose} />
      <div
        className="bg-surface relative w-full sm:max-w-lg sm:rounded-xl rounded-t-2xl shadow-xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-sheet-up sm:animate-none pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex sm:hidden justify-center pt-2.5 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-[#A7B0BB]/60" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h3 className="text-lg font-bold text-heading">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-heading text-xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
