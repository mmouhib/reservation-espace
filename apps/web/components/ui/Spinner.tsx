"use client";

import { useI18n } from "@/lib/i18n/I18nProvider";

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div role="status" className="flex items-center justify-center gap-3 p-8 text-slate-600">
      <span
        aria-hidden="true"
        className="size-6 animate-spin rounded-full border-2 border-slate-300 border-t-brand-700"
      />
      <span className="text-sm">{label ?? t("common.loading")}</span>
    </div>
  );
}
