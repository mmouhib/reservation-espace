"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { USE_EMULATORS } from "@/lib/firebase/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Seconds before the confirmation email can be sent again (Firebase limits how often it sends). */
const RESEND_DELAY_SECONDS = 30;

/** Shown after signing up with a password, until the address in the email is confirmed. */
export function VerifyEmailPanel({ email }: { email: string }) {
  const { t } = useI18n();
  const { checkVerified, resendVerification, signOut } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [wait, setWait] = useState(RESEND_DELAY_SECONDS);
  const [busy, setBusy] = useState(false);

  // The link is opened in another tab: carry on by itself when the person comes back to this one.
  useEffect(() => {
    const onFocus = () => void checkVerified();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [checkVerified]);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function check() {
    setBusy(true);
    setMessage(null);
    if (!(await checkVerified())) setMessage(t("login.verifyNotYet"));
    setBusy(false);
  }

  async function resend() {
    setBusy(true);
    setMessage(null);
    if (await resendVerification()) {
      setMessage(t("login.verifyResent"));
      setWait(RESEND_DELAY_SECONDS);
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">{t("login.verifyTitle")}</h2>
      <p className="text-sm text-slate-700">{t("login.verifyText", { email })}</p>
      {USE_EMULATORS && <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("login.verifyDevHint")}</p>}
      {message && <p role="status" className="text-sm text-slate-700">{message}</p>}
      <Button size="lg" className="w-full" disabled={busy} onClick={() => void check()}>
        {t("login.verifyDone")}
      </Button>
      <Button variant="secondary" className="w-full" disabled={busy || wait > 0} onClick={() => void resend()}>
        {t("login.verifyResend")}
        {wait > 0 && ` (${wait})`}
      </Button>
      <Button variant="ghost" className="w-full" onClick={() => void signOut()}>
        {t("login.verifyOther")}
      </Button>
    </div>
  );
}
