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
import { NotificationBell } from "./NotificationBell";

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

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

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold text-brand-800">
            {/* eslint-disable-next-line @next/next/no-img-element -- static export, tiny icon */}
            <img src="/icons/icon-192.png" alt="" width={28} height={28} className="rounded-md" />
            {/* The short name leaves room for the header buttons on phones. */}
            <span className="sm:hidden">{t("app.shortName")}</span>
            <span className="hidden sm:inline">{t("app.name")}</span>
          </Link>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <NotificationBell />
            <LanguageSwitcher compact />
            <Button variant="ghost" size="sm" onClick={() => void signOut()} aria-label={t("common.signOut")}>
              <Icon name="log-out" />
              <span className="hidden sm:inline">{t("common.signOut")}</span>
            </Button>
          </div>
        </div>
        <OfflineBanner />
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1">
        <aside className="hidden w-64 shrink-0 flex-col justify-between border-r border-slate-200 p-4 md:flex">
          <nav aria-label={t("nav.label")}>
            <ul className="space-y-1">
              {items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
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

          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-700 text-sm font-semibold text-white">
              {initials(displayName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium leading-tight">{displayName}</p>
              {role && <p className="text-xs text-slate-600">{t(`roles.${role}`)}</p>}
            </div>
          </div>
        </aside>

        <main id="contenu" tabIndex={-1} className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10">
          <InstallPrompt />
          {children}
        </main>
      </div>

      <nav aria-label={t("nav.label")} className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white pb-safe md:hidden">
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
                      "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
                      active ? "text-brand-700" : "text-slate-600",
                    )}
                  >
                    <Icon name={item.icon} />
                    {t(item.shortLabelKey ?? item.labelKey)}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>
    </div>
  );
}
