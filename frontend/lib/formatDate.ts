// "1 jun 2026" en vez de "1/6/2026": el formato numérico se confunde fácil entre
// día/mes. UTC porque las fechas de pago/contrato se guardan a medianoche UTC.
export function formatDate(isoDate: string): string {
  return new Date(isoDate)
    .toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .replace('.', '');
}
