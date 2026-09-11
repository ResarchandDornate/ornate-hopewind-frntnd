"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  DARK_QUERY,
  DEFAULT_PREFERENCE,
  applyTheme,
  readStoredPreference,
  resolveTheme,
  storePreference,
  THEME_STORAGE_KEY,
} from "@/lib/theme";

const ThemeContext = createContext({
  preference: DEFAULT_PREFERENCE,
  theme: "dark",
  mounted: false,
  setPreference: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export default function ThemeProvider({ children }) {
  // Server-rendered markup must not depend on localStorage, so the state
  // starts at the neutral default and the pre-paint script in <head> keeps the
  // actual page from flashing while this catches up. `mounted` lets controls
  // hold back their icon until the real value is known, instead of hydrating
  // with a sun and swapping to a moon.
  const [preference, setPreferenceState] = useState(DEFAULT_PREFERENCE);
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = readStoredPreference();
    setPreferenceState(stored);
    setTheme(resolveTheme(stored));
    setMounted(true);
  }, []);

  // Apply on every change, including the first commit after mount. The script
  // in <head> already set the class; re-applying it is idempotent.
  useEffect(() => {
    if (mounted) applyTheme(theme);
  }, [mounted, theme]);

  // Follow the OS only while the user has not overridden it.
  useEffect(() => {
    if (preference !== "system" || typeof window === "undefined" || !window.matchMedia) return;
    const media = window.matchMedia(DARK_QUERY);
    const onChange = (event) => setTheme(event.matches ? "dark" : "light");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [preference]);

  // Keep a dashboard open in a second tab in step, rather than leaving it on
  // the old theme until it is reloaded.
  useEffect(() => {
    const onStorage = (event) => {
      if (event.key !== THEME_STORAGE_KEY) return;
      const next = readStoredPreference();
      setPreferenceState(next);
      setTheme(resolveTheme(next));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setPreference = useCallback((next) => {
    setPreferenceState(next);
    setTheme(resolveTheme(next));
    storePreference(next);
  }, []);

  // The quick toggle commits to an explicit light/dark preference: flipping
  // away from "system" and back on the next click would make the button a
  // no-op whenever the OS already matches.
  const toggleTheme = useCallback(() => {
    setPreference(resolveTheme(preference) === "dark" ? "light" : "dark");
  }, [preference, setPreference]);

  const value = useMemo(
    () => ({ preference, theme, mounted, setPreference, toggleTheme }),
    [preference, theme, mounted, setPreference, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
