"use client";

import { useEffect, useRef } from "react";
import { isLocale } from "@reservation/shared";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getLocale, useI18n } from "@/lib/i18n/I18nProvider";
import { saveProfileLocale, takeSignedOutChoice } from "@/lib/i18n/profileLocale";

/**
 * Keeps the UI language and the profile in step (see lib/i18n/profileLocale.ts).
 * Only reacts when the profile value changes, so a local switch is never undone
 * while its profile write is in flight.
 */
export function ProfileLocaleSync() {
  const { profile } = useAuth();
  const { setLocale } = useI18n();
  const uid = profile?.id;
  const saved = profile?.locale;
  const applied = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || !isLocale(saved) || saved === applied.current) return;
    const firstLoad = applied.current === null;
    const current = getLocale();
    if (firstLoad && takeSignedOutChoice() && current !== saved) {
      applied.current = current;
      saveProfileLocale(uid, current);
      return;
    }
    applied.current = saved;
    setLocale(saved);
  }, [uid, saved, setLocale]);

  return null;
}
