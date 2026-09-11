/**
 * Theme preference storage.
 *
 * Three preferences, two themes: "system" is a preference, not a theme — it
 * resolves against the OS at read time and keeps tracking it afterwards, which
 * is why the resolved value is never what gets persisted.
 */

export const THEME_STORAGE_KEY = "krishnabox.theme";

export const THEME_PREFERENCES = ["light", "dark", "system"];

/**
 * Dark is the default rather than "system": the dashboard is designed for a
 * control room and a wall display, where a white page at 3am is the wrong
 * answer even on a machine set to a light desktop theme. "System" stays one
 * click away in Settings for anyone who wants it to follow the OS.
 */
export const DEFAULT_PREFERENCE = "dark";

export const DARK_QUERY = "(prefers-color-scheme: dark)";

export function systemTheme() {
  if (typeof window === "undefined" || !window.matchMedia) return "light";
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** Collapse a preference to the theme actually painted. */
export function resolveTheme(preference) {
  return preference === "dark" || preference === "light" ? preference : systemTheme();
}

export function readStoredPreference() {
  if (typeof window === "undefined") return DEFAULT_PREFERENCE;
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_PREFERENCES.includes(stored) ? stored : DEFAULT_PREFERENCE;
  } catch {
    // Private-mode Safari and blocked third-party storage both throw here.
    // A missing preference is not an error worth surfacing — fall back.
    return DEFAULT_PREFERENCE;
  }
}

export function storePreference(preference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Non-fatal: the theme still applies for this page load.
  }
}

/** Paint the theme onto <html>. Also the body of the pre-hydration script. */
export function applyTheme(theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  // Drives the UA-painted bits — form controls, the scrollbar gutter, and the
  // canvas colour before our own CSS lands.
  root.style.colorScheme = theme;
}

/**
 * Runs in <head> before first paint, so a dark-theme user never sees a white
 * flash while React hydrates. Duplicates applyTheme rather than importing it:
 * this string is inlined into the document, not bundled.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY
)});if(p!=="light"&&p!=="dark"&&p!=="system")p=${JSON.stringify(
  DEFAULT_PREFERENCE
)};var d=p==="dark"||(p==="system"&&window.matchMedia(${JSON.stringify(
  DARK_QUERY
)}).matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
