"use client";

import { useCallback, useEffect, useRef } from "react";

/** Returns a debounced version of `callback` that fires after `delay` ms idle. */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number,
) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cb = useRef(callback);

  // Keep the latest callback without changing the debounced function identity.
  useEffect(() => {
    cb.current = callback;
  });

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(
    (...args: A) => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => cb.current(...args), delay);
    },
    [delay],
  );
}
