import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'KsaRed',
    short_name: 'KsaRed',
    description: 'Sistema de gestión de renta de casas habitación y locales comerciales',
    start_url: '/',
    display: 'standalone',
    // La app es de uso móvil en retrato: los listados, el tab bar inferior y sobre todo
    // el marco de captura del INE están diseñados para vertical, y en horizontal el
    // marco queda tan chico que la lectura se degrada. Esto sólo lo respeta el navegador
    // cuando la PWA está instalada (display standalone); en una pestaña normal no hay
    // forma de bloquear la rotación, así que el layout sigue siendo responsive.
    orientation: 'portrait',
    background_color: '#F5F1E8',
    theme_color: '#173A5F',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
