"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/lib/api/client";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { groupByDay, move, viewTitle, visibleDays, type CalendarItem, type CalendarView as View } from "@/lib/calendar";
import { todayLocal } from "@/lib/format";
import { useNow } from "@/lib/hooks/useNow";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ItemModal, SlotModal, type Slot } from "./CalendarModals";
import { EventModal, type EventDraft } from "./EventModal";
import { MonthGrid } from "./MonthGrid";
import { TimeGrid } from "./TimeGrid";

const DEFAULT_FROM = 9 * 60;
const DEFAULT_TO = 17 * 60;
const HOUR = 60;

/**
 * The calendar of the signed-in person: their bookings, past and future, and their own events, by day, week
 * or month. Clicking a day or an hour offers to add an event or to book a space.
 */
export function CalendarView() {
  const { t, locale } = useI18n();
  const online = useOnlineStatus();
  const now = useNow();
  const today = todayLocal();
  const nowMinute = new Date(now).getHours() * 60 + new Date(now).getMinutes();

  const [view, setView] = useState<View>("month");
  const [anchor, setAnchor] = useState(today);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [item, setItem] = useState<CalendarItem | null>(null);
  const [draft, setDraft] = useState<EventDraft | null>(null);

  const days = useMemo(() => visibleDays(view, anchor), [view, anchor]);
  const range = useMemo(() => ({ from: days[0]!, to: days[days.length - 1]! }), [days]);
  const bookings = useCallableQuery("listMyBookingsInRange", api.listMyBookingsInRange, range);
  const events = useCallableQuery("listMyEvents", api.listMyEvents, range);
  const byDay = useMemo(() => groupByDay(bookings.data ?? [], events.data ?? []), [bookings.data, events.data]);
  const loading = bookings.loading || events.loading;
  const failed = (bookings.failed || events.failed) && !bookings.data && !events.data;

  const refetch = () => {
    bookings.refetch();
    events.refetch();
  };
  const dayItems = (date: string) => byDay.get(date) ?? [];
  const startOfDaySlot = (date: string): Slot => ({ date, from: DEFAULT_FROM, to: DEFAULT_TO });

  function openDay(date: string) {
    setSlot(null);
    setAnchor(date);
    setView("day");
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => setAnchor(today)}>
          {t("calendar.today")}
        </Button>
        <Button variant="ghost" size="sm" aria-label={t("calendar.previous")} onClick={() => setAnchor(move(view, anchor, -1))}>
          <span aria-hidden="true">‹</span>
        </Button>
        <Button variant="ghost" size="sm" aria-label={t("calendar.next")} onClick={() => setAnchor(move(view, anchor, 1))}>
          <span aria-hidden="true">›</span>
        </Button>
        <h2 aria-live="polite" className="min-w-0 flex-1 text-lg font-semibold capitalize text-slate-900">
          {viewTitle(view, anchor, locale)}
        </h2>
        <Button size="sm" disabled={!online} onClick={() => setDraft({ date: anchor, from: DEFAULT_FROM, to: DEFAULT_FROM + HOUR })}>
          <Icon name="plus" />
          {t("calendar.addEvent")}
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="[&>div]:mb-0">
          <Tabs
            value={view}
            onChange={setView}
            tabs={[
              { id: "day", label: t("calendar.views.day") },
              { id: "week", label: t("calendar.views.week") },
              { id: "month", label: t("calendar.views.month") },
            ]}
          />
        </div>
        <ul className="flex gap-4 text-xs text-slate-600" aria-label={t("calendar.legend")}>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-brand-600" />
            {t("calendar.legendBooking")}
          </li>
          <li className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-500" />
            {t("calendar.legendEvent")}
          </li>
        </ul>
      </div>

      {failed && <p role="alert" className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("calendar.loadFailed")}</p>}
      {loading && !bookings.data && !events.data ? (
        <Spinner />
      ) : view === "month" ? (
        <MonthGrid days={days} month={anchor} today={today} byDay={byDay} onDay={(date) => setSlot(startOfDaySlot(date))} onItem={setItem} />
      ) : (
        <TimeGrid
          days={days}
          today={today}
          nowMinute={nowMinute}
          byDay={byDay}
          onSlot={(date, minute) => setSlot({ date, from: minute, to: Math.min(minute + HOUR, 24 * 60) })}
          onItem={setItem}
          onDayHeader={view === "week" ? openDay : undefined}
        />
      )}

      <SlotModal
        slot={slot}
        items={slot ? dayItems(slot.date) : []}
        today={today}
        onClose={() => setSlot(null)}
        onItem={(picked) => {
          setSlot(null);
          setItem(picked);
        }}
        onAddEvent={(picked) => {
          setSlot(null);
          setDraft({ date: picked.date, from: picked.from, to: Math.min(picked.from + HOUR, 24 * 60) });
        }}
        onOpenDay={openDay}
      />
      <ItemModal
        item={item}
        onClose={() => setItem(null)}
        onEdit={(picked) => {
          setItem(null);
          if (picked.event) setDraft({ event: picked.event });
        }}
      />
      <EventModal draft={draft} onClose={() => setDraft(null)} onChanged={refetch} />
    </>
  );
}
