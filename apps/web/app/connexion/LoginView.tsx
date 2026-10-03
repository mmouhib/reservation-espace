"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DEMO_ACCOUNTS } from "@reservation/shared";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { USE_EMULATORS } from "@/lib/firebase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Only same-origin relative paths are accepted as redirect targets. */
function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

const SSO_LABEL_KEY = (process.env.NEXT_PUBLIC_AUTH_PROVIDER ?? "google") === "google" ? "login.withGoogle" : "login.withSso";

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
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, tiny icon */}
        <img src="/icons/icon-192.png" alt="" width={56} height={56} className="mx-auto rounded-xl" />
        <h1 className="mt-4 text-center text-2xl font-bold">{t("app.name")}</h1>
        <p className="mt-2 text-center text-sm text-slate-600">{t("app.description")}</p>

        <div role="alert" className="mt-6 empty:hidden rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
          {error && t(error)}
        </div>

        <Button
          size="lg"
          className="mt-6 w-full"
          disabled={pending || status === "loading"}
          onClick={() => void run(signIn)}
        >
          {t(SSO_LABEL_KEY)}
        </Button>

        {USE_EMULATORS && demoPassword && (
          <section aria-labelledby="demo-title" className="mt-8 border-t border-slate-200 pt-6">
            <h2 id="demo-title" className="text-sm font-semibold text-slate-700">
              {t("login.demoAccounts")}
            </h2>
            <ul className="mt-3 space-y-2">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email}>
                  <Button
                    variant="secondary"
                    className="w-full justify-between"
                    disabled={pending}
                    onClick={() => void run(() => signInDemo(a.email, demoPassword))}
                  >
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
    </main>
  );
}
