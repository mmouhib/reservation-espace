import type { Metadata } from "next";
import { RetryButton } from "./RetryButton";

export const metadata: Metadata = { title: "Hors ligne" };

/** Precached fallback served by the service worker for pages that are not in the cache. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="max-w-md text-center">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="mx-auto size-14 text-slate-400" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path d="M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.8M19 12.9a10 10 0 0 0-2.3-1.7M1.4 9a16 16 0 0 1 4.7-2.9M22.6 9A16 16 0 0 0 11 4.1M12 20h.01" strokeLinecap="round" />
        </svg>
        <h1 className="mt-4 text-2xl font-bold">Vous êtes hors ligne</h1>
        <p className="mt-2 text-slate-600">
          Cette page n&apos;est pas disponible sans connexion. Vos réservations déjà consultées restent accessibles.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <a
            href="/mes-reservations"
            className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-100"
          >
            Mes réservations
          </a>
          <RetryButton />
        </div>
      </div>
    </main>
  );
}
