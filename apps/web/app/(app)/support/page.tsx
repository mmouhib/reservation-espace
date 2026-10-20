"use client";

import { useState } from "react";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { PageHeader } from "@/components/ui/PageHeader";
import { Tabs } from "@/components/ui/Tabs";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { EquipmentTab } from "./EquipmentTab";
import { IncidentsTab } from "./IncidentsTab";

type Tab = "incidents" | "equipment";

export default function SupportPage() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("incidents");

  return (
    <>
      <DocumentTitle titleKey="nav.support" />
      <PageHeader title={t("support.title")} description={t("support.description")} />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "incidents", label: t("support.tabIncidents") },
          { id: "equipment", label: t("support.tabEquipment") },
        ]}
      />
      {tab === "incidents" ? <IncidentsTab /> : <EquipmentTab />}
    </>
  );
}
