"use client";

import Link from "next/link";
import { hasRole } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { NAV_ITEMS } from "@/lib/navigation";

export function HomeView() {
  const { profile, role } = useAuth();
  const { t } = useI18n();
  const firstName = profile?.displayName.split(" ")[0];
  const shortcuts = NAV_ITEMS.filter((i) => i.href !== "/" && role && hasRole(role, i.minRole));

  return (
    <>
      <DocumentTitle />
      <PageHeader
        title={firstName ? t("home.greetingName", { name: firstName }) : t("home.greeting")}
        description={t("home.subtitle")}
      />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex h-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-600 hover:shadow"
            >
              <span className="flex items-center gap-2 font-semibold text-brand-800">
                <Icon name={item.icon} />
                {t(item.labelKey)}
              </span>
              {item.descriptionKey && <span className="text-sm text-slate-600">{t(item.descriptionKey)}</span>}
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="upcoming" className="mt-10">
        <h2 id="upcoming" className="mb-3 text-lg font-semibold">
          {t("home.upcoming")}
        </h2>
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          {t("home.noUpcoming")}
        </p>
      </section>
    </>
  );
}
