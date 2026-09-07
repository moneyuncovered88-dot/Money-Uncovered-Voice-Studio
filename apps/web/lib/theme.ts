export type ThemeChoice = "dark" | "light" | "system";

export const THEME_KEY = "mus-theme";

/** Whether the light palette should be active for a given stored choice. */
export function effectiveIsLight(theme: string): boolean {
  if (theme === "light") return true;
  if (theme === "system") {
    try {
      return window.matchMedia("(prefers-color-scheme: light)").matches;
    } catch {
      return false;
    }
  }
  return false; // "dark" and unknown values default to dark
}

/** Apply the resolved theme to the document root. Safe to call anywhere. */
export function applyThemeClass(theme: string): void {
  try {
    document.documentElement.classList.toggle("light", effectiveIsLight(theme));
  } catch {
    // document unavailable (SSR) — the inline head script handles first paint
  }
}
