"use client";

import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { PageHeader } from "@/components/ui/PageHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { FloorPlanView } from "./FloorPlanView";

export default function PlanPage() {
  const { t } = useI18n();
  return (
    <>
      <DocumentTitle titleKey="nav.plan" />
      <PageHeader title={t("plan.title")} description={t("plan.description")} />
      <FloorPlanView />
    </>
  );
}
