"use client";

import { WEEKDAYS, type OpeningHours, type Weekday } from "@reservation/shared";
import { Checkbox } from "@/components/ui/Field";
import { TimeSelect } from "@/components/ui/TimeSelect";
import { useI18n } from "@/lib/i18n/I18nProvider";

const DEFAULT_RANGE = { from: 8 * 60, to: 19 * 60 };

/** One opening range per weekday, or closed. */
export function OpeningHoursEditor({ value, onChange }: { value: OpeningHours; onChange: (hours: OpeningHours) => void }) {
  const { t } = useI18n();

  function setDay(day: Weekday, ranges: OpeningHours[Weekday]) {
    onChange({ ...value, [day]: ranges });
  }

  return (
    <ul className="space-y-1">
      {WEEKDAYS.map((day) => {
        const range = value[day][0];
        return (
          <li key={day} className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="w-28">
              <Checkbox label={t(`weekdays.${day}`)} checked={range !== undefined} onChange={(e) => setDay(day, e.target.checked ? [DEFAULT_RANGE] : [])} />
            </span>
            {range ? (
              <span className="flex items-center gap-2">
                <TimeSelect aria-label={t("common.from")} value={range.from} max={23 * 60} onChange={(from) => setDay(day, [{ ...range, from }])} className="w-24" />
                <span aria-hidden="true">–</span>
                <TimeSelect aria-label={t("common.to")} value={range.to} min={30} onChange={(to) => setDay(day, [{ ...range, to }])} className="w-24" />
              </span>
            ) : (
              <span className="text-sm text-slate-500">{t("admin.spaces.closedDay")}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
