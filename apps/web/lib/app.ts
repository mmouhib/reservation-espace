import { DEFAULT_LOCALE, MESSAGES } from "@reservation/shared";

const { app } = MESSAGES[DEFAULT_LOCALE];

/**
 * Build-time values for static metadata and the web app manifest, which cannot
 * follow the runtime language: they use the default locale. UI text goes through useI18n().
 */
export const APP = {
  name: app.name,
  shortName: app.shortName,
  description: app.description,
  themeColor: "#1d4ed8",
  backgroundColor: "#ffffff",
} as const;
