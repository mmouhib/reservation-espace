"use client";

import { useState } from "react";
import { SPACE_CATEGORIES, addDays, formatMinutes, type SpaceCategory } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Button } from "@/components/ui/Button";
import { EmptyState, Section, StatCard } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { PageHeader } from "@/components/ui/PageHeader";
import { OccupancyHeatmap } from "@/components/stats/OccupancyHeatmap";
import { api } from "@/lib/api/client";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { downloadFile, formatDate, todayLocal } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** A horizontal bar per item, as wide as its share of the biggest value. */
function Bars({ items }: { items: { label: string; value: number; display: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.label} className="grid grid-cols-[8rem_1fr_3.5rem] items-center gap-3 text-sm">
          <span className="truncate text-slate-700">{item.label}</span>
          <span className="h-3 overflow-hidden rounded-full bg-slate-100">
            <span className="block h-full rounded-full bg-brand-600" style={{ width: `${(item.value / max) * 100}%` }} />
          </span>
          <span className="text-end font-medium">{item.display}</span>
        </li>
      ))}
    </ul>
  );
}

function csvCell(value: string | number): string {
  return `"${String(value).replaceAll('"', '""')}"`;
}

export default function StatisticsPage() {
  const { t, locale } = useI18n();
  const flash = useFlash();
  const [exporting, setExporting] = useState(false);
  // Two weeks back and two weeks ahead: past usage and what is already booked.
  const [from, setFrom] = useState(addDays(todayLocal(), -14));
  const [to, setTo] = useState(addDays(todayLocal(), 14));

  const range = from && to ? { from, to } : null;
  const totals = useCallableQuery("getBookingTotals", api.getBookingTotals, range);
  const perDay = useCallableQuery("getBookingsPerDay", api.getBookingsPerDay, range);
  const perCategory = useCallableQuery("getHoursPerCategory", api.getHoursPerCategory, range);
  const topSpaces = useCallableQuery("getTopSpaces", api.getTopSpaces, range);

  const confirmed = totals.data?.confirmed ?? 0;
  const cancelled = totals.data?.cancelled ?? 0;
  const hoursByCategory = new Map<SpaceCategory, number>((perCategory.data ?? []).map((c) => [c.category, c.hours] as const));
  const dayRows = [...(perDay.data ?? [])].sort((a, b) => a.date.localeCompare(b.date));

  async function exportCsv() {
    if (!from || !to) return;
    setExporting(true);
    try {
      const bookings = await api.listBookingsInRange({ from, to, limit: 5000 });
      const header = [t("common.date"), t("reserve.start"), t("reserve.end"), t("admin.bookings.space"), t("admin.bookings.user"), t("common.status"), t("credits.title")];
      const lines = bookings.map((b) => [b.date, formatMinutes(b.from), formatMinutes(b.to), b.spaceName, b.userName, b.status, b.credits]);
      const csv = [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\n");
      downloadFile(`bookings-${from}-${to}.csv`, `﻿${csv}`, "text/csv;charset=utf-8");
    } catch (err) {
      flash.error(err);
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <DocumentTitle titleKey="admin.statistics.title" />
      <PageHeader
        title={t("admin.statistics.title")}
        description={t("admin.statistics.description")}
        actions={
          <Button variant="secondary" onClick={() => void exportCsv()} disabled={exporting || confirmed + cancelled === 0}>
            {t("admin.statistics.export")}
          </Button>
        }
      />

      <div className="mb-6 grid max-w-md grid-cols-2 gap-3">
        <Field label={t("common.from")}>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t("common.to")}>
          <Input type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon="list" label={t("admin.statistics.bookings")} value={confirmed} />
        <StatCard icon="x" label={t("admin.statistics.cancelled")} value={cancelled} />
        <StatCard icon="clock" label={t("admin.statistics.hours")} value={Math.round((totals.data?.hours ?? 0) * 10) / 10} />
        <StatCard icon="wallet" label={t("admin.statistics.creditsSpent")} value={totals.data?.credits ?? 0} />
        <StatCard icon="users" label={t("admin.statistics.activeUsers")} value={totals.data?.users ?? 0} />
      </div>

      {confirmed === 0 ? (
        <EmptyState icon="chart">{t("admin.statistics.noData")}</EmptyState>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Section title={t("admin.statistics.byDay")} icon="chart" className="xl:col-span-2">
            <Bars items={dayRows.map((d) => ({ label: formatDate(d.date, locale), value: d.count, display: String(d.count) }))} />
          </Section>
          <OccupancyHeatmap from={from} to={to} />
          <Section title={t("admin.statistics.byCategory")} icon="layers">
            <Bars
              items={SPACE_CATEGORIES.filter((c: SpaceCategory) => hoursByCategory.has(c)).map((c) => ({
                label: t(`spaceCategories.${c}`),
                value: hoursByCategory.get(c) ?? 0,
                display: t("admin.statistics.hoursShort", { count: Math.round(hoursByCategory.get(c) ?? 0) }),
              }))}
            />
          </Section>
          <Section title={t("admin.statistics.topSpaces")} icon="building">
            <Bars items={(topSpaces.data ?? []).map((s) => ({ label: s.name, value: s.count, display: String(s.count) }))} />
          </Section>
        </div>
      )}
    </>
  );
}
