/**
 * Last successful callable responses, kept in IndexedDB so pages that read through
 * Cloud Functions still show data offline (Firestore's own cache does this for
 * direct reads). Every operation is best-effort: private browsing or blocked
 * storage simply means no offline copy.
 */

const DB_NAME = "callable-cache";
const STORE = "responses";

export interface CachedResponse<T> {
  data: T;
  savedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = op(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function readCached<T>(key: string): Promise<CachedResponse<T> | null> {
  try {
    return ((await run("readonly", (s) => s.get(key))) as CachedResponse<T> | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function writeCached<T>(key: string, data: T): Promise<void> {
  try {
    await run("readwrite", (s) => s.put({ data, savedAt: Date.now() } satisfies CachedResponse<T>, key));
  } catch (err) {
    console.warn("Could not cache response", err);
  }
}

/** Removes every cached response, e.g. on sign-out so the next user of the device sees nothing. */
export async function clearCallableCache(): Promise<void> {
  try {
    await run("readwrite", (s) => s.clear());
  } catch (err) {
    console.warn("Could not clear the response cache", err);
  }
}
