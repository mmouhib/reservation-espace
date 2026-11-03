"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Mode = "signin" | "signup" | "reset";

/** Firebase accepts 6 characters; the app asks for a bit more. */
const MIN_PASSWORD_LENGTH = 8;

/** Sign in, create an account, or ask for a new password, with an email and a password. */
export function EmailAuthForm({ busy, run }: { busy: boolean; run: (action: () => Promise<void>) => Promise<void> }) {
  const { t } = useI18n();
  const { signInWithEmail, signUpWithEmail, sendPasswordReset, clearError } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const mismatch = mode === "signup" && confirm !== "" && confirm !== password;

  function switchTo(next: Mode) {
    clearError();
    setResetSent(false);
    setMode(next);
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    if (mode === "signin") void run(() => signInWithEmail(email.trim(), password));
    else if (mode === "signup") {
      if (password !== confirm) return;
      void run(() => signUpWithEmail(name.trim(), email.trim(), password));
    } else void run(async () => setResetSent(await sendPasswordReset(email.trim())));
  }

  return (
    <div>
      {mode !== "reset" && (
        <Tabs
          value={mode}
          onChange={switchTo}
          tabs={[
            { id: "signin", label: t("login.signInTab") },
            { id: "signup", label: t("login.signUpTab") },
          ]}
        />
      )}

      <form onSubmit={submit} className="space-y-3">
        {mode === "reset" && <p className="text-sm text-slate-600">{t("login.resetText")}</p>}
        {mode === "signup" && (
          <Field label={t("login.name")}>
            <Input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
        )}
        <Field label={t("login.email")}>
          <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {mode !== "reset" && (
          <Field label={t("login.password")} hint={mode === "signup" ? t("login.passwordHint") : undefined}>
            <Input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={mode === "signup" ? MIN_PASSWORD_LENGTH : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
        )}
        {mode === "signup" && (
          <Field label={t("login.confirmPassword")}>
            <Input type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
        )}
        {mismatch && <p role="alert" className="text-sm text-red-700">{t("login.passwordMismatch")}</p>}
        {resetSent && <p role="status" className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">{t("login.resetSent")}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={busy || mismatch}>
          {mode === "signin" ? t("login.signIn") : mode === "signup" ? t("login.signUp") : t("login.sendReset")}
        </Button>
        {mode === "signup" && <p className="text-xs text-slate-600">{t("login.signUpNote")}</p>}
      </form>

      <div className="mt-3 text-sm">
        {mode === "signin" && (
          <button type="button" className="text-brand-800 underline" onClick={() => switchTo("reset")}>
            {t("login.forgot")}
          </button>
        )}
        {mode === "reset" && (
          <button type="button" className="text-brand-800 underline" onClick={() => switchTo("signin")}>
            {t("login.backToSignIn")}
          </button>
        )}
      </div>
    </div>
  );
}
