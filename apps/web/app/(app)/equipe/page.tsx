"use client";

import { useState } from "react";
import { formatMinutes, hasRole, INTL_LOCALE } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Badge } from "@/components/ui/Badge";
import { Card, EmptyState } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api/client";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { useAuth } from "@/lib/auth/AuthProvider";
import { todayLocal } from "@/lib/format";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** For managers: who in their teams has booked what on a given day. */
export default function TeamPage() {
  const { role } = useAuth();
  const { t, locale } = useI18n();
  const online = useOnlineStatus();
  const [date, setDate] = useState(todayLocal());
  const allowed = role !== null && hasRole(role, "manager");

  const team = useCallableQuery("teamBookings", api.teamBookings, allowed ? { date } : null, { pollMs: 30_000 });
  const result = team.data;

  return (
    <>
      <DocumentTitle titleKey="nav.team" />
      <PageHeader title={t("team.title")} description={t("team.description")} />
      {!allowed ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
          {t("errors.forbidden")}
        </div>
      ) : (
        <div className="space-y-5">
          <Field label={t("reserve.date")} className="max-w-xs">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value || todayLocal())} />
          </Field>

          {result && team.fromCache && team.savedAt && (
            <p className="text-sm text-amber-800">
              {t("offline.staleSince", {
                date: new Intl.DateTimeFormat(INTL_LOCALE[locale], { dateStyle: "medium", timeStyle: "short" }).format(team.savedAt),
              })}
            </p>
          )}
          {!result ? (
            team.loading ? (
              <Spinner />
            ) : (
              <EmptyState icon="users">{online ? t("errors.unavailable") : t("offline.notCached")}</EmptyState>
            )
          ) : result.members.length === 0 ? (
            <EmptyState icon="users">{t("team.noTeam")}</EmptyState>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-start text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">{t("team.member")}</th>
                    <th scope="col" className="px-4 py-3 font-medium">{t("team.team")}</th>
                    <th scope="col" className="px-4 py-3 font-medium">{t("team.bookings")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {result.members.map((member) => {
                    const bookings = result.bookings.filter((b) => b.userId === member.uid);
                    return (
                      <tr key={member.uid}>
                        <td className="px-4 py-3 font-medium">{member.name}</td>
                        <td className="px-4 py-3 text-slate-600">{member.teamName}</td>
                        <td className="px-4 py-3">
                          {bookings.length === 0 ? (
                            <span className="text-slate-500">{t("team.noBooking")}</span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {bookings.map((b) => (
                                <Badge key={b.id} tone="info">
                                  {b.spaceName} · {formatMinutes(b.from)}–{formatMinutes(b.to)}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
