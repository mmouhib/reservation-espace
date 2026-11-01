"use client";

import { useRouter } from "next/navigation";
import type { NotificationSummary } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api/client";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function NotificationsPage() {
  const router = useRouter();
  const { t, locale } = useI18n();

  const { data, loading, refetch } = useCallableQuery("listMyNotifications", api.listMyNotifications, { limit: 50 });
  const notifications: NotificationSummary[] = data ?? [];
  const unread = notifications.filter((n) => n.readAt === null);

  async function open(notification: NotificationSummary) {
    if (notification.readAt === null) {
      try {
        await api.markNotificationRead({ notificationId: notification.id });
      } catch (err) {
        console.warn("Could not mark the notification as read", err);
      }
      refetch();
    }
    router.push(notification.link);
  }

  async function markAllRead() {
    try {
      await api.markAllNotificationsRead({});
    } finally {
      refetch();
    }
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
