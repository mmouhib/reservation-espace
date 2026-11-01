"use client";

import type { VisitStatus } from "@reservation/shared";
import { Badge } from "@/components/ui/Badge";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function VisitStatusBadge({ status }: { status: VisitStatus }) {
  const { t } = useI18n();
  const tone = status === "expected" ? "info" : status === "checkedIn" ? "success" : status === "checkedOut" ? "neutral" : "danger";
  return <Badge tone={tone}>{t(`visitStatus.${status}`)}</Badge>;
}
