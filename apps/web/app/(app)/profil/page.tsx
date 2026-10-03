"use client";

import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { PageHeader } from "@/components/ui/PageHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { ProfileView } from "./ProfileView";

export default function ProfilPage() {
  const { t } = useI18n();
  return (
    <>
      <DocumentTitle titleKey="nav.profile" />
      <PageHeader title={t("profile.title")} description={t("profile.description")} />
      <ProfileView />
    </>
  );
}
