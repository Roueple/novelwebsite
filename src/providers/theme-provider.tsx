// src/providers/theme-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'reading';
const THEME_STORAGE_KEY = 'novel-website-theme';
const THEME_ORDER: Theme[] = ['light', 'dark', 'reading'];
const DEFAULT_THEME: Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void; // Allow direct setting
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME);
  const [isMounted, setIsMounted] = useState(false); // Prevent hydration mismatch

  // Load theme from storage on mount
  useEffect(() => {
    let initialTheme = DEFAULT_THEME;
    try {
      const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (savedTheme && THEME_ORDER.includes(savedTheme)) {
        initialTheme = savedTheme;
      }
    } catch (error) {
      console.error("Error reading theme from localStorage:", error);
    }
    setThemeState(initialTheme);
    setIsMounted(true); // Indicate component has mounted
  }, []);

  // Apply theme class to documentElement and save to storage
  const applyTheme = useCallback((newTheme: Theme) => {
    if (!THEME_ORDER.includes(newTheme)) {
      console.warn(`Invalid theme value: ${newTheme}. Falling back to default.`);
      newTheme = DEFAULT_THEME;
    }
    // Remove old themes, add new one
    document.documentElement.classList.remove(...THEME_ORDER);
    document.documentElement.classList.add(newTheme);
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error("Error saving theme to localStorage:", error);
    }
  }, []);

  // Apply theme on initial load and when theme state changes
  useEffect(() => {
     if (isMounted) { // Only apply after initial state is set from storage
        applyTheme(theme);
     }
  }, [theme, applyTheme, isMounted]);


  const cycleTheme = useCallback(() => {
    const currentIndex = THEME_ORDER.indexOf(theme);
    const newTheme = THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length];
    applyTheme(newTheme);
  }, [theme, applyTheme]);

  // Provide direct setTheme function
  const setTheme = useCallback((newTheme: Theme) => {
      applyTheme(newTheme);
  }, [applyTheme]);


  // Return skeleton or null during server render / hydration phase
  if (!isMounted) {
    // Render children directly without context during SSR/initial mount
    // Or return a loader if preferred
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
      {/* No wrapper div needed as class is applied to documentElement */}
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}