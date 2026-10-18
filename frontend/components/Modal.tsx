'use client';

import { ReactNode } from 'react';

// Hoja inferior de los diseños de Stitch (modal-*.html): overlay azul al 50 %, hoja blanca
// con asa gris, título azul y botón de cierre. En escritorio se centra como diálogo.
export function Modal({
  isOpen,
  onClose,
  title,
  eyebrow,
  subtitle,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Texto pequeño en mayúsculas sobre el título (p. ej. "Paso de confirmación"). */
  eyebrow?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-[#173A5F]/50 backdrop-blur-[1px]" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-[0_-8px_30px_rgba(23,58,95,0.25)] border-t border-[#A7B0BB]/30 max-h-[92vh] overflow-y-auto animate-sheet-up sm:animate-none pb-[env(safe-area-inset-bottom)]">
        {/* Asa de arrastre gris */}
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-[#A7B0BB]/60 rounded-full"></div>
        </div>
        <div className="px-5 pt-2 pb-6">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="min-w-0">
              {eyebrow && (
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#2D9E6B]"></span>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{eyebrow}</span>
                </div>
              )}
              <h2 className="text-xl font-bold text-[#173A5F] tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs text-[#A7B0BB] font-semibold mt-0.5">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="text-slate-400 hover:text-slate-600 p-1 -mr-1 rounded-full transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

// Clases de campos de formulario de los diseños de Stitch (modal-property.html, modal-pay.html).
export const fieldLabel = 'block text-xs font-bold text-[#173A5F] mb-1.5';
export const fieldInput =
  'w-full text-sm text-[#173A5F] placeholder-[#A7B0BB] bg-white border border-[#A7B0BB]/40 rounded-lg px-3 py-2.5 focus:outline-none focus:border-[#173A5F] focus:ring-1 focus:ring-[#173A5F] transition-all';
export const btnSecondary =
  'flex-1 py-3 px-4 rounded-lg border border-[#A7B0BB] bg-white text-sm font-bold text-[#173A5F] hover:bg-[#F5F1E8] active:scale-[0.98] transition-all text-center';
export const btnConfirm =
  'flex-1 py-3 px-4 rounded-lg bg-[#2D9E6B] hover:bg-[#25855a] text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:opacity-50';
export const btnDanger =
  'flex-1 py-3 px-4 rounded-lg bg-red-600 text-white text-sm font-bold shadow-sm hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed';
