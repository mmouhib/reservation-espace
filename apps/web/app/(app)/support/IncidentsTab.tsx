"use client";

import { ref, uploadBytes } from "firebase/storage";
import { useState, type FormEvent } from "react";
import { COL } from "@reservation/shared";
import { IncidentPhotos } from "@/components/support/IncidentPhotos";
import { IncidentStatusBadge } from "@/components/support/StatusBadges";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, Section } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { api } from "@/lib/api/functions";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFirebase } from "@/lib/firebase/client";
import { formatDateTime } from "@/lib/format";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useI18n } from "@/lib/i18n/I18nProvider";

const MAX_PHOTOS = 3;

export function IncidentsTab() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const flash = useFlash();
  const online = useOnlineStatus();
  const uid = user?.uid;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const spacesQuery = useCallableQuery("listSpaces", api.listSpaces, {});
  const spaces = [...(spacesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const incidentsQuery = useCallableQuery("listMyIncidents", api.listMyIncidents, {});
  const incidents = incidentsQuery.data ?? [];

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setBusy(true);
    try {
      // Photos are uploaded first; the server checks that each path is under incidents/{uid}/.
      const { storage } = getFirebase();
      const photoPaths: string[] = [];
      for (const file of photos) {
        const path = `${COL.incidents}/${uid}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
        await uploadBytes(ref(storage, path), file);
        photoPaths.push(path);
      }
      await api.createIncident({
        title: title.trim(),
        description: description.trim(),
        spaceId: spaceId || null,
        photoPaths,
      });
      flash.success("support.incidentSent");
      setTitle("");
      setDescription("");
      setSpaceId("");
      setPhotos([]);
      incidentsQuery.refetch();
    } catch (err) {
      flash.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title={t("support.newIncident")} icon="alert">
        <form onSubmit={submit} className="space-y-4">
          <Field label={t("support.incidentTitle")}>
            <Input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label={t("support.incidentDescription")}>
            <Textarea required maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field label={`${t("support.incidentSpace")} ${t("common.optional")}`}>
            <Select value={spaceId} onChange={(e) => setSpaceId(e.target.value)}>
              <option value="">{t("support.noSpace")}</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("support.photos")}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos([...(e.target.files ?? [])].slice(0, MAX_PHOTOS))}
              className="block w-full text-sm file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:font-medium"
            />
          </Field>
          <Button type="submit" disabled={busy || !online}>
            {busy ? t("support.sending") : t("support.send")}
          </Button>
          {!online && <p className="text-sm text-amber-800">{t("common.needsConnection")}</p>}
        </form>
      </Section>

      <Section title={t("support.myIncidents")} icon="list">
        {incidents.length === 0 ? (
          <EmptyState icon="alert">{t("support.noIncidents")}</EmptyState>
        ) : (
          <ul className="space-y-3">
            {incidents.map((incident) => (
              <li key={incident.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold">{incident.title}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateTime(incident.createdAt, locale)}
                        {incident.spaceName && ` · ${incident.spaceName}`}
                      </p>
                    </div>
                    <IncidentStatusBadge status={incident.status} />
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{incident.description}</p>
                  <IncidentPhotos paths={incident.photoPaths} />
                  {incident.adminNote && (
                    <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                      <strong>{t("support.answer")} :</strong> {incident.adminNote}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
