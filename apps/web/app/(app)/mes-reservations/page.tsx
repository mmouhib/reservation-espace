"use client";

import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { ComingSoon, PageHeader } from "@/components/ui/PageHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function MesReservationsPage() {
  const { t } = useI18n();
  return (
    <>
      <DocumentTitle titleKey="nav.myBookings" />
      <PageHeader title={t("myBookings.title")} description={t("myBookings.description")} />
      <ComingSoon phase={2} />
    </>
  );
}
