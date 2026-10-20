"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DEMO_ACCOUNTS } from "@reservation/shared";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useAuth } from "@/lib/auth/AuthProvider";
import { USE_EMULATORS } from "@/lib/firebase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Only same-origin relative paths are accepted as redirect targets. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

const SSO_LABEL_KEY = (process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "google") === "google" ? "login.withGoogle" : "login.withSso";

const FEATURES = [
  { icon: "layers", key: "login.feature1" },
  { icon: "download", key: "login.feature2" },
  { icon: "bell", key: "login.feature3" },
] as const satisfies readonly { icon: IconName; key: string }[];

export function LoginView() {
  const { status, error, signIn, signInDemo } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (status === "signed-in") router.replace(next);
  }, [status, next, router]);

  async function run(action: () => Promise<void>) {
    setPending(true);
    try {
      await action();
    } finally {
      setPending(false);
    }
  }

  const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD;

  return (
    <main className="grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
      <section className="flex flex-col justify-center gap-8 bg-gradient-to-br from-brand-700 to-brand-900 px-6 py-10 text-white sm:px-12 lg:px-16">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, tiny icon */}
          <img src="/icons/icon-192.png" alt="" width={48} height={48} className="rounded-xl bg-white/10" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t("app.name")}</h1>
        </div>
        <p className="max-w-md text-lg text-brand-100">{t("app.description")}</p>
        <ul className="hidden space-y-3 sm:block">
          {FEATURES.map((feature) => (
            <li key={feature.key} className="flex items-center gap-3 text-brand-50">
              <span className="flex size-9 items-center justify-center rounded-lg bg-white/10">
                <Icon name={feature.icon} />
              </span>
              {t(feature.key)}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col items-center justify-center gap-6 px-4 py-10">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-xl font-semibold">{t("login.welcome")}</h2>
          <p className="mt-1 text-sm text-slate-600">{t("login.title")}</p>

          <div role="alert" className="mt-5 empty:hidden rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            {error && t(error)}
          </div>

          <Button size="lg" className="mt-5 w-full" disabled={pending || status === "loading"} onClick={() => void run(signIn)}>
            {t(SSO_LABEL_KEY)}
          </Button>

          {USE_EMULATORS && demoPassword && (
            <section aria-labelledby="demo-title" className="mt-8 border-t border-slate-200 pt-6">
              <h3 id="demo-title" className="text-sm font-semibold text-slate-700">
                {t("login.demoAccounts")}
              </h3>
              <ul className="mt-3 space-y-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <li key={a.email}>
                    <Button variant="secondary" className="w-full justify-between" disabled={pending} onClick={() => void run(() => signInDemo(a.email, demoPassword))}>
                      <span>{a.displayName}</span>
                      <span className="text-xs text-slate-600">{t(`roles.${a.role}`)}</span>
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
        <LanguageSwitcher />
      </section>
    </main>
  );
}
