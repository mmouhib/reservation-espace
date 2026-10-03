"use client";

import type { ReactNode } from "react";
import { hasRole } from "@reservation/shared";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const { t } = useI18n();
  if (!role || !hasRole(role, "admin")) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
        {t("admin.forbidden")}
      </div>
    );
  }
  return <>{children}</>;
}
