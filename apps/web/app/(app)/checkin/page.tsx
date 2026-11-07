"use client";

import { Suspense } from "react";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { CheckInView } from "./CheckInView";

export default function CheckInPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-md">
      <DocumentTitle titleKey="checkin.title" />
      <PageHeader title={t("checkin.title")} />
      {/* useSearchParams needs a Suspense boundary in a statically exported page. */}
      <Suspense fallback={<Spinner />}>
        <CheckInView />
      </Suspense>
    </div>
  );
}
