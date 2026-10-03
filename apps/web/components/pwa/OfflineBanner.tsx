"use client";

import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

export function OfflineBanner() {
  const online = useOnlineStatus();
  return (
    <div role="status" aria-live="polite">
      {!online && (
        <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
          Vous êtes hors ligne. Les données affichées proviennent du cache ; les réservations sont indisponibles.
        </p>
      )}
    </div>
  );
}
