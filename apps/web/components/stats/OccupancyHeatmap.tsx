"use client";

import { useMemo, useState } from "react";
import { formatMinutes } from "@reservation/shared";
import { Section } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api/client";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { weekdayNames } from "@/lib/calendar";
import { useI18n } from "@/lib/i18n/I18nProvider";

const DEFAULT_FIRST_HOUR = 7;
const DEFAULT_LAST_HOUR = 20;
/** The darkest cell is not fully opaque, so the figure written in it stays readable in both themes. */
const MAX_STRENGTH = 85;

const shade = (percent: number) => `color-mix(in srgb, var(--color-brand-600) ${Math.round((Math.min(percent, 100) / 100) * MAX_STRENGTH)}%, transparent)`;

/** The week as a grid: one cell per weekday and hour, bluer where more of the spaces are booked. */
export function OccupancyHeatmap({ from, to }: { from: string; to: string }) {
  const { t, locale } = useI18n();
  const sites = useCallableQuery("listSites", api.listSites, {});
  const [siteId, setSiteId] = useState("");
  const input = useMemo(() => (from && to ? { from, to, ...(siteId ? { siteId } : {}) } : null), [from, to, siteId]);
  const heatmap = useCallableQuery("getOccupancyHeatmap", api.getOccupancyHeatmap, input);
  const data = heatmap.data;
  const days = weekdayNames(locale);

  // 07:00 to 20:00, and wider when something is booked outside.
  const used = data ? data.cells.flatMap((row) => row.map((value, hour) => (value > 0 ? hour : -1)).filter((hour) => hour >= 0)) : [];
  const first = Math.min(DEFAULT_FIRST_HOUR, ...used);
  const last = Math.max(DEFAULT_LAST_HOUR, ...used);
  const hours = Array.from({ length: last - first + 1 }, (_, i) => first + i);

  const percent = (value: number) => (data && data.spaces > 0 ? Math.round((value / data.spaces) * 100) : 0);

  return (
    <Section title={t("admin.statistics.heatmap.title")} icon="chart" className="xl:col-span-2">
      <p className="mb-4 text-sm text-slate-600">{t("admin.statistics.heatmap.description")}</p>
      <div className="mb-4 max-w-xs">
        <Field label={t("admin.statistics.heatmap.site")}>
          <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
            <option value="">{t("admin.statistics.heatmap.allSites")}</option>
            {(sites.data ?? []).map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {!data ? (
        <Spinner />
      ) : data.spaces === 0 ? (
        <p className="text-sm text-slate-600">{t("admin.statistics.heatmap.noSpaces")}</p>
      ) : (
        <>
          {data.peak && (
            <p className="mb-3 text-sm font-medium text-slate-800">
              {t("admin.statistics.heatmap.peak", {
                day: days[data.peak.weekday] ?? "",
                time: formatMinutes(data.peak.hour * 60),
                percent: percent(data.peak.value),
              })}
            </p>
          )}
          <div className="overflow-x-auto">
            <div className="grid min-w-[28rem] gap-0.5" style={{ gridTemplateColumns: "3rem repeat(7, minmax(0, 1fr))" }}>
              <div />
              {days.map((day) => (
                <div key={day} className="pb-1 text-center text-xs font-medium text-slate-600">
                  {day}
                </div>
              ))}
              {hours.map((hour) => (
                <HeatmapRow key={hour} hour={hour} row={data.cells.map((column) => column[hour] ?? 0)} total={data.spaces} days={days} percent={percent} />
              ))}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
            {t("admin.statistics.heatmap.quiet")}
            <span className="h-2.5 w-28 rounded-full" style={{ backgroundImage: `linear-gradient(to right, ${shade(0)}, ${shade(100)})` }} />
            {t("admin.statistics.heatmap.full")}
          </div>
        </>
      )}
    </Section>
  );
}

function HeatmapRow({ hour, row, total, days, percent }: { hour: number; row: number[]; total: number; days: string[]; percent: (value: number) => number }) {
  const { t } = useI18n();
  return (
    <>
      <div className="pe-2 text-end text-xs leading-7 text-slate-500">{formatMinutes(hour * 60)}</div>
      {row.map((value, weekday) => (
        <div
          key={weekday}
          title={t("admin.statistics.heatmap.cell", { day: days[weekday] ?? "", time: formatMinutes(hour * 60), count: value, total, percent: percent(value) })}
          className="h-7 rounded-sm bg-slate-100 text-center text-[11px] leading-7 text-slate-900"
          style={value > 0 ? { backgroundColor: shade(Math.max(percent(value), 8)) } : undefined}
        >
          {value > 0 ? `${percent(value)}%` : ""}
        </div>
      ))}
    </>
  );
}
