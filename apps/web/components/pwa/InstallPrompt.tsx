"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { usePwa } from "./PwaProvider";

/** Dismissible banner inviting the user to install the app (Chromium prompt or iOS instructions). */
export function InstallPrompt() {
  const { canPromptInstall, promptInstall, isIos, isStandalone, installDismissed, dismissInstall } = usePwa();
  const iosDialog = useRef<HTMLDialogElement>(null);

  if (isStandalone || installDismissed || (!canPromptInstall && !isIos)) return null;

  return (
    <section
      aria-labelledby="install-title"
      className="mb-6 flex flex-col gap-3 rounded-xl border border-brand-100 bg-brand-50 p-4 sm:flex-row sm:items-center"
    >
      <div className="flex-1">
        <h2 id="install-title" className="font-semibold text-brand-900">
          Installer l&apos;application
        </h2>
        <p className="text-sm text-slate-700">
          Accédez à vos réservations en un geste, même hors connexion, et recevez les rappels.
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={dismissInstall}>
          Plus tard
        </Button>
        {canPromptInstall ? (
          <Button size="sm" onClick={() => void promptInstall()}>
            Installer
          </Button>
        ) : (
          <Button size="sm" onClick={() => iosDialog.current?.showModal()}>
            Comment faire ?
          </Button>
        )}
      </div>

      <dialog
        ref={iosDialog}
        aria-labelledby="ios-install-title"
        className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-2xl p-6 backdrop:bg-slate-900/50"
      >
        <h2 id="ios-install-title" className="text-lg font-semibold">
          Installer sur iPhone ou iPad
        </h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            Touchez le bouton <strong>Partager</strong> de Safari (carré avec une flèche vers le haut).
          </li>
          <li>
            Choisissez <strong>Sur l&apos;écran d&apos;accueil</strong>.
          </li>
          <li>
            Touchez <strong>Ajouter</strong>.
          </li>
        </ol>
        <p className="mt-4 text-sm text-slate-600">
          Les notifications push ne sont disponibles sur iOS qu&apos;une fois l&apos;application installée (iOS 16.4 ou
          ultérieur).
        </p>
        <form method="dialog" className="mt-6 flex justify-end">
          <Button type="submit">J&apos;ai compris</Button>
        </form>
      </dialog>
    </section>
  );
}
