import { FirebaseError } from "firebase/app";
import { httpsCallable } from "firebase/functions";
import type { BootstrapProfileResult, SetUserRoleInput } from "@reservation/shared";
import { getFirebase } from "@/lib/firebase/client";

/** Typed wrappers over callable Cloud Functions. */

function callable<I, O>(name: string) {
  return async (input: I): Promise<O> => {
    const fn = httpsCallable<I, O>(getFirebase().functions, name);
    const res = await fn(input);
    return res.data;
  };
}

export const api = {
  bootstrapProfile: callable<Record<string, never>, BootstrapProfileResult>("bootstrapProfile"),
  setUserRole: callable<SetUserRoleInput, { changed: boolean }>("setUserRole"),
  runDirectorySyncNow: callable<Record<string, never>, { checked: number; disabled: string[] }>("runDirectorySyncNow"),
};

const FALLBACK_MESSAGES: Record<string, string> = {
  "functions/unauthenticated": "Votre session a expiré. Veuillez vous reconnecter.",
  "functions/permission-denied": "Vous n'avez pas les droits nécessaires.",
  "functions/resource-exhausted": "Trop de requêtes, réessayez dans quelques instants.",
  "functions/unavailable": "Service indisponible. Vérifiez votre connexion.",
  "functions/internal": "Une erreur interne est survenue.",
  "auth/popup-closed-by-user": "La fenêtre de connexion a été fermée.",
  "auth/network-request-failed": "Connexion réseau impossible.",
  "auth/invalid-credential": "Identifiants invalides.",
  "auth/user-disabled": "Ce compte a été désactivé.",
};

/** Human-readable French message for Firebase errors. Server messages are already in French. */
export function errorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    if (err.code.startsWith("functions/") && err.message && err.code !== "functions/internal") return err.message;
    return FALLBACK_MESSAGES[err.code] ?? "Une erreur est survenue.";
  }
  return "Une erreur est survenue.";
}
