"use client";

import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { ComingSoon, PageHeader } from "@/components/ui/PageHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function ReserverPage() {
  const { t } = useI18n();
  return (
    <>
      <DocumentTitle titleKey="nav.reserve" />
      <PageHeader title={t("reserve.title")} description={t("reserve.description")} />
      <ComingSoon phase={2} />
    </>
  );
}
