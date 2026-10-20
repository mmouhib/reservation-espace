"use client";

import { collection, orderBy, query, type Timestamp } from "firebase/firestore";
import { useMemo } from "react";
import { COL, type Site, type Space } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { PageHeader } from "@/components/ui/PageHeader";
import { getFirebase } from "@/lib/firebase/client";
import { useCollection } from "@/lib/firebase/hooks";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SitesSection } from "./SitesSection";
import { SpacesSection } from "./SpacesSection";

export default function SpacesAdminPage() {
  const { t } = useI18n();
  const sitesQuery = useMemo(() => query(collection(getFirebase().db, COL.sites), orderBy("name")), []);
  const spacesQuery = useMemo(() => query(collection(getFirebase().db, COL.spaces), orderBy("name")), []);
  const { data: sites } = useCollection<Site>(sitesQuery);
  const { data: spaces } = useCollection<Space<Timestamp>>(spacesQuery);

  return (
    <>
      <DocumentTitle titleKey="admin.spaces.title" />
      <PageHeader title={t("admin.spaces.title")} description={t("admin.spaces.description")} />
      <div className="space-y-6">
        <SitesSection sites={sites} spaces={spaces} />
        <SpacesSection sites={sites} spaces={spaces} />
      </div>
    </>
  );
}
