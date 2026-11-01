"use client";

import { useState, type FormEvent } from "react";
import {
  EQUIPMENT_REQUEST_STATUSES,
  INCIDENT_STATUSES,
  type EquipmentRequestStatus,
  type EquipmentRequestSummary,
  type IncidentStatus,
  type IncidentSummary,
} from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { IncidentPhotos } from "@/components/support/IncidentPhotos";
import { EquipmentStatusBadge, IncidentStatusBadge } from "@/components/support/StatusBadges";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, Section } from "@/components/ui/Card";
import { Field, Select, Textarea } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api/functions";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { formatDate, formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

type Handling =
  | { kind: "incident"; item: IncidentSummary; status: IncidentStatus; note: string }
  | { kind: "request"; item: EquipmentRequestSummary; status: EquipmentRequestStatus; note: string };

export default function SupportAdminPage() {
  const { t, locale } = useI18n();
  const flash = useFlash();
  const [handling, setHandling] = useState<Handling | null>(null);

  const incidentsQuery = useCallableQuery("listAllIncidents", api.listAllIncidents, {});
  const requestsQuery = useCallableQuery("listAllEquipmentRequests", api.listAllEquipmentRequests, {});
  const incidents = incidentsQuery.data ?? [];
  const requests = requestsQuery.data ?? [];

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!handling) return;
    try {
      if (handling.kind === "incident") {
        await api.updateIncidentStatus({ incidentId: handling.item.id, status: handling.status, adminNote: handling.note.trim() });
        incidentsQuery.refetch();
      } else {
        await api.updateEquipmentRequestStatus({ requestId: handling.item.id, status: handling.status, adminNote: handling.note.trim() });
        requestsQuery.refetch();
      }
      flash.success("admin.support.updated");
      setHandling(null);
    } catch (err) {
      flash.error(err);
    }
  }

  return (
    <>
      <DocumentTitle titleKey="admin.support.title" />
      <PageHeader title={t("admin.support.title")} description={t("admin.support.description")} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Section title={t("admin.support.incidents")} icon="alert">
          {incidents.length === 0 ? (
            <EmptyState icon="alert">{t("admin.support.noIncidents")}</EmptyState>
          ) : (
            <ul className="space-y-3">
              {incidents.map((incident) => (
                <li key={incident.id}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{incident.title}</p>
                        <p className="text-xs text-slate-500">
                          {t("admin.support.from", { name: incident.reporterName })} · {formatDateTime(incident.createdAt, locale)}
                          {incident.spaceName && ` · ${incident.spaceName}`}
                        </p>
                      </div>
                      <IncidentStatusBadge status={incident.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{incident.description}</p>
                    <IncidentPhotos paths={incident.photoPaths} />
                    {incident.adminNote && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm">{incident.adminNote}</p>}
                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => setHandling({ kind: "incident", item: incident, status: incident.status, note: incident.adminNote })}>
                      {t("common.edit")}
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={t("admin.support.requests")} icon="package">
          {requests.length === 0 ? (
            <EmptyState icon="package">{t("admin.support.noRequests")}</EmptyState>
          ) : (
            <ul className="space-y-3">
              {requests.map((request) => (
                <li key={request.id}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {request.quantity} × {t(`items.${request.item}`)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {t("admin.support.from", { name: request.requesterName })} · {t("support.neededOn")} {formatDate(request.neededOn, locale)}
                        </p>
                      </div>
                      <EquipmentStatusBadge status={request.status} />
                    </div>
                    {request.comment && <p className="mt-2 text-sm text-slate-700">{request.comment}</p>}
                    {request.adminNote && <p className="mt-2 rounded-lg bg-slate-50 p-2 text-sm">{request.adminNote}</p>}
                    <Button className="mt-3" size="sm" variant="secondary" onClick={() => setHandling({ kind: "request", item: request, status: request.status, note: request.adminNote })}>
                      {t("common.edit")}
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Modal open={handling !== null} onClose={() => setHandling(null)} title={handling?.kind === "incident" ? handling.item.title : handling ? t(`items.${handling.item.item}`) : ""}>
        {handling && (
          <form onSubmit={save} className="space-y-4">
            <Field label={t("common.status")}>
              {handling.kind === "incident" ? (
                <Select value={handling.status} onChange={(e) => setHandling({ ...handling, status: e.target.value as IncidentStatus })}>
                  {INCIDENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`incidentStatus.${s}`)}
                    </option>
                  ))}
                </Select>
              ) : (
                <Select value={handling.status} onChange={(e) => setHandling({ ...handling, status: e.target.value as EquipmentRequestStatus })}>
                  {EQUIPMENT_REQUEST_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {t(`equipmentStatus.${s}`)}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label={t("admin.support.note")}>
              <Textarea maxLength={1000} value={handling.note} onChange={(e) => setHandling({ ...handling, note: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setHandling(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("common.save")}</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
