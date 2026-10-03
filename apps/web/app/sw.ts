/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { ExpirationPlugin, NetworkFirst, Serwist, StaleWhileRevalidate } from "serwist";
import { APP } from "@/lib/app";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const PAGES_CACHE = "pages";

/**
 * App routes warmed into the pages cache at install time, so every screen of the
 * app shell opens offline even if it was never visited. They are still served
 * network-first when online.
 */
const APP_ROUTES = ["/", "/connexion", "/reserver", "/mes-reservations", "/profil", "/admin", "/admin/utilisateurs"];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  // Keep the new worker waiting so the app can offer "Nouvelle version disponible".
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      // React Server Component payloads used by client-side navigation.
      matcher: ({ request, url }) => request.headers.get("RSC") === "1" || url.pathname.endsWith(".txt"),
      handler: new NetworkFirst({
        cacheName: "pages-rsc",
        networkTimeoutSeconds: 3,
        plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 7 * 24 * 3600 })],
      }),
    },
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({
        cacheName: PAGES_CACHE,
        networkTimeoutSeconds: 3,
        // Static export: /espace?id=a and /espace?id=b are the same HTML shell.
        matchOptions: { ignoreSearch: true },
        plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 30 * 24 * 3600 })],
      }),
    },
    {
      matcher: ({ request }) => request.destination === "image",
      handler: new StaleWhileRevalidate({
        cacheName: "images",
        plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 30 * 24 * 3600 })],
      }),
    },
    {
      matcher: ({ request }) => request.destination === "font",
      handler: new StaleWhileRevalidate({
        cacheName: "fonts",
        plugins: [new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 3600 })],
      }),
    },
    {
      matcher: ({ request }) => request.destination === "script" || request.destination === "style",
      handler: new StaleWhileRevalidate({ cacheName: "static-resources" }),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGES_CACHE)
      .then((cache) => cache.addAll(APP_ROUTES))
      // Warming is best-effort: a failed route must not block installation.
      .catch(() => undefined),
  );
});

// Sent by the "Recharger" button of the update toast (see PwaProvider).
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

// Firebase APIs (Firestore, Auth, Functions, Storage) and any other origin are left to
// the browser: proxying them breaks Firestore's streaming WebChannel, and Firestore has
// its own offline cache in IndexedDB. Registered first so Serwist never sees them.
self.addEventListener("fetch", (event) => {
  if (new URL(event.request.url).origin !== self.location.origin) event.stopImmediatePropagation();
});

serwist.addEventListeners();

// ---------- Firebase Cloud Messaging (background) ----------
// Merged into this worker so that a single service worker is registered.
// The client passes this registration to getToken().

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Push needs a real project (FCM is not emulated).
if (firebaseConfig.messagingSenderId && firebaseConfig.appId) {
  const messaging = getMessaging(initializeApp(firebaseConfig));

  // The server sends data-only messages ({ title, body, link }), already in the
  // user's language (profile `locale`), so display is handled here.
  onBackgroundMessage(messaging, (payload) => {
    const data = payload.data ?? {};
    void self.registration.showNotification(data.title ?? APP.name, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: data.tag,
      data: { link: data.link ?? "/" },
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data?.link as string | undefined) ?? "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const existing = windows.find((w) => w.url === target) ?? windows[0];
      if (existing) {
        return existing.focus().then((w) => (w.url === target ? w : w.navigate(target)));
      }
      return self.clients.openWindow(target);
    }),
  );
});
