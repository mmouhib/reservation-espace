"use client";

import { createContext, Fragment, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import {
  createTranslator,
  DEFAULT_LOCALE,
  isLocale,
  type Locale,
  type MessageKey,
  type MessageValues,
  type Translator,
} from "@reservation/shared";

// ---------- Locale store ----------
// The choice is kept in localStorage (per device, works signed out and offline)
// and mirrored on the user's profile by LanguageSwitcher / ProfileLocaleSync.

const STORAGE_KEY = "locale";
const listeners = new Set<() => void>();
/** Fallback when localStorage is unavailable, so switching still works for this page view. */
let memoryLocale: Locale | null = null;

function readStored(): Locale | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return isLocale(value) ? value : null;
  } catch {
    return null;
  }
}

function detectBrowserLocale(): Locale {
  for (const tag of navigator.languages ?? [navigator.language]) {
    const base = tag.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** The active locale: explicit choice, else the browser's language, else French. */
export function getLocale(): Locale {
  return memoryLocale ?? readStored() ?? detectBrowserLocale();
}

export function setLocale(locale: Locale): void {
  memoryLocale = locale;
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage unavailable: memoryLocale keeps the choice for this page view.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  // Keep tabs in sync when the language is changed in another one.
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return;
    memoryLocale = null;
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

// Pages are prerendered in the default locale; the stored or detected locale
// is applied right after hydration, so the server snapshot never mismatches.
const getServerLocale = () => DEFAULT_LOCALE;

// ---------- Context ----------

export type RichTags = Record<string, (text: string) => ReactNode>;

interface I18nContextValue extends Translator {
  setLocale: (locale: Locale) => void;
  /** Renders a message containing `<tag>…</tag>` parts with the given renderers. */
  rich: (key: MessageKey, tags: RichTags, values?: MessageValues) => ReactNode;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const locale = useSyncExternalStore(subscribe, getLocale, getServerLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    const translator = createTranslator(locale);
    return {
      ...translator,
      setLocale,
      rich: (key, tags, values) =>
        translator.parts(key, values).map((part, i) => {
          const render = part.tag ? tags[part.tag] : undefined;
          return <Fragment key={i}>{render ? render(part.text) : part.text}</Fragment>;
        }),
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
