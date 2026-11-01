import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT } from "./config";

// Firebase Auth is the only Firebase service used: it checks the sign-in tokens, and stores each
// person's role (a custom claim). The Auth emulator needs no credentials: the Admin SDK talks to it
// when FIREBASE_AUTH_EMULATOR_HOST is set.
function projectId(): string {
  const id = FIREBASE_PROJECT_ID();
  if (id) return id;
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) return "demo-reservation-espace";
  throw new Error("FIREBASE_PROJECT_ID is not set");
}

if (getApps().length === 0) {
  const serviceAccount = FIREBASE_SERVICE_ACCOUNT();
  initializeApp({ projectId: projectId(), ...(serviceAccount ? { credential: cert(JSON.parse(serviceAccount)) } : {}) });
}

export const auth = getAuth();
