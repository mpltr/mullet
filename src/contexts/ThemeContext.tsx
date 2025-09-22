"use client";
import { useUserPreferences } from "../hooks/useDatabase";
import { useAuth } from "./AuthContext";
import { useEffect, useState, createContext, useContext } from "react";

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const { user } = useAuth();
  const { preferences, loading: preferencesLoading, updatePreferences } = useUserPreferences(user?.uid || "");
  const [theme, setThemeState] = useState<Theme>('system');
  const [hasLoadedFromFirebase, setHasLoadedFromFirebase] = useState(false);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    // Remove all theme-related classes first
    root.classList.remove('dark', 'light');
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      if (mediaQuery.matches) {
        root.classList.add('dark');
      }
      
      const handler = (e: MediaQueryListEvent) => {
        root.classList.remove('dark', 'light');
        if (e.matches) {
          root.classList.add('dark');
        }
      };
      
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else if (theme === 'dark') {
      root.classList.add('dark');
    }
    // For light theme, we don't add any class (default state)
    
  }, [theme]);

  // Load saved theme preference from Firebase
  useEffect(() => {
    if (user?.uid && !preferencesLoading && preferences && !hasLoadedFromFirebase) {
      if (preferences.theme) {
        console.log('🎨 Loading theme preference from Firebase:', preferences.theme);
        setThemeState(preferences.theme);
      }
      setHasLoadedFromFirebase(true);
    }
  }, [user?.uid, preferences, preferencesLoading, hasLoadedFromFirebase]);

  // Save theme changes to Firebase when theme state changes
  useEffect(() => {
    if (hasLoadedFromFirebase && theme && user?.uid && updatePreferences) {
      updatePreferences({ theme });
    }
  }, [theme, hasLoadedFromFirebase, user?.uid]); // Removed updatePreferences from deps

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
