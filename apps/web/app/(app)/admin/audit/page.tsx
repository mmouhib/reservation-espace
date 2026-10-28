"use client";

import { useState } from "react";
import { isMessageKey, type MessageKey } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { Field, Select } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td } from "@/components/ui/Table";
import { api } from "@/lib/api/functions";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

const PAGE = 50;

const ACTIONS = [
  "booking.created",
  "booking.updated",
  "booking.cancelled",
  "absence.declared",
  "credits.purchased",
  "credits.adjusted",
  "subscription.cancelled",
  "user.created",
  "user.role_changed",
  "user.disabled",
  "user.org_changed",
  "user.anonymized",
];

export default function AuditPage() {
  const { t, locale } = useI18n();
  const [action, setAction] = useState("");
  const [count, setCount] = useState(PAGE);

  // Names of actors and users come resolved from the server.
  const logs = useCallableQuery("listAuditLogs", api.listAuditLogs, { action: action || undefined, limit: count });

  const actionLabel = (name: string): string => {
    const key = `admin.audit.actions.${name}`;
    return isMessageKey(key) ? t(key as MessageKey) : name;
  };
  const actorName = (id: string, name: string) => (id === "system" ? t("admin.audit.system") : name);
  const rows = logs.data ?? [];

  return (
    <>
      <DocumentTitle titleKey="admin.audit.title" />
      <PageHeader title={t("admin.audit.title")} description={t("admin.audit.description")} />

      <div className="mb-4 max-w-xs">
        <Field label={t("admin.audit.action")}>
          <Select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setCount(PAGE);
            }}
          >
            <option value="">{t("admin.audit.allActions")}</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {actionLabel(a)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="clipboard">{t("admin.audit.empty")}</EmptyState>
      ) : (
        <>
          <Table caption={t("admin.audit.title")} headers={[t("admin.audit.when"), t("admin.audit.actor"), t("admin.audit.action"), t("admin.audit.target")]}>
            {rows.map((log) => (
              <tr key={log.id}>
                <Td className="whitespace-nowrap text-slate-600">{formatDateTime(log.createdAt, locale)}</Td>
                <Td>
                  {actorName(log.actorId, log.actorName)} <Badge>{log.actorRole}</Badge>
                </Td>
                <Td className="font-medium">{actionLabel(log.action)}</Td>
                <Td className="text-slate-600">
                  {log.targetType === "user" ? (log.targetName ?? log.targetId) : `${log.targetType} ${log.targetId.slice(0, 8)}`}
                </Td>
              </tr>
            ))}
          </Table>
          {rows.length >= count && (
            <div className="mt-4 flex justify-center">
              <Button variant="secondary" onClick={() => setCount(count + PAGE)}>
                {t("admin.users.loadMore")}
              </Button>
            </div>
          )}
        </>
      )}
    </>
  );
}
