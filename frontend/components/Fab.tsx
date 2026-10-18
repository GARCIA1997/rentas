'use client';

import Link from 'next/link';

// Botón flotante de acción principal (Stitch: verde, píldora, sombra teñida). En móvil se
// coloca por encima de la tab bar sumando su altura real + el área segura del iPhone
// (home indicator); con un `bottom-20` fijo quedaba medio tapado en iPhone.
const wrap = 'fixed right-4 z-40 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-6';
const btn =
  'inline-flex items-center gap-2 bg-[#2D9E6B] hover:bg-[#25855A] active:scale-95 text-white font-bold text-xs pl-3.5 pr-4 py-3 rounded-full shadow-lg shadow-[#2D9E6B]/30 transition-all';

export function Fab({ icon, label, href, onClick }: { icon: string; label: string; href?: string; onClick?: () => void }) {
  const content = (
    <>
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <span>{label}</span>
    </>
  );
  return (
    <div className={wrap}>
      {href ? (
        <Link href={href} className={btn}>
          {content}
        </Link>
      ) : (
        <button type="button" onClick={onClick} className={btn}>
          {content}
        </button>
      )}
    </div>
  );
}
