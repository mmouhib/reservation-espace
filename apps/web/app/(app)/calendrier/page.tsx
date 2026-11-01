"use client";

import { CalendarView } from "@/components/calendar/CalendarView";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { PageHeader } from "@/components/ui/PageHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function CalendarPage() {
  const { t } = useI18n();
  return (
    <>
      <DocumentTitle titleKey="nav.calendar" />
      <PageHeader title={t("calendar.title")} description={t("calendar.description")} />
      <CalendarView />
    </>
  );
}
