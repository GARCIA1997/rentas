// Isotipo + logotipo de KSARED. El kit entrega el logotipo sólo como PNG opaco (fondo
// marfil), que no sirve sobre tarjetas ni en modo oscuro; por eso se compone aquí: el
// isotipo vectorial (geometría del kit, 01_Isotipo) + el texto en Montserrat ("Ksar" en
// el color de marca, "ed" en verde).
export function Isotipo({ className = 'h-8 w-auto' }: { className?: string }) {
  return (
    <svg viewBox="40 40 305 262" className={className} aria-hidden="true">
      <path d="M50 49 L130 130 L130 222 L50 292 Z" className="fill-[#173A5F] dark:fill-[#F5F1E8]" />
      <path d="M137 130 L220 49 L315 49 L137 224 Z" fill="#DDD9CF" className="dark:opacity-60" />
      <path d="M153 214 L208 162 L333 292 L229 292 Z" fill="#2D9E6B" />
    </svg>
  );
}

export function BrandLogo({
  size = 'md',
  onDark = false,
}: {
  size?: 'sm' | 'md' | 'lg';
  onDark?: boolean;
}) {
  const sizes = { sm: ['h-6', 'text-lg'], md: ['h-8', 'text-2xl'], lg: ['h-14', 'text-5xl'] } as const;
  const [iconH, textSize] = sizes[size];
  const inkClass = onDark ? 'text-white' : 'text-[#173A5F] dark:text-[#F5F1E8]';
  return (
    <span className="inline-flex items-center gap-2" aria-label="Ksared">
      {onDark ? (
        <svg viewBox="40 40 305 262" className={`${iconH} w-auto`} aria-hidden="true">
          <path d="M50 49 L130 130 L130 222 L50 292 Z" fill="#F5F1E8" />
          <path d="M137 130 L220 49 L315 49 L137 224 Z" fill="#DDD9CF" opacity="0.6" />
          <path d="M153 214 L208 162 L333 292 L229 292 Z" fill="#2D9E6B" />
        </svg>
      ) : (
        <Isotipo className={`${iconH} w-auto`} />
      )}
      <span className={`font-bold tracking-tight leading-none ${textSize} ${inkClass}`}>
        Ksar<span className="text-[#2D9E6B]">ed</span>
      </span>
    </span>
  );
}
