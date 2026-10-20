"use client";

import { collection, doc, limit, orderBy, query, serverTimestamp, writeBatch, type Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { COL, type AppNotification } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/cn";
import { getFirebase } from "@/lib/firebase/client";
import { useCollection, type WithId } from "@/lib/firebase/hooks";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const uid = user?.uid;

  const notificationsQuery = useMemo(
    () => (uid ? query(collection(getFirebase().db, COL.users, uid, COL.notifications), orderBy("createdAt", "desc"), limit(50)) : null),
    [uid],
  );
  const { data: notifications, loading } = useCollection<AppNotification<Timestamp>>(notificationsQuery);
  const unread = notifications.filter((n) => n.readAt === null);

  const refOf = (id: string) => doc(getFirebase().db, COL.users, uid!, COL.notifications, id);

  async function open(notification: WithId<AppNotification<Timestamp>>) {
    if (notification.readAt === null) await writeBatch(getFirebase().db).update(refOf(notification.id), { readAt: serverTimestamp() }).commit();
    router.push(notification.link);
  }

  async function markAllRead() {
    const batch = writeBatch(getFirebase().db);
    for (const n of unread) batch.update(refOf(n.id), { readAt: serverTimestamp() });
    await batch.commit();
  }

  return (
    <>
      <DocumentTitle titleKey="nav.notifications" />
      <PageHeader
        title={t("notifications.title")}
        description={t("notifications.description")}
        actions={
          unread.length > 0 && (
            <Button variant="secondary" onClick={() => void markAllRead()}>
              {t("notifications.markAllRead")}
            </Button>
          )
        }
      />
      {loading ? (
        <Spinner />
      ) : notifications.length === 0 ? (
        <EmptyState icon="bell">{t("notifications.empty")}</EmptyState>
      ) : (
        <ul className="space-y-3">
          {notifications.map((n) => (
            <li key={n.id}>
              <Card className={cn("p-0", n.readAt === null && "border-brand-600/40 bg-brand-50/40")}>
                <button type="button" onClick={() => void open(n)} className="flex w-full items-start gap-3 p-4 text-left">
                  <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", n.readAt === null ? "bg-brand-600" : "bg-transparent")} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-slate-900">{n.title}</span>
                    <span className="block text-sm text-slate-700">{n.body}</span>
                    <span className="mt-1 block text-xs text-slate-500">{formatDateTime(n.createdAt, locale)}</span>
                  </span>
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
