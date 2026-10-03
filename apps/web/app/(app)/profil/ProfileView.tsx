"use client";

import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState, type FormEvent } from "react";
import { COL, type Department, type MessageKey, type NotificationPrefs } from "@reservation/shared";
import { usePwa } from "@/components/pwa/PwaProvider";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { errorKey } from "@/lib/api/functions";
import { useAuth, type Profile } from "@/lib/auth/AuthProvider";
import { getFirebase } from "@/lib/firebase/client";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useI18n } from "@/lib/i18n/I18nProvider";

const PREF_KEYS: (keyof NotificationPrefs)[] = ["email", "push", "weeklyDigest"];

/** Department label, falling back to the id until loaded (or if the document is missing). */
function DepartmentName({ id }: { id: string }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    return onSnapshot(
      doc(getFirebase().db, COL.departments, id),
      (snap) => setName(snap.exists() ? (snap.data() as Department).name : null),
      (err) => console.warn("Department listener error", err),
    );
  }, [id]);

  return <>{name ?? id}</>;
}

export function ProfileView() {
  const { profile, role } = useAuth();
  const { canPromptInstall, promptInstall, isStandalone } = usePwa();
  const { t } = useI18n();

  if (!profile) return <Spinner />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="identite" className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 id="identite" className="mb-4 text-lg font-semibold">
          {t("profile.identity")}
        </h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-slate-600">{t("profile.email")}</dt>
          <dd>{profile.email}</dd>
          <dt className="text-slate-600">{t("profile.role")}</dt>
          <dd>{role ? t(`roles.${role}`) : "—"}</dd>
          <dt className="text-slate-600">{t("profile.department")}</dt>
          <dd>{profile.departmentId ? <DepartmentName id={profile.departmentId} /> : "—"}</dd>
        </dl>
        {!isStandalone && canPromptInstall && (
          <Button className="mt-6" variant="secondary" onClick={() => void promptInstall()}>
            {t("profile.installApp")}
          </Button>
        )}
      </section>

      <PreferencesForm key={profile.id} profile={profile} />

      <section aria-labelledby="rgpd" className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
        <h2 id="rgpd" className="mb-2 text-lg font-semibold">
          {t("profile.privacy")}
        </h2>
        <p className="text-sm text-slate-600">{t("profile.privacyText")}</p>
      </section>
    </div>
  );
}

function PreferencesForm({ profile }: { profile: Profile }) {
  const online = useOnlineStatus();
  const { t } = useI18n();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [prefs, setPrefs] = useState<NotificationPrefs>(profile.notificationPrefs);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; key: MessageKey } | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const write = updateDoc(doc(getFirebase().db, COL.users, profile.id), {
      displayName: displayName.trim(),
      notificationPrefs: prefs,
    });
    try {
      if (online) {
        await write;
        setMessage({ kind: "ok", key: "profile.saved" });
      } else {
        // Offline: Firestore queues the write and syncs it when the connection returns.
        write.catch((err) => setMessage({ kind: "error", key: errorKey(err) }));
        setMessage({ kind: "ok", key: "profile.savedOffline" });
      }
    } catch (err) {
      setMessage({ kind: "error", key: errorKey(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-6" aria-labelledby="prefs">
      <h2 id="prefs" className="mb-4 text-lg font-semibold">
        {t("profile.preferences")}
      </h2>

      <label htmlFor="displayName" className="block text-sm font-medium">
        {t("profile.displayName")}
      </label>
      <input
        id="displayName"
        required
        maxLength={80}
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        className="mt-1 block min-h-11 w-full rounded-lg border border-slate-300 px-3"
        autoComplete="name"
      />

      <fieldset className="mt-6">
        <legend className="text-sm font-medium">{t("profile.notifications")}</legend>
        <div className="mt-2 space-y-3">
          {PREF_KEYS.map((key) => (
            <div key={key} className="flex items-start gap-3">
              <input
                id={`pref-${key}`}
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })}
                aria-describedby={`pref-${key}-hint`}
                className="mt-0.5 size-5 accent-brand-700"
              />
              <div>
                <label htmlFor={`pref-${key}`} className="text-sm font-medium">
                  {t(`profile.prefs.${key}.label`)}
                </label>
                <p id={`pref-${key}-hint`} className="text-sm text-slate-600">
                  {t(`profile.prefs.${key}.hint`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex items-center gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? t("common.saving") : t("common.save")}
        </Button>
        <p role="status" className={message?.kind === "error" ? "text-sm text-red-700" : "text-sm text-green-800"}>
          {message && t(message.key)}
        </p>
      </div>
    </form>
  );
}
