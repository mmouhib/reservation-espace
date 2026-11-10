"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { NotificationSummary } from "@reservation/shared";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api/client";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface NotificationPanel {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const PanelContext = createContext<NotificationPanel | null>(null);

/** Lets any screen open the notifications popup (the home page does, from its "unread" link). */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <PanelContext.Provider value={value}>{children}</PanelContext.Provider>;
}

export function useNotificationPanel(): NotificationPanel {
  const panel = useContext(PanelContext);
  if (!panel) throw new Error("useNotificationPanel must be used inside NotificationsProvider");
  return panel;
}

const LIST_INPUT = { limit: 50 };

/** The bell of the header, with the number of unread notifications, and the popup it opens. */
export function NotificationBell() {
  const { t, locale } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const { open, setOpen } = useNotificationPanel();
  const { data, loading, refetch } = useCallableQuery("listMyNotifications", api.listMyNotifications, LIST_INPUT);
  const notifications: NotificationSummary[] = data ?? [];
  const unreadCount = notifications.filter((n) => n.readAt === null).length;
  const container = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  // Closes on a click outside, on Escape (focus goes back to the bell) and when the page changes.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!container.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);
  useEffect(() => setOpen(false), [pathname, setOpen]);

  async function openNotification(notification: NotificationSummary) {
    setOpen(false);
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
    <div ref={container} className="relative">
      <button
        ref={button}
        type="button"
        aria-label={t("nav.notifications")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) refetch();
          setOpen(!open);
        }}
        className="relative flex size-10 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100"
      >
        <Icon name="bell" />
        {unreadCount > 0 && (
          <span className="absolute end-1 top-1 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-5 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        // On a phone the popup spans the width under the header; from sm up it hangs under the bell.
        <div
          role="dialog"
          aria-label={t("notifications.title")}
          className="fixed inset-x-3 top-[3.75rem] z-40 flex max-h-[min(34rem,calc(100dvh-5rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:end-0 sm:top-12 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-semibold text-slate-900">{t("notifications.title")}</h2>
            {unreadCount > 0 && (
              <Button size="sm" variant="ghost" onClick={() => void markAllRead()}>
                {t("notifications.markAllRead")}
              </Button>
            )}
          </div>
          <div className="overflow-y-auto">
            {loading ? (
              <div className="p-6">
                <Spinner />
              </div>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-600">{t("notifications.empty")}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void openNotification(n)}
                      className={cn("flex w-full items-start gap-3 px-4 py-3 text-start hover:bg-slate-50", n.readAt === null && "bg-brand-50/40")}
                    >
                      <span className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", n.readAt === null ? "bg-brand-600" : "bg-transparent")} aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-900">{n.title}</span>
                        <span className="block text-sm text-slate-700">{n.body}</span>
                        <span className="mt-1 block text-xs text-slate-500">{formatDateTime(n.createdAt, locale)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
