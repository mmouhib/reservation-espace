"use client";

import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { PageHeader } from "@/components/ui/PageHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { BookingSearch } from "./BookingSearch";

export default function ReserverPage() {
  const { t } = useI18n();
  return (
    <>
      <DocumentTitle titleKey="nav.reserve" />
      <PageHeader title={t("reserve.title")} description={t("reserve.description")} />
      <BookingSearch />
    </>
  );
}
