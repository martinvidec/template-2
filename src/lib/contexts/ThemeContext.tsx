"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { usePathname } from 'next/navigation';

// Export the Theme type
export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// applyTheme now accepts pathname
const applyTheme = (theme: Theme, pathname: string): 'light' | 'dark' => {
  let effectiveTheme: 'light' | 'dark';

  // Force dark mode for the login page
  if (pathname === '/login') {
    console.log("Applying forced dark theme for /login");
    effectiveTheme = 'dark';
  } else if (theme === 'system') {
    effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } else {
    effectiveTheme = theme;
  }

  // Apply the class to the html element
  if (effectiveTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  return effectiveTheme;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const pathname = usePathname();

  // Effect to apply theme based on state and path initially and on path change
  useEffect(() => {
    const initialResolvedTheme = applyTheme(theme, pathname);
    setResolvedTheme(initialResolvedTheme);
  // Dependencies: theme state AND pathname
  }, [theme, pathname]); 

  // Listen for system theme changes only if theme is 'system' AND not on login page
  useEffect(() => {
    if (theme !== 'system' || pathname === '/login') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
       // Re-apply system theme, considering the current path (which is not /login here)
      const newResolvedTheme = applyTheme('system', pathname);
      setResolvedTheme(newResolvedTheme);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  // Dependencies: theme state AND pathname
  }, [theme, pathname]); 

  const setTheme = useCallback((newTheme: Theme) => {
    try {
      // Store the user's explicit choice, even if /login forces dark visually
      localStorage.setItem('theme', newTheme);
      setThemeState(newTheme);
      // applyTheme is now handled by the state update useEffect
    } catch (error) {
      console.error("Failed to set theme in localStorage", error);
    }
  // No pathname dependency needed here, as the effect listening to [theme, pathname] handles application
  }, []); 

  const contextValue: ThemeContextType = {
    theme,       // The user's preference (light, dark, system)
    setTheme,    // Function to set the preference
    resolvedTheme // The currently applied theme (light or dark), considering /login override
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 