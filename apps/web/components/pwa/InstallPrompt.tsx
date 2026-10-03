"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { usePwa } from "./PwaProvider";

/** Dismissible banner inviting the user to install the app (Chromium prompt or iOS instructions). */
export function InstallPrompt() {
  const { canPromptInstall, promptInstall, isIos, isStandalone, installDismissed, dismissInstall } = usePwa();
  const iosDialog = useRef<HTMLDialogElement>(null);
  const { t, rich } = useI18n();
  const strong = { strong: (text: string) => <strong>{text}</strong> };

  if (isStandalone || installDismissed || (!canPromptInstall && !isIos)) return null;

  return (
    <section
      aria-labelledby="install-title"
      className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 sm:flex-row sm:items-center"
    >
      <div className="flex-1">
        <h2 id="install-title" className="font-semibold text-brand-900">
          {t("pwa.install.title")}
        </h2>
        <p className="text-sm text-slate-700">{t("pwa.install.text")}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={dismissInstall}>
          {t("common.later")}
        </Button>
        {canPromptInstall ? (
          <Button size="sm" onClick={() => void promptInstall()}>
            {t("pwa.install.install")}
          </Button>
        ) : (
          <Button size="sm" onClick={() => iosDialog.current?.showModal()}>
            {t("pwa.install.howTo")}
          </Button>
        )}
      </div>

      <dialog
        ref={iosDialog}
        aria-labelledby="ios-install-title"
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl p-6 backdrop:bg-slate-900/50"
      >
        <h2 id="ios-install-title" className="text-lg font-semibold">
          {t("pwa.install.iosTitle")}
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>{rich("pwa.install.iosStep1", strong)}</li>
          <li>{rich("pwa.install.iosStep2", strong)}</li>
          <li>{rich("pwa.install.iosStep3", strong)}</li>
        </ol>
        <p className="mt-4 text-sm text-slate-600">{t("pwa.install.iosPushNote")}</p>
        <form method="dialog" className="mt-6 flex justify-end">
          <Button type="submit">{t("pwa.install.gotIt")}</Button>
        </form>
      </dialog>
    </section>
  );
}
