'use client';

import { useTheme } from '@/lib/themeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label="Cambiar tema"
      className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-canvas transition-colors text-heading"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
