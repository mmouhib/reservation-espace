"use client";

import Link from "next/link";
import { api } from "@/lib/api/functions";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { Icon } from "@/components/ui/Icon";
import { useI18n } from "@/lib/i18n/I18nProvider";

const UNREAD_INPUT = { unreadOnly: true, limit: 50 };

/** The bell of the header, with the number of unread notifications. */
export function NotificationBell() {
  const { t } = useI18n();
  const { data: unread } = useCallableQuery("listMyNotifications", api.listMyNotifications, UNREAD_INPUT);
  const count = unread?.length ?? 0;

  return (
    <Link
      href="/notifications"
      aria-label={t("nav.notifications")}
      className="relative flex size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
    >
      <Icon name="bell" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-5 text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
