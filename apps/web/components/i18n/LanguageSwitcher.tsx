"use client";

import { useId } from "react";
import { isLocale, LOCALES, type Locale } from "@reservation/shared";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { rememberSignedOutChoice, saveProfileLocale } from "@/lib/i18n/profileLocale";

/**
 * Language picker. Applies the choice on this device immediately and saves it
 * on the profile (see lib/i18n/profileLocale.ts).
 * `compact` shows "FR" / "EN" for the app header.
 */
export function LanguageSwitcher({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const { profile } = useAuth();
  const id = useId();

  function change(next: Locale) {
    setLocale(next);
    if (!profile) rememberSignedOutChoice();
    else if (profile.locale !== next) saveProfileLocale(profile.id, next);
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <label htmlFor={id} className={compact ? "sr-only" : "text-sm text-slate-600"}>
        {t("language.label")}
      </label>
      <select
        id={id}
        value={locale}
        onChange={(e) => isLocale(e.target.value) && change(e.target.value)}
        className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm"
      >
        {LOCALES.map((l) => (
          // Each language is named in itself, so it can be found whatever the current language.
          <option key={l} value={l} lang={l}>
            {compact ? l.toUpperCase() : t(`language.${l}`)}
          </option>
        ))}
      </select>
    </div>
  );
}
