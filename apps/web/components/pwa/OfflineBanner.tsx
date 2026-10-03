"use client";

import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function OfflineBanner() {
  const online = useOnlineStatus();
  const { t } = useI18n();
  return (
    <div role="status" aria-live="polite">
      {!online && (
        <p className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
          {t("pwa.offlineBanner")}
        </p>
      )}
    </div>
  );
}
