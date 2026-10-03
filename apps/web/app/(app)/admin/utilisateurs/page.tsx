"use client";

import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { PageHeader } from "@/components/ui/PageHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { UsersAdmin } from "./UsersAdmin";

export default function UtilisateursPage() {
  const { t } = useI18n();
  return (
    <>
      <DocumentTitle titleKey="admin.users.title" />
      <PageHeader title={t("admin.users.title")} description={t("admin.users.description")} />
      <UsersAdmin />
    </>
  );
}
