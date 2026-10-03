"use client";

import Link from "next/link";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { PageHeader } from "@/components/ui/PageHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";

const SECTIONS = [
  { id: "users", href: "/admin/utilisateurs", phase: null },
  { id: "spaces", href: "#", phase: 2 },
  { id: "bookings", href: "#", phase: 2 },
  { id: "credits", href: "#", phase: 4 },
  { id: "reports", href: "#", phase: 5 },
  { id: "dashboards", href: "#", phase: 6 },
] as const;

export default function AdminPage() {
  const { t } = useI18n();
  return (
    <>
      <DocumentTitle titleKey="admin.title" />
      <PageHeader title={t("admin.title")} />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            {s.phase === null ? (
              <Link
                href={s.href}
                className="block h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-600"
              >
                <span className="font-semibold text-brand-800">{t(`admin.sections.${s.id}.title`)}</span>
                <span className="mt-1 block text-sm text-slate-600">{t(`admin.sections.${s.id}.text`)}</span>
              </Link>
            ) : (
              <div className="h-full rounded-xl border border-dashed border-slate-300 bg-white p-5" aria-disabled="true">
                <span className="font-semibold text-slate-700">{t(`admin.sections.${s.id}.title`)}</span>
                <span className="mt-1 block text-sm text-slate-600">{t(`admin.sections.${s.id}.text`)}</span>
                <span className="mt-2 block text-xs text-slate-500">{t("common.availableInPhase", { phase: s.phase })}</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
