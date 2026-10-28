"use client";

import { useState, type FormEvent } from "react";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, Section } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { PageHeader } from "@/components/ui/PageHeader";
import { VisitStatusBadge } from "@/components/visitors/VisitStatusBadge";
import { api } from "@/lib/api/functions";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { formatDate, todayLocal } from "@/lib/format";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function VisitorsPage() {
  const { t, locale } = useI18n();
  const flash = useFlash();
  const online = useOnlineStatus();

  const [siteId, setSiteId] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestCompany, setGuestCompany] = useState("");
  const [visitDate, setVisitDate] = useState(todayLocal());
  const [busy, setBusy] = useState(false);

  const sitesQuery = useCallableQuery("listSites", api.listSites, {});
  const sites = [...(sitesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const myVisits = useCallableQuery("getMyVisits", api.getMyVisits, {}, { pollMs: 30_000 });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!siteId) return;
    setBusy(true);
    try {
      await api.createVisit({
        siteId,
        guestName: guestName.trim(),
        guestEmail: guestEmail.trim() || undefined,
        guestCompany: guestCompany.trim() || undefined,
        visitDate,
      });
      flash.success("visitors.sent");
      setGuestName("");
      setGuestEmail("");
      setGuestCompany("");
      myVisits.refetch();
    } catch (err) {
      flash.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function cancel(visitId: string) {
    try {
      await api.cancelVisit({ visitId });
      flash.success("visitors.cancelled");
      myVisits.refetch();
    } catch (err) {
      flash.error(err);
    }
  }

  return (
    <>
      <DocumentTitle titleKey="nav.visitors" />
      <PageHeader title={t("visitors.title")} description={t("visitors.description")} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t("visitors.newVisit")} icon="user-plus">
          <form onSubmit={submit} className="space-y-4">
            <Field label={t("visitors.site")}>
              <Select required value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                <option value="" disabled>
                  {t("common.none")}
                </option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("visitors.guestName")}>
              <Input required maxLength={120} value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            </Field>
            <Field label={`${t("visitors.guestEmail")} ${t("common.optional")}`}>
              <Input type="email" maxLength={200} value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
            </Field>
            <Field label={`${t("visitors.guestCompany")} ${t("common.optional")}`}>
              <Input maxLength={120} value={guestCompany} onChange={(e) => setGuestCompany(e.target.value)} />
            </Field>
            <Field label={t("common.date")}>
              <Input type="date" required min={todayLocal()} value={visitDate} onChange={(e) => setVisitDate(e.target.value)} />
            </Field>
            <Button type="submit" disabled={busy || !online || !siteId}>
              {busy ? t("visitors.sending") : t("visitors.send")}
            </Button>
            {!online && <p className="text-sm text-amber-800">{t("common.needsConnection")}</p>}
          </form>
        </Section>

        <Section title={t("visitors.myVisits")} icon="list">
          {!myVisits.data || myVisits.data.length === 0 ? (
            <EmptyState icon="user-plus">{t("visitors.noVisits")}</EmptyState>
          ) : (
            <ul className="space-y-3">
              {myVisits.data.map((visit) => (
                <li key={visit.id}>
                  <Card className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{visit.guestName}</p>
                        <p className="text-xs text-slate-500">
                          {formatDate(visit.visitDate, locale)} · {visit.siteName}
                          {visit.guestCompany && ` · ${visit.guestCompany}`}
                        </p>
                      </div>
                      <VisitStatusBadge status={visit.status} />
                    </div>
                    {visit.status === "expected" && (
                      <Button className="mt-3" size="sm" variant="secondary" onClick={() => cancel(visit.id)}>
                        {t("common.cancel")}
                      </Button>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
