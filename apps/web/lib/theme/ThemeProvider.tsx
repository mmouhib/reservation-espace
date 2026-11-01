"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { APP } from "@/lib/app";

export type ThemeMode = "system" | "light" | "dark";
type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
/** Browser toolbar color (the installed app's title bar, the phone's status bar). */
const BROWSER_COLORS: Record<Theme, string> = { light: APP.themeColor, dark: "#0f172a" };

interface ThemeContextValue {
  /** The choice of the user: follow the device, or force one theme. */
  mode: ThemeMode;
  /** What is displayed. */
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system"; // storage blocked (private window)
  }
}

function resolve(mode: ThemeMode): Theme {
  return mode === "system" ? (matchMedia(DARK_QUERY).matches ? "dark" : "light") : mode;
}

// The choice lives in localStorage; components read it through useSyncExternalStore and are told about changes here.
const listeners = new Set<() => void>();
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const device = matchMedia(DARK_QUERY);
  device.addEventListener("change", listener); // the device's setting changed (matters while following it)
  window.addEventListener("storage", listener); // the choice was changed in another tab
  return () => {
    listeners.delete(listener);
    device.removeEventListener("change", listener);
    window.removeEventListener("storage", listener);
  };
}

/**
 * Keeps `data-theme` on <html> in step with the choice. The first paint is handled by the inline script
 * of app/layout.tsx, so there is no flash of the wrong theme; this takes over once the page is running.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const mode = useSyncExternalStore(subscribe, readMode, (): ThemeMode => "system");
  const theme = useSyncExternalStore(subscribe, () => resolve(readMode()), (): Theme => "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BROWSER_COLORS[theme]);
  }, [theme]);

  const setMode = useCallback((next: ThemeMode) => {
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // not remembered after this visit
    }
    listeners.forEach((listener) => listener());
  }, []);

  const value = useMemo(() => ({ mode, theme, setMode }), [mode, theme, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
