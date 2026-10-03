import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions, type Functions } from "firebase/functions";
import { connectStorageEmulator, getStorage, type FirebaseStorage } from "firebase/storage";

export const FUNCTIONS_REGION = "europe-west1";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === "true";
const EMULATOR_HOST = process.env.NEXT_PUBLIC_EMULATOR_HOST ?? "127.0.0.1";

export interface FirebaseClients {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  functions: Functions;
  storage: FirebaseStorage;
  /** True when Firestore uses the persistent IndexedDB cache (offline support). */
  persistentCache: boolean;
}

let clients: FirebaseClients | null = null;

function createFirestore(app: FirebaseApp): { db: Firestore; persistentCache: boolean } {
  try {
    const db = initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
    return { db, persistentCache: true };
  } catch (err) {
    // IndexedDB unavailable (e.g. some private browsing modes): fall back to memory.
    console.warn("Firestore persistence unavailable, using memory cache", err);
    return { db: initializeFirestore(app, { localCache: memoryLocalCache() }), persistentCache: false };
  }
}

/**
 * Lazily creates the Firebase clients. Browser-only: pages are prerendered at
 * build time (static export), so never call this at module scope.
 */
export function getFirebase(): FirebaseClients {
  if (typeof window === "undefined") throw new Error("getFirebase() must be called in the browser");
  if (clients) return clients;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const { db, persistentCache } = createFirestore(app);
  const functions = getFunctions(app, FUNCTIONS_REGION);
  const storage = getStorage(app);

  if (USE_EMULATORS) {
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
    connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
    connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);
    connectStorageEmulator(storage, EMULATOR_HOST, 9199);
  }

  clients = { app, auth, db, functions, storage, persistentCache };
  return clients;
}
