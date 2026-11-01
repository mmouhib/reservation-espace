"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { readCached, writeCached } from "./cache";

export interface CallableQuery<O> {
  data: O | null;
  /** True until there is something to show (a saved copy or a first response) or the first attempt failed. */
  loading: boolean;
  /** True when the last network attempt failed; `data` is then the previous result, if any. */
  failed: boolean;
  /** True when `data` is a copy saved on this device rather than a response from this visit. */
  fromCache: boolean;
  /** When `data` was fetched from the server (epoch ms). */
  savedAt: number | null;
  refetch: () => void;
}

interface State<O> {
  key: string;
  data: O | null;
  loading: boolean;
  failed: boolean;
  fromCache: boolean;
  savedAt: number | null;
}

function blankState<O>(key: string): State<O> {
  return { key, data: null, loading: true, failed: false, fromCache: false, savedAt: null };
}

export interface CallableQueryOptions {
  /** Refresh interval while the tab is visible and online. */
  pollMs?: number;
}

/**
 * Reads data from a server endpoint, polls it while the page is visible,
 * and keeps the last response on the device so the page still works offline.
 * Pass `input: null` to wait (e.g. until a form value is known). `fn` must be stable
 * (the `api.*` wrappers are), or the query restarts on every render.
 */
export function useCallableQuery<I, O>(
  name: string,
  fn: (input: I) => Promise<O>,
  input: I | null,
  { pollMs = 20_000 }: CallableQueryOptions = {},
): CallableQuery<O> {
  const uid = useAuth().user?.uid;
  const inputJson = input === null ? null : JSON.stringify(input);
  // The uid is part of the key so cached data never crosses accounts on a shared device.
  const key = uid && inputJson !== null ? `${uid}:${name}:${inputJson}` : null;

  const [state, setState] = useState<State<O> | null>(null);
  const [tick, setTick] = useState(0);
  const refetch = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!key || inputJson === null) return;
    const requestInput = JSON.parse(inputJson) as I;
    let cancelled = false;
    let fresh = false;
    // Updates start from a blank state whenever the key changed since the last update.
    const patch = (next: Partial<State<O>>) =>
      setState((s) => ({ ...(s?.key === key ? s : blankState<O>(key)), ...next }));

    void readCached<O>(key).then((cached) => {
      if (cancelled || fresh || !cached) return;
      patch({ data: cached.data, savedAt: cached.savedAt, fromCache: true, loading: false });
    });

    const load = async () => {
      if (document.visibilityState !== "visible") return;
      if (!navigator.onLine) {
        patch({ loading: false, failed: true });
        return;
      }
      try {
        const data = await fn(requestInput);
        if (cancelled) return;
        fresh = true;
        patch({ data, loading: false, failed: false, fromCache: false, savedAt: Date.now() });
        void writeCached(key, data);
      } catch (err) {
        if (cancelled) return;
        console.warn(`${name} failed`, err);
        patch({ loading: false, failed: true });
      }
    };

    void load();
    const timer = setInterval(() => void load(), pollMs);
    const onWake = () => void load();
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, [key, inputJson, fn, name, pollMs, tick]);

  if (!key) return { data: null, loading: false, failed: false, fromCache: false, savedAt: null, refetch };
  if (!state || state.key !== key) return { data: null, loading: true, failed: false, fromCache: false, savedAt: null, refetch };
  return { data: state.data, loading: state.loading, failed: state.failed, fromCache: state.fromCache, savedAt: state.savedAt, refetch };
}
