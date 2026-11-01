"use client";

import { formatMinutes } from "@reservation/shared";
import { cn } from "@/lib/cn";
import { placeItems, weekdayNames, type CalendarItem } from "@/lib/calendar";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { itemTone } from "./tones";

const HOUR_PX = 48;
const DEFAULT_START = 7 * 60;
const DEFAULT_END = 21 * 60;
/** A click in the grid starts an item on the nearest half hour. */
const SNAP_MINUTES = 30;

/** Hours of a day (and of a week) as rows, with the items of each day placed on them. */
export function TimeGrid({
  days,
  today,
  nowMinute,
  byDay,
  onSlot,
  onItem,
  onDayHeader,
}: {
  days: string[];
  today: string;
  nowMinute: number;
  byDay: Map<string, CalendarItem[]>;
  /** An empty spot was clicked: the day and the time (minutes since midnight). */
  onSlot: (date: string, minute: number) => void;
  onItem: (item: CalendarItem) => void;
  /** The heading of a day was clicked (the week view opens that day). */
  onDayHeader?: (date: string) => void;
}) {
  const { t, locale } = useI18n();
  const names = weekdayNames(locale);
  const timed = days.flatMap((date) => (byDay.get(date) ?? []).filter((item) => !item.allDay));
  const allDay = days.some((date) => (byDay.get(date) ?? []).some((item) => item.allDay));

  // Shows 07:00 to 21:00, and more when an item falls outside.
  const start = Math.max(0, Math.min(DEFAULT_START, ...timed.map((i) => Math.floor(i.from / 60) * 60)));
  const end = Math.min(24 * 60, Math.max(DEFAULT_END, ...timed.map((i) => Math.ceil(i.to / 60) * 60)));
  const hours = Array.from({ length: (end - start) / 60 }, (_, i) => start + i * 60);
  const height = ((end - start) / 60) * HOUR_PX;
  const columns = { gridTemplateColumns: `3.5rem repeat(${days.length}, minmax(0, 1fr))` };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <div style={{ minWidth: days.length > 1 ? "46rem" : undefined }}>
        <div className="grid border-b border-slate-200 bg-slate-50" style={columns}>
          <div />
          {days.map((date) => {
            const weekday = names[(new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7];
            const label = (
              <>
                <span className="block text-xs font-medium text-slate-600">{weekday}</span>
                <span className={cn("mx-auto mt-0.5 flex size-8 items-center justify-center rounded-full text-base", date === today ? "bg-brand-700 font-semibold text-white" : "text-slate-900")}>
                  {Number(date.slice(8))}
                </span>
              </>
            );
            return onDayHeader ? (
              <button key={date} type="button" onClick={() => onDayHeader(date)} className="py-2 text-center hover:bg-slate-100">
                {label}
              </button>
            ) : (
              <div key={date} className="py-2 text-center">
                {label}
              </div>
            );
          })}
        </div>

        {allDay && (
          <div className="grid border-b border-slate-200" style={columns}>
            <div className="p-1 text-right text-[11px] text-slate-500">{t("calendar.allDay")}</div>
            {days.map((date) => (
              <div key={date} className="space-y-0.5 border-l border-slate-100 p-1">
                {(byDay.get(date) ?? [])
                  .filter((item) => item.allDay)
                  .map((item) => (
                    <button key={item.key} type="button" onClick={() => onItem(item)} className={cn("block w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-xs", itemTone(item.kind))}>
                      {item.title}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        )}

        <div className="grid" style={columns}>
          <div className="relative" style={{ height }}>
            {hours.map((minute, index) => (
              <span key={minute} className="absolute right-2 -translate-y-1/2 text-[11px] text-slate-500" style={{ top: index * HOUR_PX, display: index === 0 ? "none" : undefined }}>
                {formatMinutes(minute)}
              </span>
            ))}
          </div>
          {days.map((date) => {
            const placed = placeItems((byDay.get(date) ?? []).filter((item) => !item.allDay));
            return (
              <div
                key={date}
                className="relative cursor-pointer border-l border-slate-100"
                style={{
                  height,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, var(--color-slate-100) ${HOUR_PX - 1}px, var(--color-slate-100) ${HOUR_PX}px)`,
                }}
                onClick={(e) => {
                  const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
                  const minute = start + Math.floor(((y / HOUR_PX) * 60) / SNAP_MINUTES) * SNAP_MINUTES;
                  onSlot(date, Math.min(minute, 24 * 60 - 60));
                }}
              >
                {placed.map(({ item, lane, lanes }) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onItem(item);
                    }}
                    className={cn("absolute overflow-hidden rounded border-l-4 px-1.5 py-0.5 text-left text-xs", itemTone(item.kind))}
                    style={{
                      top: ((item.from - start) / 60) * HOUR_PX,
                      height: Math.max(((item.to - item.from) / 60) * HOUR_PX - 2, 22),
                      left: `calc(${(lane / lanes) * 100}% + 1px)`,
                      width: `calc(${100 / lanes}% - 3px)`,
                    }}
                  >
                    <span className="block truncate font-semibold">{item.title}</span>
                    <span className="block truncate opacity-80">
                      {formatMinutes(item.from)} – {formatMinutes(item.to)}
                    </span>
                  </button>
                ))}
                {date === today && nowMinute >= start && nowMinute <= end && (
                  <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-600" style={{ top: ((nowMinute - start) / 60) * HOUR_PX }}>
                    <span className="absolute -left-1 -top-1.5 size-2.5 rounded-full bg-red-600" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
