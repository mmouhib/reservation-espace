"use client";

import { onSnapshot, type DocumentReference, type Query } from "firebase/firestore";
import { useEffect, useState } from "react";

export type WithId<T> = T & { id: string };

interface Live<T> {
  data: T;
  loading: boolean;
  /** True when the query failed (for example because of missing permissions). */
  failed: boolean;
}

/**
 * Live results of a Firestore query. Results come from the offline cache when there
 * is no network. Memoize the query with useMemo so it is not re-subscribed on every render.
 * Pass null to wait (for example until the user is known).
 */
export function useCollection<T>(query: Query | null): Live<WithId<T>[]> {
  const [state, setState] = useState<Live<WithId<T>[]>>({ data: [], loading: true, failed: false });

  useEffect(() => {
    if (!query) return;
    return onSnapshot(
      query,
      (snap) => setState({ data: snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) })), loading: false, failed: false }),
      (err) => {
        console.warn("Query failed", err);
        setState({ data: [], loading: false, failed: true });
      },
    );
  }, [query]);

  return query ? state : { data: [], loading: false, failed: false };
}

/** Live value of one document, or null when it does not exist. */
export function useDocument<T>(ref: DocumentReference | null): Live<WithId<T> | null> {
  const [state, setState] = useState<Live<WithId<T> | null>>({ data: null, loading: true, failed: false });

  useEffect(() => {
    if (!ref) return;
    return onSnapshot(
      ref,
      (snap) => setState({ data: snap.exists() ? { id: snap.id, ...(snap.data() as T) } : null, loading: false, failed: false }),
      (err) => {
        console.warn("Document failed", err);
        setState({ data: null, loading: false, failed: true });
      },
    );
  }, [ref]);

  return ref ? state : { data: null, loading: false, failed: false };
}
