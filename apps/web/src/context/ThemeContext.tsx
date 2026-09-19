import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'system';
    }
    return 'system';
  });
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>('dark');

  const updateResolvedTheme = useCallback((newTheme: Theme) => {
    let resolved: 'dark' | 'light';
    if (newTheme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } else {
      resolved = newTheme;
    }
    setResolvedTheme(resolved);
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(resolved);
  }, []);

  useEffect(() => {
    updateResolvedTheme(theme);
    localStorage.setItem('theme', theme);
  }, [theme, updateResolvedTheme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateResolvedTheme('system');
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, updateResolvedTheme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      if (prev === 'dark') return 'light';
      if (prev === 'light') return 'system';
      return 'dark';
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}