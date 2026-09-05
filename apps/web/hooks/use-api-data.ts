"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface ApiDataState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/** Load data from an async fetcher with loading/error state and manual reload. */
export function useApiData<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Always call the latest fetcher without re-running the effect on identity.
  const fetcherRef = useRef(fetcher);
  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  // Guards against out-of-order responses when the fetch re-runs quickly.
  const runIdRef = useRef(0);

  const load = useCallback(async () => {
    const id = ++runIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current();
      if (id === runIdRef.current) setData(result);
    } catch (e: unknown) {
      if (id === runIdRef.current) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    } finally {
      if (id === runIdRef.current) setLoading(false);
    }
  }, []);

  // Fetching on mount / when deps change is the intended behavior here. The
  // setState calls live inside `load` (guarded against races), so the
  // set-state-in-effect warning is expected for this centralized data hook.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, ...deps]);

  return { data, loading, error, reload: load };
}
