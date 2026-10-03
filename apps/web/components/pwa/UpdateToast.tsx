"use client";

import { Button } from "@/components/ui/Button";
import { usePwa } from "./PwaProvider";

export function UpdateToast() {
  const { updateAvailable, applyUpdate, dismissUpdate } = usePwa();

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 md:bottom-6"
    >
      {updateAvailable && (
        <div className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-lg">
          <p className="flex-1 text-sm">Nouvelle version disponible.</p>
          <Button size="sm" variant="ghost-inverse" onClick={dismissUpdate}>
            Plus tard
          </Button>
          <Button size="sm" onClick={applyUpdate}>
            Recharger
          </Button>
        </div>
      )}
    </div>
  );
}
