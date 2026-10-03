"use client";

import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useEffect, useState, type FormEvent } from "react";
import { COL, ROLE_LABELS, type Department, type NotificationPrefs } from "@reservation/shared";
import { usePwa } from "@/components/pwa/PwaProvider";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { errorMessage } from "@/lib/api/functions";
import { useAuth, type Profile } from "@/lib/auth/AuthProvider";
import { getFirebase } from "@/lib/firebase/client";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";

const PREF_LABELS: Record<keyof NotificationPrefs, { label: string; hint: string }> = {
  email: { label: "E-mails", hint: "Confirmations, annulations et rappels." },
  push: { label: "Notifications push", hint: "Rappels 24 h avant et alertes sur vos espaces." },
  weeklyDigest: { label: "Récapitulatif hebdomadaire", hint: "Chaque lundi, vos réservations de la semaine." },
};

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

  if (!profile) return <Spinner />;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section aria-labelledby="identite" className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 id="identite" className="mb-4 text-lg font-semibold">
          Identité
        </h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
          <dt className="text-slate-600">E-mail</dt>
          <dd>{profile.email}</dd>
          <dt className="text-slate-600">Rôle</dt>
          <dd>{role ? ROLE_LABELS[role] : "—"}</dd>
          <dt className="text-slate-600">Département</dt>
          <dd>{profile.departmentId ? <DepartmentName id={profile.departmentId} /> : "—"}</dd>
        </dl>
        {!isStandalone && canPromptInstall && (
          <Button className="mt-6" variant="secondary" onClick={() => void promptInstall()}>
            Installer l&apos;application
          </Button>
        )}
      </section>

      <PreferencesForm key={profile.id} profile={profile} />

      <section aria-labelledby="rgpd" className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-2">
        <h2 id="rgpd" className="mb-2 text-lg font-semibold">
          Données personnelles
        </h2>
        <p className="text-sm text-slate-600">
          L&apos;export de vos données et la suppression de votre compte seront disponibles ici (phase 6).
        </p>
      </section>
    </div>
  );
}

function PreferencesForm({ profile }: { profile: Profile }) {
  const online = useOnlineStatus();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [prefs, setPrefs] = useState<NotificationPrefs>(profile.notificationPrefs);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

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
        setMessage({ kind: "ok", text: "Préférences enregistrées." });
      } else {
        // Offline: Firestore queues the write and syncs it when the connection returns.
        write.catch((err) => setMessage({ kind: "error", text: errorMessage(err) }));
        setMessage({ kind: "ok", text: "Enregistré localement, synchronisation au retour du réseau." });
      }
    } catch (err) {
      setMessage({ kind: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-slate-200 bg-white p-6" aria-labelledby="prefs">
      <h2 id="prefs" className="mb-4 text-lg font-semibold">
        Préférences
      </h2>

      <label htmlFor="displayName" className="block text-sm font-medium">
        Nom affiché
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
        <legend className="text-sm font-medium">Notifications</legend>
        <div className="mt-2 space-y-3">
          {(Object.keys(PREF_LABELS) as (keyof NotificationPrefs)[]).map((key) => (
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
                  {PREF_LABELS[key].label}
                </label>
                <p id={`pref-${key}-hint`} className="text-sm text-slate-600">
                  {PREF_LABELS[key].hint}
                </p>
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <div className="mt-6 flex items-center gap-4">
        <Button type="submit" disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <p role="status" className={message?.kind === "error" ? "text-sm text-red-700" : "text-sm text-green-800"}>
          {message?.text}
        </p>
      </div>
    </form>
  );
}
