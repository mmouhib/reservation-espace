"use client";

import type { MessageKey } from "@reservation/shared";
import { useI18n } from "@/lib/i18n/I18nProvider";

/**
 * Translated document title. Static `metadata.title` cannot follow the language
 * chosen at runtime, so pages render a <title>, which React hoists into <head>.
 * Without a key, the title is the app name.
 */
export function DocumentTitle({ titleKey }: { titleKey?: MessageKey }) {
  const { t } = useI18n();
  return <title>{titleKey ? `${t(titleKey)} · ${t("app.shortName")}` : t("app.name")}</title>;
}
