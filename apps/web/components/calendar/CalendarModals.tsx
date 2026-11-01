"use client";

import Link from "next/link";
import { formatMinutes } from "@reservation/shared";
import { BookingCard } from "@/components/bookings/BookingCard";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import type { CalendarItem } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { itemTone } from "./tones";

/** The day (and the time) a click landed on. */
export interface Slot {
  date: string;
  from: number;
  to: number;
}

/**
 * What a click on a day or on an hour offers: the day's items, adding an event, and booking a space
 * (the booking form opens with the day and the time filled in). Booking is not offered for days that are over.
 */
export function SlotModal({
  slot,
  items,
  today,
  onClose,
  onItem,
  onAddEvent,
  onOpenDay,
}: {
  slot: Slot | null;
  items: CalendarItem[];
  today: string;
  onClose: () => void;
  onItem: (item: CalendarItem) => void;
  onAddEvent: (slot: Slot) => void;
  onOpenDay: (date: string) => void;
}) {
  const { t, locale } = useI18n();
  return (
    <Modal open={slot !== null} onClose={onClose} title={slot ? formatDate(slot.date, locale) : ""}>
      {slot && (
        <>
          {items.length > 0 && (
            <ul className="space-y-1.5">
              {items.map((item) => (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => onItem(item)}
                    className={cn("flex w-full items-center justify-between gap-3 rounded-lg border-l-4 px-3 py-2 text-left text-sm", itemTone(item.kind))}
                  >
                    <span className="min-w-0 truncate font-medium">{item.title}</span>
                    <span className="shrink-0 text-xs">{item.allDay ? t("calendar.allDay") : `${formatMinutes(item.from)} – ${formatMinutes(item.to)}`}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => onAddEvent(slot)}>
              <Icon name="plus" />
              {t("calendar.addEvent")}
            </Button>
            {slot.date >= today && (
              <Link
                href={`/reserver?date=${slot.date}&from=${slot.from}&to=${slot.to}`}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-100"
              >
                <Icon name="calendar-plus" />
                {t("calendar.bookSpace")}
              </Link>
            )}
            <Button variant="ghost" onClick={() => onOpenDay(slot.date)}>
              {t("calendar.openDay")}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}

/** One item in detail: a booking (with a link to manage it) or an event (with edit). */
export function ItemModal({ item, onClose, onEdit }: { item: CalendarItem | null; onClose: () => void; onEdit: (item: CalendarItem) => void }) {
  const { t, locale } = useI18n();
  return (
    <Modal open={item !== null} onClose={onClose} title={item?.kind === "booking" ? t("calendar.booking.details") : (item?.title ?? "")}>
      {item?.booking && (
        <>
          <BookingCard booking={item.booking} />
          <p className="text-sm text-slate-600">{t("calendar.booking.attendees", { count: item.booking.attendees })}</p>
          <Link
            href="/mes-reservations"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            {t("calendar.booking.manage")}
          </Link>
        </>
      )}
      {item?.event && (
        <>
          <p className="text-sm text-slate-600">
            {formatDate(item.event.date, locale)} · {item.event.allDay ? t("calendar.allDay") : `${formatMinutes(item.event.from)} – ${formatMinutes(item.event.to)}`}
          </p>
          {item.event.note && <p className="whitespace-pre-wrap text-sm text-slate-800">{item.event.note}</p>}
          <Button onClick={() => onEdit(item)}>
            <Icon name="pencil" />
            {t("common.edit")}
          </Button>
        </>
      )}
    </Modal>
  );
}
