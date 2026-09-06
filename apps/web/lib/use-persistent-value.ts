"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "mus:persistent-change";

/**
 * A string value backed by localStorage, read via useSyncExternalStore so it
 * works with SSR and never calls setState inside an effect. Updates in the
 * current tab are broadcast with a custom event; other tabs use `storage`.
 */
export function usePersistentValue(
  key: string,
  fallback: string,
): readonly [string, (next: string) => void] {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const handler = (e: Event) => {
        if (e instanceof StorageEvent && e.key !== null && e.key !== key) return;
        onChange();
      };
      window.addEventListener("storage", handler);
      window.addEventListener(EVENT, handler);
      return () => {
        window.removeEventListener("storage", handler);
        window.removeEventListener(EVENT, handler);
      };
    },
    [key],
  );

  const getSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(key) ?? fallback;
    } catch {
      return fallback;
    }
  }, [key, fallback]);

  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setValue = useCallback(
    (next: string) => {
      try {
        localStorage.setItem(key, next);
      } catch {
        // ignore persistence failures
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  return [value, setValue] as const;
}
