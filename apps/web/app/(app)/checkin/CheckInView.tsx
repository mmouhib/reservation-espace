"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { formatMinutes, type CheckInResult, type MessageKey } from "@reservation/shared";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/ui/Spinner";
import { api, errorKey } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

type State = { kind: "loading" } | { kind: "done"; result: CheckInResult } | { kind: "error"; key: MessageKey };

const linkClass = "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-100";

/** What a person sees after scanning the QR code of a space: they are checked in to their booking, or told why not. */
export function CheckInView() {
  const { t } = useI18n();
  const spaceId = useSearchParams().get("space") ?? "";
  const valid = /^[\w-]{1,64}$/.test(spaceId);
  const [state, setState] = useState<State>({ kind: "loading" });
  const started = useRef(false);

  useEffect(() => {
    if (!valid || started.current) return;
    started.current = true;
    api
      .checkInToSpace({ spaceId })
      .then((result) => setState({ kind: "done", result }))
      .catch((err) => setState({ kind: "error", key: errorKey(err) }));
  }, [valid, spaceId]);

  if (!valid) return <Card role="alert">{t("checkin.invalid")}</Card>;
  if (state.kind === "loading") {
    return (
      <Card className="flex items-center gap-3">
        <Spinner />
        {t("checkin.checking")}
      </Card>
    );
  }
  if (state.kind === "error") {
    const noBooking = state.key === "errors.noBookingNow";
    return (
      <Card role="alert" className="space-y-4">
        <p className="font-semibold text-slate-900">{t(state.key)}</p>
        {noBooking && <p className="text-sm text-slate-600">{t("checkin.noBookingHelp")}</p>}
        <div className="flex flex-wrap gap-2">
          <Link href="/reserver" className={linkClass}>
            {t("checkin.bookNow")}
          </Link>
          <Link href="/mes-reservations" className={linkClass}>
            {t("checkin.myBookings")}
          </Link>
        </div>
      </Card>
    );
  }

  const { booking, alreadyCheckedIn } = state.result;
  return (
    <Card className="space-y-4 text-center">
      <span className="mx-auto flex size-16 items-center justify-center rounded-full bg-green-100 text-green-800">
        <Icon name="check" className="size-9" />
      </span>
      <h2 className="text-xl font-bold text-slate-900">{alreadyCheckedIn ? t("checkin.already") : t("checkin.done")}</h2>
      <p className="text-slate-700">
        {booking.spaceName} · {formatMinutes(booking.from)} – {formatMinutes(booking.to)}
      </p>
      <Link href="/mes-reservations" className={linkClass}>
        {t("checkin.myBookings")}
      </Link>
    </Card>
  );
}
