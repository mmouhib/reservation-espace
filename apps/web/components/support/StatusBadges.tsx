"use client";

import type { EquipmentRequestStatus, IncidentStatus } from "@reservation/shared";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function IncidentStatusBadge({ status }: { status: IncidentStatus }) {
  const { t } = useI18n();
  const tone = status === "open" ? "warning" : status === "in_progress" ? "info" : "success";
  return <Badge tone={tone}>{t(`incidentStatus.${status}`)}</Badge>;
}

export function EquipmentStatusBadge({ status }: { status: EquipmentRequestStatus }) {
  const { t } = useI18n();
  const tone = status === "pending" ? "warning" : status === "approved" ? "success" : "danger";
  return <Badge tone={tone}>{t(`equipmentStatus.${status}`)}</Badge>;
}
