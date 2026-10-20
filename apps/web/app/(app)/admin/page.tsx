"use client";

import Link from "next/link";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Icon, type IconName } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useI18n } from "@/lib/i18n/I18nProvider";

const SECTIONS = [
  { id: "users", href: "/admin/utilisateurs", icon: "users" },
  { id: "organization", href: "/admin/organisation", icon: "building" },
  { id: "spaces", href: "/admin/espaces", icon: "layers" },
  { id: "bookings", href: "/admin/reservations", icon: "list" },
  { id: "credits", href: "/admin/credits", icon: "wallet" },
  { id: "support", href: "/admin/support", icon: "lifebuoy" },
  { id: "statistics", href: "/admin/statistiques", icon: "chart" },
  { id: "audit", href: "/admin/audit", icon: "clipboard" },
] as const satisfies readonly { id: string; href: string; icon: IconName }[];

export default function AdminPage() {
  const { t } = useI18n();
  return (
    <>
      <DocumentTitle titleKey="admin.title" />
      <PageHeader title={t("admin.title")} />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SECTIONS.map((section) => (
          <li key={section.id}>
            <Link
              href={section.href}
              className="flex h-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-600 hover:shadow"
            >
              <span className="flex items-center gap-2 font-semibold text-brand-800">
                <Icon name={section.icon} />
                {t(`admin.sections.${section.id}.title`)}
              </span>
              <span className="text-sm text-slate-600">{t(`admin.sections.${section.id}.text`)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
