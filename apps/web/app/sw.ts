/// <reference lib="esnext" />
/// <reference lib="webworker" />
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
const APP_ROUTES = [
  "/",
  "/connexion",
  "/reserver",
  "/mes-reservations",
  "/equipe",
  "/credits",
  "/support",
  "/notifications",
  "/profil",
  "/admin",
  "/admin/utilisateurs",
  "/admin/organisation",
  "/admin/espaces",
  "/admin/reservations",
  "/admin/credits",
  "/admin/support",
  "/admin/statistiques",
  "/admin/audit",
];

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

// Other origins (Google sign-in) and the server's API are left to the browser: sign-in
// requests must not be proxied, and API answers belong to the signed-in user, so they are
// never cached (the app keeps its own offline copy, see lib/api/cache.ts).
// Registered first so Serwist never sees them.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) event.stopImmediatePropagation();
});

serwist.addEventListeners();

// ---------- Web Push ----------
// The server sends { title, body, link }, already in the user's language (profile `locale`).
self.addEventListener("push", (event) => {
  const data = (event.data?.json() ?? {}) as { title?: string; body?: string; link?: string };
  event.waitUntil(
    self.registration.showNotification(data.title ?? APP.name, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      data: { link: data.link ?? "/" },
    }),
  );
});

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
