export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-MX', { timeZone: 'UTC' });
}
