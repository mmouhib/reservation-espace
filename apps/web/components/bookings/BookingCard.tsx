"use client";

import type { Timestamp } from "firebase/firestore";
import type { ReactNode } from "react";
import { formatMinutes, type Booking } from "@reservation/shared";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import type { WithId } from "@/lib/firebase/hooks";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** One booking: a date tile, the space, the time range and the price, with optional action buttons. */
export function BookingCard({ booking, actions }: { booking: WithId<Booking<Timestamp>>; actions?: ReactNode }) {
  const { t, locale } = useI18n();
  const cancelled = booking.status === "cancelled";
  const month = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(`${booking.date}T00:00:00Z`));

  return (
    <Card className={cn("flex flex-wrap items-center gap-4 p-4", cancelled && "opacity-60")}>
      <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-800">
        <span className="text-lg font-bold leading-none">{Number(booking.date.slice(8))}</span>
        <span className="mt-0.5 text-xs uppercase">{month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-900">{booking.spaceName}</p>
        <p className="text-sm text-slate-600">
          {formatDate(booking.date, locale)} · {formatMinutes(booking.from)} – {formatMinutes(booking.to)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {cancelled ? (
          <Badge>{t("myBookings.cancelledBadge")}</Badge>
        ) : (
          booking.credits > 0 && <Badge tone="info">{t("common.credits", { count: booking.credits })}</Badge>
        )}
        {actions}
      </div>
    </Card>
  );
}
