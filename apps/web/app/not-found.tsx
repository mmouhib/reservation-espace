"use client";

import Link from "next/link";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function NotFound() {
  const { t } = useI18n();
  return (
    <main className="flex min-h-dvh items-center justify-center p-4 text-center">
      <DocumentTitle titleKey="notFound.title" />
      <div>
        <h1 className="text-2xl font-bold">{t("notFound.title")}</h1>
        <p className="mt-2 text-slate-600">{t("notFound.text")}</p>
        <Link href="/" className="mt-6 inline-block font-medium text-brand-700 underline">
          {t("notFound.back")}
        </Link>
      </div>
    </main>
  );
}
