"use client";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useUserPreferences } from "../hooks/useDatabase";
import { useAuth } from "./AuthContext";
import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

interface ThemeProviderProps {
  children: React.ReactNode;
}

// Inner component to sync theme with Firebase preferences
function ThemeSync() {
  const { user } = useAuth();
  const { preferences, updatePreferences } = useUserPreferences(user?.uid || '');
  const { theme, setTheme } = useTheme();
  const isInitialLoad = useRef(true);

  // Debug logging
  useEffect(() => {
    console.log('🎨 ThemeSync state:', {
      userExists: !!user,
      userId: user?.uid,
      theme,
      preferencesTheme: preferences?.theme,
      isInitialLoad: isInitialLoad.current
    });
  }, [user, theme, preferences]);

  // Load saved theme preference on app start (only for authenticated users)
  useEffect(() => {
    if (user?.uid && preferences?.theme && isInitialLoad.current) {
      console.log('🎨 Loading theme preference from Firebase:', preferences.theme);
      setTheme(preferences.theme);
      isInitialLoad.current = false;
    }
  }, [user?.uid, preferences?.theme, setTheme]);

  // Save theme changes to Firebase (but not on initial load, and only for authenticated users)
  useEffect(() => {
    if (!isInitialLoad.current && theme && user?.uid && updatePreferences) {
      console.log('🎨 Saving theme preference to Firebase:', theme);
      updatePreferences({ theme: theme as 'light' | 'dark' | 'system' });
    }
  }, [theme, updatePreferences, user?.uid]);

  return null;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="data-theme"
      defaultTheme="system"
      enableSystem={true}
      disableTransitionOnChange={true}
    >
      <ThemeSync />
      {children}
    </NextThemesProvider>
  );
}