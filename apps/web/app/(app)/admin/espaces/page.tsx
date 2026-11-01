"use client";

import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api/client";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { SitesSection } from "./SitesSection";
import { SpacesSection } from "./SpacesSection";

export default function SpacesAdminPage() {
  const { t } = useI18n();
  const sites = useCallableQuery("listSites", api.listSites, {});
  const spaces = useCallableQuery("listSpaces", api.listSpaces, {});
  // Sites and spaces refer to each other (names, floors), so either change reloads both.
  const reload = () => {
    sites.refetch();
    spaces.refetch();
  };

  return (
    <>
      <DocumentTitle titleKey="admin.spaces.title" />
      <PageHeader title={t("admin.spaces.title")} description={t("admin.spaces.description")} />
      <div className="space-y-6">
        <SitesSection sites={sites.data ?? []} onChanged={reload} />
        <SpacesSection sites={sites.data ?? []} spaces={spaces.data ?? []} onChanged={reload} />
      </div>
    </>
  );
}
