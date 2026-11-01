"use client";

import { formatMinutes } from "@reservation/shared";
import { cn } from "@/lib/cn";
import { weekdayNames, type CalendarItem } from "@/lib/calendar";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { itemTone } from "./tones";

const MAX_CHIPS = 3;

/** Six weeks of days, the month being looked at in full color and the days around it faded. */
export function MonthGrid({
  days,
  month,
  today,
  byDay,
  onDay,
  onItem,
}: {
  days: string[];
  /** Any day of the month being shown, as YYYY-MM-DD. */
  month: string;
  today: string;
  byDay: Map<string, CalendarItem[]>;
  onDay: (date: string) => void;
  onItem: (item: CalendarItem) => void;
}) {
  const { t, locale } = useI18n();

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-medium text-slate-600">
        {weekdayNames(locale).map((name) => (
          <div key={name} className="py-2">
            {name}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((date, index) => {
          const items = byDay.get(date) ?? [];
          const inMonth = date.slice(0, 7) === month.slice(0, 7);
          return (
            // The whole cell opens the day; the day number is the button that keyboard users reach.
            <div
              key={date}
              onClick={() => onDay(date)}
              className={cn(
                "min-h-20 cursor-pointer border-b border-slate-100 p-1 hover:bg-slate-50 sm:min-h-28",
                index % 7 !== 6 && "border-r",
                !inMonth && "bg-slate-50/60",
              )}
            >
              <button
                type="button"
                aria-label={formatDate(date, locale)}
                onClick={(e) => {
                  e.stopPropagation();
                  onDay(date);
                }}
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-sm",
                  date === today ? "bg-brand-700 font-semibold text-white" : inMonth ? "text-slate-900" : "text-slate-400",
                )}
              >
                {Number(date.slice(8))}
              </button>

              {/* On a phone the cells are too narrow for titles: one dot per item, and the day opens on tap. */}
              <div className="mt-1 flex flex-wrap gap-0.5 px-1 sm:hidden">
                {items.slice(0, 6).map((item) => (
                  <span key={item.key} className={cn("size-1.5 rounded-full", item.kind === "booking" ? "bg-brand-600" : "bg-amber-500")} />
                ))}
              </div>
              <ul className="mt-1 hidden space-y-0.5 sm:block">
                {items.slice(0, MAX_CHIPS).map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onItem(item);
                      }}
                      className={cn("block w-full truncate rounded border-l-2 px-1.5 py-0.5 text-left text-xs", itemTone(item.kind))}
                    >
                      {!item.allDay && <span className="font-medium">{formatMinutes(item.from)} </span>}
                      {item.title}
                    </button>
                  </li>
                ))}
                {items.length > MAX_CHIPS && (
                  <li className="px-1.5 text-xs font-medium text-brand-800">{t("calendar.more", { count: items.length - MAX_CHIPS })}</li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
