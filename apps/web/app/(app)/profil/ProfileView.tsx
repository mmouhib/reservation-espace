"use client";

import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { COL, type Department, type MessageKey, type NotificationPrefs, type Team } from "@reservation/shared";
import { usePwa } from "@/components/pwa/PwaProvider";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { ConfirmModal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { api, errorKey } from "@/lib/api/functions";
import { useAuth, type Profile } from "@/lib/auth/AuthProvider";
import { getFirebase } from "@/lib/firebase/client";
import { requestPushToken } from "@/lib/firebase/messaging";
import { useCollection } from "@/lib/firebase/hooks";
import { downloadFile } from "@/lib/format";
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

  const teamsQuery = useMemo(
    () => (profile ? query(collection(getFirebase().db, COL.teams), where("memberIds", "array-contains", profile.id)) : null),
    [profile],
  );
  const { data: teams } = useCollection<Team>(teamsQuery);

  if (!profile) return <Spinner />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title={t("profile.identity")} icon="user">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-slate-600">{t("profile.email")}</dt>
          <dd>{profile.email}</dd>
          <dt className="text-slate-600">{t("profile.role")}</dt>
          <dd>{role ? t(`roles.${role}`) : "—"}</dd>
          <dt className="text-slate-600">{t("profile.department")}</dt>
          <dd>{profile.departmentId ? <DepartmentName id={profile.departmentId} /> : "—"}</dd>
          <dt className="text-slate-600">{t("profile.team")}</dt>
          <dd>{teams.length > 0 ? teams.map((team) => team.name).join(", ") : t("profile.noTeam")}</dd>
        </dl>
        {!isStandalone && canPromptInstall && (
          <Button className="mt-6" variant="secondary" onClick={() => void promptInstall()}>
            {t("profile.installApp")}
          </Button>
        )}
      </Section>

      <PreferencesForm key={profile.id} profile={profile} />
      <PersonalData />
    </div>
  );
}

function PreferencesForm({ profile }: { profile: Profile }) {
  const online = useOnlineStatus();
  const flash = useFlash();
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

  /** Asks the browser for permission and stores this device's push token on the profile. */
  async function enablePush() {
    try {
      const token = await requestPushToken();
      if (!token) {
        flash.failure(Notification.permission === "denied" ? "profile.push.denied" : "profile.push.unavailable");
        return;
      }
      await setDoc(doc(getFirebase().db, COL.users, profile.id, COL.devices, token.slice(0, 40)), {
        fcmToken: token,
        platform: navigator.platform,
        userAgent: navigator.userAgent.slice(0, 200),
        lastSeenAt: serverTimestamp(),
      });
      flash.success("profile.push.enabled");
    } catch (err) {
      flash.error(err);
    }
  }

  return (
    <Section title={t("profile.preferences")} icon="bell">
      <form onSubmit={onSubmit}>
        <Field label={t("profile.displayName")}>
          <Input required maxLength={80} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoComplete="name" />
        </Field>

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
                  {key === "push" && prefs.push && (
                    <Button size="sm" variant="secondary" className="mt-2" onClick={() => void enablePush()}>
                      {t("profile.push.enable")}
                    </Button>
                  )}
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
    </Section>
  );
}

/** GDPR: download everything we store about the user, or delete the account. */
function PersonalData() {
  const { signOut } = useAuth();
  const flash = useFlash();
  const online = useOnlineStatus();
  const { t } = useI18n();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function exportData() {
    try {
      const data = await api.exportMyData({});
      downloadFile("my-data.json", JSON.stringify(data, null, 2), "application/json");
    } catch (err) {
      flash.error(err);
    }
  }

  async function deleteAccount() {
    setBusy(true);
    try {
      await api.deleteMyAccount({});
      await signOut();
    } catch (err) {
      flash.error(err);
      setBusy(false);
    }
  }

  return (
    <Section title={t("profile.privacy")} icon="shield" className="lg:col-span-2">
      <p className="mb-4 text-sm text-slate-600">{t("profile.privacyText")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => void exportData()} disabled={!online}>
          {t("profile.export")}
        </Button>
        <Button variant="danger" onClick={() => setConfirming(true)} disabled={!online}>
          {t("profile.deleteAccount")}
        </Button>
        <p className="text-xs text-slate-500">{t("profile.exportHint")}</p>
      </div>
      <ConfirmModal
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => void deleteAccount()}
        title={t("profile.deleteTitle")}
        confirmLabel={t("profile.deleteAccount")}
        danger
        busy={busy}
      >
        {t("profile.deleteConfirm")}
      </ConfirmModal>
    </Section>
  );
}
