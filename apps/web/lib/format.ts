import type { Timestamp } from "firebase/firestore";
import { addDays, type Locale } from "@reservation/shared";

/** "Tue 12 May" for "2026-05-12". Dates are calendar days, so no time zone is involved. */
export function formatDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function formatDateTime(value: Timestamp | null | undefined, locale: Locale): string {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(value.toDate());
}

export function formatPrice(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** Today's date in the browser's time zone, as YYYY-MM-DD. */
export function todayLocal(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** The first working day on or after today (weekends are skipped), for default search dates. */
export function nextWorkday(from = todayLocal()): string {
  let date = from;
  for (let i = 0; i < 3; i += 1) {
    const day = new Date(`${date}T00:00:00Z`).getUTCDay();
    if (day !== 0 && day !== 6) return date;
    date = addDays(date, 1);
  }
  return date;
}

/** Downloads text as a file (used for exports). */
export function downloadFile(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
