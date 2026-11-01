import type { CalendarItem } from "@/lib/calendar";

/** Colors of the two kinds of items: bookings in the brand blue, personal events in amber. */
export function itemTone(kind: CalendarItem["kind"]): string {
  return kind === "booking"
    ? "border-brand-600 bg-brand-100 text-brand-900 hover:bg-brand-100/70"
    : "border-amber-500 bg-amber-100 text-amber-900 hover:bg-amber-100/70";
}
