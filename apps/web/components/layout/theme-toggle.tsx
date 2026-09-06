"use client";

import { useEffect } from "react";
import { Moon, Sun } from "lucide-react";

import { usePersistentValue } from "@/lib/use-persistent-value";
import { cn } from "@/lib/utils";

/** Sidebar-footer theme switch. Persists to localStorage; defaults to dark. */
export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const [theme, setTheme] = usePersistentValue("mus-theme", "dark");
  const isLight = theme === "light";

  // Keep the DOM in sync with the stored theme (updating an external system —
  // the document class — is exactly what effects are for).
  useEffect(() => {
    document.documentElement.classList.toggle("light", isLight);
  }, [isLight]);

  return (
    <button
      type="button"
      onClick={() => setTheme(isLight ? "dark" : "light")}
      aria-label={isLight ? "Switch to dark theme" : "Switch to light theme"}
      title={isLight ? "Dark mode" : "Light mode"}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        collapsed ? "w-full justify-center px-0" : "w-full",
      )}
    >
      {isLight ? <Moon className="h-4 w-4 shrink-0" /> : <Sun className="h-4 w-4 shrink-0" />}
      {!collapsed ? <span className="truncate">{isLight ? "Dark mode" : "Light mode"}</span> : null}
    </button>
  );
}
