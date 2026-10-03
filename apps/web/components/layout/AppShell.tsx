"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { hasRole } from "@reservation/shared";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { OfflineBanner } from "@/components/pwa/OfflineBanner";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { isActive, NAV_ITEMS } from "@/lib/navigation";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { role, profile, user, signOut } = useAuth();
  const { t } = useI18n();
  const items = NAV_ITEMS.filter((item) => role && hasRole(role, item.minRole));
  const displayName = profile?.displayName ?? user?.displayName ?? user?.email ?? "";

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
      >
        {t("common.skipToContent")}
      </a>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-brand-800">
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, tiny icon */}
            <img src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
            {/* The short name leaves room for the language picker on phones. */}
            <span className="sm:hidden">{t("app.shortName")}</span>
            <span className="hidden sm:inline">{t("app.name")}</span>
          </Link>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{displayName}</p>
              {role && <p className="text-xs text-slate-600">{t(`roles.${role}`)}</p>}
            </div>
            <LanguageSwitcher compact />
            <Button variant="secondary" size="sm" onClick={() => void signOut()}>
              {t("common.signOut")}
            </Button>
          </div>
        </div>
        <OfflineBanner />
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <nav aria-label={t("nav.label")} className="hidden w-60 shrink-0 border-r border-slate-200 p-4 md:block">
          <ul className="space-y-1">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium",
                      active ? "bg-brand-50 text-brand-800" : "text-slate-700 hover:bg-slate-100",
                    )}
                  >
                    <Icon name={item.icon} />
                    {t(item.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <main id="contenu" tabIndex={-1} className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
          <InstallPrompt />
          {children}
        </main>
      </div>

      <nav
        aria-label={t("nav.label")}
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-safe md:hidden"
      >
        <ul className="flex">
          {items
            .filter((item) => item.mobile)
            .map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                      active ? "text-brand-700" : "text-slate-600",
                    )}
                  >
                    <Icon name={item.icon} />
                    {t(item.labelKey)}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
    </div>
  );
}
