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
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-surface w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl max-h-[92vh] sm:max-h-[90vh] overflow-y-auto animate-sheet-up sm:animate-none pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex sm:hidden justify-center pt-2.5 pb-1">
          <div className="w-10 h-1.5 rounded-full bg-black/15 dark:bg-white/20" />
        </div>
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 dark:border-white/10">
          <h3 className="text-lg font-semibold text-heading">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-heading text-xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-canvas"
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
