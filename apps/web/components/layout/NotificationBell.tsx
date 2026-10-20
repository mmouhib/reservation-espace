"use client";

import { collection, limit, query, where } from "firebase/firestore";
import Link from "next/link";
import { useMemo } from "react";
import { COL, type AppNotification } from "@reservation/shared";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFirebase } from "@/lib/firebase/client";
import { useCollection } from "@/lib/firebase/hooks";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** The bell of the header, with the number of unread notifications. */
export function NotificationBell() {
  const { user } = useAuth();
  const { t } = useI18n();
  const uid = user?.uid;

  const unreadQuery = useMemo(
    () => (uid ? query(collection(getFirebase().db, COL.users, uid, COL.notifications), where("readAt", "==", null), limit(50)) : null),
    [uid],
  );
  const { data: unread } = useCollection<AppNotification>(unreadQuery);

  return (
    <Link
      href="/notifications"
      aria-label={t("nav.notifications")}
      className="relative flex size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
    >
      <Icon name="bell" />
      {unread.length > 0 && (
        <span className="absolute right-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-5 text-white">
          {unread.length > 9 ? "9+" : unread.length}
        </span>
      )}
    </Link>
  );
}
