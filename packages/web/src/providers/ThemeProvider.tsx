"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const THEME_COLOR_KEY = "karsafin_theme_color";
const THEME_MODE_KEY = "karsafin_theme_mode";
const DEFAULT_COLOR = "#2563eb";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  primaryColor: string;
  setPrimaryColor: (hex: string) => void;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [primaryColor, setPrimaryColorState] = useState(DEFAULT_COLOR);
  const [themeMode, setThemeModeState] = useState<ThemeMode>("light");

  const applyThemeMode = useCallback((mode: ThemeMode) => {
    const root = document.documentElement;
    root.classList.remove("dark");
    if (mode === "dark") {
      root.classList.add("dark");
    } else if (mode === "system") {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      }
    }
  }, []);

  const applyPrimaryColor = useCallback((hex: string) => {
    document.documentElement.style.setProperty("--color-dashboard-blue", hex);
  }, []);

  useEffect(() => {
    const savedColor = localStorage.getItem(THEME_COLOR_KEY);
    const savedMode = localStorage.getItem(THEME_MODE_KEY) as ThemeMode | null;

    const color = savedColor || DEFAULT_COLOR;
    setPrimaryColorState(color);
    applyPrimaryColor(color);

    if (savedMode) {
      setThemeModeState(savedMode);
      applyThemeMode(savedMode);
    }
  }, [applyPrimaryColor, applyThemeMode]);

  const setPrimaryColor = useCallback((hex: string) => {
    setPrimaryColorState(hex);
    applyPrimaryColor(hex);
    localStorage.setItem(THEME_COLOR_KEY, hex);
  }, [applyPrimaryColor]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    applyThemeMode(mode);
    localStorage.setItem(THEME_MODE_KEY, mode);
  }, [applyThemeMode]);

  return (
    <ThemeContext.Provider value={{ primaryColor, setPrimaryColor, themeMode, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
