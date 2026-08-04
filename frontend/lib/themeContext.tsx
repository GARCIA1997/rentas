'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export type ThemePreference = 'light' | 'dark' | 'system';
type AppliedTheme = 'light' | 'dark';

interface ThemeContextType {
  preference: ThemePreference;
  appliedTheme: AppliedTheme;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const resolveApplied = (pref: ThemePreference): AppliedTheme => {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return pref;
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [appliedTheme, setAppliedTheme] = useState<AppliedTheme>('light');

  useEffect(() => {
    const saved = (localStorage.getItem('theme') as ThemePreference | null) ?? 'system';
    setPreferenceState(saved);
    const applied = resolveApplied(saved);
    setAppliedTheme(applied);
    document.documentElement.classList.toggle('dark', applied === 'dark');

    if (saved === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => {
        const next = e.matches ? 'dark' : 'light';
        setAppliedTheme(next);
        document.documentElement.classList.toggle('dark', next === 'dark');
      };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, []);

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    localStorage.setItem('theme', pref);
    const applied = resolveApplied(pref);
    setAppliedTheme(applied);
    document.documentElement.classList.toggle('dark', applied === 'dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, appliedTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
