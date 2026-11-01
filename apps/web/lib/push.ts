import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { firebaseConfig, getFirebase, USE_EMULATORS } from "./client";

/** FCM is not emulated and needs a real project with a VAPID key. */
export async function isPushAvailable(): Promise<boolean> {
  if (USE_EMULATORS || !firebaseConfig.messagingSenderId || !process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) return false;
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return false;
  return isSupported();
}

/**
 * Asks for notification permission and returns an FCM token bound to our
 * single Serwist service worker (Firebase never registers its own worker).
 * Token storage in users/{uid}/devices is wired in phase 3.
 */
export async function requestPushToken(): Promise<string | null> {
  if (!(await isPushAvailable())) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.ready;
  return getToken(getMessaging(getFirebase().app), {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
}
