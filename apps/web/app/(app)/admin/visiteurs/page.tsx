"use client";

import { useState } from "react";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { VisitStatusBadge } from "@/components/visitors/VisitStatusBadge";
import { api } from "@/lib/api/client";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { todayLocal } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function VisitorsAdminPage() {
  const { t } = useI18n();
  const flash = useFlash();
  const [date, setDate] = useState(todayLocal());

  const visits = useCallableQuery("listVisitsForDay", api.listVisitsForDay, { date }, { pollMs: 20_000 });

  async function checkIn(visitId: string) {
    try {
      await api.checkInVisit({ visitId });
      visits.refetch();
    } catch (err) {
      flash.error(err);
    }
  }

  async function checkOut(visitId: string) {
    try {
      await api.checkOutVisit({ visitId });
      visits.refetch();
    } catch (err) {
      flash.error(err);
    }
  }

  return (
    <>
      <DocumentTitle titleKey="admin.visitors.title" />
      <PageHeader title={t("admin.visitors.title")} description={t("admin.visitors.description")} />

      <Field label={t("common.date")} className="mb-5 max-w-xs">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value || todayLocal())} />
      </Field>

      {!visits.data ? (
        visits.loading ? (
          <Spinner />
        ) : (
          <EmptyState icon="user-plus">{t("errors.unavailable")}</EmptyState>
        )
      ) : visits.data.length === 0 ? (
        <EmptyState icon="user-plus">{t("admin.visitors.noVisits")}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {visits.data.map((visit) => (
            <li key={visit.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {visit.guestName}
                      {visit.guestCompany && <span className="font-normal text-slate-500"> · {visit.guestCompany}</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {t("admin.visitors.host", { name: visit.hostName })} · {visit.siteName}
                      {visit.guestEmail && ` · ${visit.guestEmail}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <VisitStatusBadge status={visit.status} />
                    {visit.status === "expected" && (
                      <Button size="sm" onClick={() => checkIn(visit.id)}>
                        {t("admin.visitors.checkIn")}
                      </Button>
                    )}
                    {visit.status === "checkedIn" && (
                      <Button size="sm" variant="secondary" onClick={() => checkOut(visit.id)}>
                        {t("admin.visitors.checkOut")}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
