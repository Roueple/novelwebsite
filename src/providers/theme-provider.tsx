// src/providers/theme-provider.tsx
"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'reading';
const THEME_STORAGE_KEY = 'novel-website-theme';
const THEME_ORDER: Theme[] = ['light', 'dark', 'reading'];
const DEFAULT_THEME: Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize state with a function to read from localStorage immediately
  const [theme, setThemeState] = useState<Theme>(() => {
     // Guard against SSR environment where localStorage is not available
     if (typeof window === 'undefined') {
         return DEFAULT_THEME;
     }
     try {
       const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
       return savedTheme && THEME_ORDER.includes(savedTheme) ? savedTheme : DEFAULT_THEME;
     } catch (error) {
       console.error("Error reading theme from localStorage during init:", error);
       return DEFAULT_THEME;
     }
  });
  const [isMounted, setIsMounted] = useState(false);

  // Apply theme class to documentElement and save to storage
  const applyTheme = useCallback((newTheme: Theme) => {
    if (!THEME_ORDER.includes(newTheme)) {
      console.warn(`Invalid theme value: ${newTheme}. Falling back to default.`);
      newTheme = DEFAULT_THEME;
    }
    const root = document.documentElement;
    // Remove old themes, add new one
    root.classList.remove(...THEME_ORDER);
    root.classList.add(newTheme);
    // Update state only if it's different
    setThemeState(current => current === newTheme ? current : newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (error) {
      console.error("Error saving theme to localStorage:", error);
    }
  }, []);

  // Effect to apply the theme class on initial mount and subsequent changes
   useEffect(() => {
     setIsMounted(true);
     // Apply the initial theme (read in useState) to the document
     applyTheme(theme);
   }, []); // Runs only once on mount

  // Cycle theme logic
  const cycleTheme = useCallback(() => {
    setThemeState(currentTheme => {
        const currentIndex = THEME_ORDER.indexOf(currentTheme);
        const nextTheme = THEME_ORDER[(currentIndex + 1) % THEME_ORDER.length];
        applyTheme(nextTheme); // Apply the theme immediately
        return nextTheme; // Update the state
    });
  }, [applyTheme]);

  // Direct set theme logic
  const setTheme = useCallback((newTheme: Theme) => {
      applyTheme(newTheme);
  }, [applyTheme]);

   // Only render children after mount to ensure theme is applied correctly
   // and avoid hydration mismatches related to theme classes.
   if (!isMounted) {
     // You can return null or a simple loader during this brief phase
     return null; // Or <>{children}</> if flashes are acceptable
   }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, cycleTheme }}>
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