"use client";

import { collection, orderBy, query, where, type Timestamp } from "firebase/firestore";
import { useMemo, useState, type FormEvent } from "react";
import { COL, addDays, formatMinutes, type Booking, type Site, type Space } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Table, Td } from "@/components/ui/Table";
import { TimeSelect } from "@/components/ui/TimeSelect";
import { api } from "@/lib/api/functions";
import { getFirebase } from "@/lib/firebase/client";
import { useCollection, type WithId } from "@/lib/firebase/hooks";
import { formatDate, todayLocal } from "@/lib/format";
import { useNow } from "@/lib/hooks/useNow";
import { useI18n } from "@/lib/i18n/I18nProvider";

type BookingRow = WithId<Booking<Timestamp>>;
type StatusFilter = "all" | "confirmed" | "cancelled";

export default function BookingsAdminPage() {
  const { t, locale } = useI18n();
  const flash = useFlash();
  const [from, setFrom] = useState(todayLocal());
  const [to, setTo] = useState(addDays(todayLocal(), 7));
  const [status, setStatus] = useState<StatusFilter>("all");
  const [moving, setMoving] = useState<{ booking: BookingRow; spaceId: string; date: string; from: number; to: number } | null>(null);
  const [releasing, setReleasing] = useState<{ booking: BookingRow; reason: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const bookingsQuery = useMemo(
    () => (from && to ? query(collection(getFirebase().db, COL.bookings), where("date", ">=", from), where("date", "<=", to), orderBy("date")) : null),
    [from, to],
  );
  const spacesQuery = useMemo(() => query(collection(getFirebase().db, COL.spaces), orderBy("name")), []);
  const sitesQuery = useMemo(() => query(collection(getFirebase().db, COL.sites), orderBy("name")), []);
  const { data: bookings } = useCollection<Booking<Timestamp>>(bookingsQuery);
  const { data: spaces } = useCollection<Space>(spacesQuery);
  const { data: sites } = useCollection<Site>(sitesQuery);

  const rows = bookings.filter((b) => status === "all" || b.status === status).sort((a, b) => a.date.localeCompare(b.date) || a.from - b.from);
  const now = useNow();

  async function move(e: FormEvent) {
    e.preventDefault();
    if (!moving) return;
    setBusy(true);
    try {
      await api.updateBooking({ bookingId: moving.booking.id, spaceId: moving.spaceId, date: moving.date, from: moving.from, to: moving.to });
      flash.success("admin.bookings.moved");
      setMoving(null);
    } catch (err) {
      flash.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function release(e: FormEvent) {
    e.preventDefault();
    if (!releasing) return;
    setBusy(true);
    try {
      await api.cancelBooking({ bookingId: releasing.booking.id, reason: releasing.reason.trim() || undefined });
      flash.success("admin.bookings.released");
      setReleasing(null);
    } catch (err) {
      flash.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DocumentTitle titleKey="admin.bookings.title" />
      <PageHeader title={t("admin.bookings.title")} description={t("admin.bookings.description")} />

      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
        <Field label={t("common.from")}>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label={t("common.to")}>
          <Input type="date" min={from} value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label={t("common.status")}>
          <Select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="all">{t("common.all")}</option>
            <option value="confirmed">{t("admin.bookings.statusConfirmed")}</option>
            <option value="cancelled">{t("admin.bookings.statusCancelled")}</option>
          </Select>
        </Field>
      </div>

      {rows.length === 0 ? (
        <EmptyState icon="list">{t("admin.bookings.empty")}</EmptyState>
      ) : (
        <Table
          caption={t("admin.bookings.title")}
          headers={[t("common.date"), t("admin.bookings.slot"), t("admin.bookings.space"), t("admin.bookings.user"), t("common.status"), ""]}
        >
          {rows.map((booking) => {
            const upcoming = booking.status === "confirmed" && booking.startsAt.toMillis() > now;
            return (
              <tr key={booking.id}>
                <Td className="whitespace-nowrap">{formatDate(booking.date, locale)}</Td>
                <Td className="whitespace-nowrap">
                  {formatMinutes(booking.from)} – {formatMinutes(booking.to)}
                </Td>
                <Td className="font-medium">{booking.spaceName}</Td>
                <Td>{booking.userName}</Td>
                <Td>
                  <Badge tone={booking.status === "confirmed" ? "success" : "neutral"}>
                    {booking.status === "confirmed" ? t("admin.bookings.statusConfirmed") : t("admin.bookings.statusCancelled")}
                  </Badge>
                </Td>
                <Td>
                  {booking.status === "confirmed" && (
                    <div className="flex justify-end gap-1">
                      {upcoming && (
                        <Button size="sm" variant="secondary" onClick={() => setMoving({ booking, spaceId: booking.spaceId, date: booking.date, from: booking.from, to: booking.to })}>
                          {t("admin.bookings.move")}
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => setReleasing({ booking, reason: "" })}>
                        {t("admin.bookings.release")}
                      </Button>
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </Table>
      )}

      <Modal open={moving !== null} onClose={() => setMoving(null)} title={t("admin.bookings.moveTitle")}>
        {moving && (
          <form onSubmit={move} className="space-y-4">
            <p className="text-sm text-slate-600">{moving.booking.userName}</p>
            <Field label={t("admin.bookings.space")}>
              <Select value={moving.spaceId} onChange={(e) => setMoving({ ...moving, spaceId: e.target.value })}>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {sites.find((site) => site.id === s.siteId)?.name} · {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("common.date")}>
              <Input type="date" required value={moving.date} onChange={(e) => setMoving({ ...moving, date: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("reserve.start")}>
                <TimeSelect value={moving.from} max={23 * 60 + 30} onChange={(f) => setMoving({ ...moving, from: f })} />
              </Field>
              <Field label={t("reserve.end")}>
                <TimeSelect value={moving.to} min={30} onChange={(v) => setMoving({ ...moving, to: v })} />
              </Field>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setMoving(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={busy || moving.to <= moving.from}>
                {t("admin.bookings.move")}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={releasing !== null} onClose={() => setReleasing(null)} title={t("admin.bookings.releaseTitle")}>
        {releasing && (
          <form onSubmit={release} className="space-y-4">
            <p className="text-sm">
              <strong>{releasing.booking.spaceName}</strong> · {releasing.booking.userName} · {formatDate(releasing.booking.date, locale)}
            </p>
            <Field label={t("admin.bookings.reason")}>
              <Input maxLength={200} value={releasing.reason} onChange={(e) => setReleasing({ ...releasing, reason: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setReleasing(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" variant="danger" disabled={busy}>
                {t("admin.bookings.release")}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
