"use client";

import { collection, orderBy, query, where, type Timestamp } from "firebase/firestore";
import { useMemo, useState } from "react";
import { COL, SPACE_CATEGORIES, addDays, formatMinutes, type Booking, type Space } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Button } from "@/components/ui/Button";
import { EmptyState, Section, StatCard } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { getFirebase } from "@/lib/firebase/client";
import { useCollection } from "@/lib/firebase/hooks";
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
          <span className="text-right font-medium">{item.display}</span>
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
  // Two weeks back and two weeks ahead: past usage and what is already booked.
  const [from, setFrom] = useState(addDays(todayLocal(), -14));
  const [to, setTo] = useState(addDays(todayLocal(), 14));

  const bookingsQuery = useMemo(
    () => (from && to ? query(collection(getFirebase().db, COL.bookings), where("date", ">=", from), where("date", "<=", to), orderBy("date")) : null),
    [from, to],
  );
  const spacesQuery = useMemo(() => query(collection(getFirebase().db, COL.spaces)), []);
  const { data: bookings } = useCollection<Booking<Timestamp>>(bookingsQuery);
  const { data: spaces } = useCollection<Space>(spacesQuery);

  const stats = useMemo(() => {
    const confirmed = bookings.filter((b) => b.status === "confirmed");
    const hoursOf = (b: { from: number; to: number }) => (b.to - b.from) / 60;

    const perDay = new Map<string, number>();
    const hoursPerCategory = new Map<string, number>();
    const perSpace = new Map<string, number>();
    for (const b of confirmed) {
      perDay.set(b.date, (perDay.get(b.date) ?? 0) + 1);
      const category = spaces.find((s) => s.id === b.spaceId)?.category;
      if (category) hoursPerCategory.set(category, (hoursPerCategory.get(category) ?? 0) + hoursOf(b));
      perSpace.set(b.spaceName, (perSpace.get(b.spaceName) ?? 0) + 1);
    }
    return {
      confirmed: confirmed.length,
      cancelled: bookings.length - confirmed.length,
      hours: confirmed.reduce((sum, b) => sum + hoursOf(b), 0),
      credits: confirmed.reduce((sum, b) => sum + b.credits, 0),
      users: new Set(confirmed.map((b) => b.userId)).size,
      perDay: [...perDay.entries()].sort(([a], [b]) => a.localeCompare(b)),
      hoursPerCategory,
      topSpaces: [...perSpace.entries()].sort(([, a], [, b]) => b - a).slice(0, 5),
    };
  }, [bookings, spaces]);

  function exportCsv() {
    const header = [t("common.date"), t("reserve.start"), t("reserve.end"), t("admin.bookings.space"), t("admin.bookings.user"), t("common.status"), t("credits.title")];
    const lines = bookings.map((b) => [b.date, formatMinutes(b.from), formatMinutes(b.to), b.spaceName, b.userName, b.status, b.credits]);
    const csv = [header, ...lines].map((line) => line.map(csvCell).join(",")).join("\n");
    downloadFile(`bookings-${from}-${to}.csv`, `﻿${csv}`, "text/csv;charset=utf-8");
  }

  return (
    <>
      <DocumentTitle titleKey="admin.statistics.title" />
      <PageHeader
        title={t("admin.statistics.title")}
        description={t("admin.statistics.description")}
        actions={
          <Button variant="secondary" onClick={exportCsv} disabled={bookings.length === 0}>
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
        <StatCard icon="list" label={t("admin.statistics.bookings")} value={stats.confirmed} />
        <StatCard icon="x" label={t("admin.statistics.cancelled")} value={stats.cancelled} />
        <StatCard icon="clock" label={t("admin.statistics.hours")} value={Math.round(stats.hours * 10) / 10} />
        <StatCard icon="wallet" label={t("admin.statistics.creditsSpent")} value={stats.credits} />
        <StatCard icon="users" label={t("admin.statistics.activeUsers")} value={stats.users} />
      </div>

      {stats.confirmed === 0 ? (
        <EmptyState icon="chart">{t("admin.statistics.noData")}</EmptyState>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <Section title={t("admin.statistics.byDay")} icon="chart" className="xl:col-span-2">
            <Bars items={stats.perDay.map(([date, count]) => ({ label: formatDate(date, locale), value: count, display: String(count) }))} />
          </Section>
          <Section title={t("admin.statistics.byCategory")} icon="layers">
            <Bars
              items={SPACE_CATEGORIES.filter((c) => stats.hoursPerCategory.has(c)).map((c) => ({
                label: t(`spaceCategories.${c}`),
                value: stats.hoursPerCategory.get(c) ?? 0,
                display: t("admin.statistics.hoursShort", { count: Math.round(stats.hoursPerCategory.get(c) ?? 0) }),
              }))}
            />
          </Section>
          <Section title={t("admin.statistics.topSpaces")} icon="building">
            <Bars items={stats.topSpaces.map(([name, count]) => ({ label: name, value: count, display: String(count) }))} />
          </Section>
        </div>
      )}
    </>
  );
}
