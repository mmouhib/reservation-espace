"use client";

import { Button } from "@/components/ui/Button";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function RetryButton() {
  const { t } = useI18n();
  return <Button onClick={() => window.location.reload()}>{t("common.retry")}</Button>;
}
