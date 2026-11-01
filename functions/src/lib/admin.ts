import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

if (getApps().length === 0) initializeApp();

export const auth = getAuth();
