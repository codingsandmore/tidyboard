"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: "light" | "dark";
  preference: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  preference: "system",
  setTheme: () => {},
  toggle: () => {},
});

const STORAGE_KEY = "tb-theme";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function resolveTheme(preference: Theme): "light" | "dark" {
  if (preference === "system") return getSystemTheme();
  return preference;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  // On mount: read localStorage, then resolve
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const pref: Theme =
      stored === "light" || stored === "dark" || stored === "system"
        ? stored
        : "system";
    setPreference(pref);
    setResolved(resolveTheme(pref));
  }, []);

  // Apply class to <html> whenever resolved changes
  useEffect(() => {
    const root = document.documentElement;
    if (resolved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [resolved]);

  // Listen to system prefers-color-scheme changes (only when preference === "system")
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setPreference((prev) => {
        if (prev === "system") {
          setResolved(e.matches ? "dark" : "light");
        }
        return prev;
      });
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setPreference(t);
    setResolved(resolveTheme(t));
    if (t === "system") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, t);
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(resolved === "dark" ? "light" : "dark");
  }, [resolved, setTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme: resolved, preference, setTheme, toggle }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/**
 * NoFlashScript — render inside <head> to synchronously apply the dark class
 * before any paint, preventing FOUC. This must be a plain script tag with
 * dangerouslySetInnerHTML; it cannot import modules.
 */
export function NoFlashScript() {
  const script = `(function(){try{var s=localStorage.getItem('tb-theme');var d=s==='dark'||(s!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;
  return (
    <script
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
