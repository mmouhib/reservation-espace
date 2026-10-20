"use client";

import { collection, limit, orderBy, query, where, type Timestamp } from "firebase/firestore";
import { useMemo, useState, type FormEvent } from "react";
import { COL, formatMinutes, type Absence, type Booking, type Locale } from "@reservation/shared";
import { BookingCard } from "@/components/bookings/BookingCard";
import { Button } from "@/components/ui/Button";
import { EmptyState, Section } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { Tabs } from "@/components/ui/Tabs";
import { TimeSelect } from "@/components/ui/TimeSelect";
import { api } from "@/lib/api/functions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFirebase } from "@/lib/firebase/client";
import { useCollection, type WithId } from "@/lib/firebase/hooks";
import { formatDate, todayLocal } from "@/lib/format";
import { useNow } from "@/lib/hooks/useNow";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useI18n } from "@/lib/i18n/I18nProvider";

type BookingRow = WithId<Booking<Timestamp>>;
type View = "upcoming" | "past";

export function MyBookings() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const uid = user?.uid;
  const [view, setView] = useState<View>("upcoming");

  const bookingsQuery = useMemo(
    () => (uid ? query(collection(getFirebase().db, COL.bookings), where("userId", "==", uid), orderBy("date", "desc"), limit(100)) : null),
    [uid],
  );
  const { data: bookings, loading } = useCollection<Booking<Timestamp>>(bookingsQuery);

  // A booking is upcoming until it starts, and only if it was not cancelled.
  const now = useNow();
  const isUpcoming = (b: BookingRow) => b.status === "confirmed" && b.startsAt.toMillis() > now;
  const upcoming = bookings.filter(isUpcoming).sort((a, b) => a.date.localeCompare(b.date) || a.from - b.from);
  const past = bookings.filter((b) => !isUpcoming(b)).sort((a, b) => b.date.localeCompare(a.date) || b.from - a.from);
  const shown = view === "upcoming" ? upcoming : past;

  const [changing, setChanging] = useState<BookingRow | null>(null);
  const [cancelling, setCancelling] = useState<BookingRow | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <Tabs
          value={view}
          onChange={setView}
          tabs={[
            { id: "upcoming", label: `${t("myBookings.upcoming")} (${upcoming.length})` },
            { id: "past", label: t("myBookings.past") },
          ]}
        />
        {loading ? (
          <Spinner />
        ) : shown.length === 0 ? (
          <EmptyState icon="list">{view === "upcoming" ? t("myBookings.emptyUpcoming") : t("myBookings.emptyPast")}</EmptyState>
        ) : (
          <ul className="space-y-3">
            {shown.map((booking) => (
              <li key={booking.id}>
                <BookingCard
                  booking={booking}
                  actions={
                    view === "upcoming" && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => setChanging(booking)}>
                          {t("myBookings.change")}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setCancelling(booking)}>
                          {t("myBookings.cancel")}
                        </Button>
                      </>
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <Absences />

      <ChangeBookingModal booking={changing} onClose={() => setChanging(null)} />
      <CancelBookingModal booking={cancelling} onClose={() => setCancelling(null)} locale={locale} />
    </div>
  );
}

function ChangeBookingModal({ booking, onClose }: { booking: BookingRow | null; onClose: () => void }) {
  const { t } = useI18n();
  const flash = useFlash();
  const online = useOnlineStatus();
  const [busy, setBusy] = useState(false);
  // Form values start from the booking and are only kept while the dialog is open.
  const [edit, setEdit] = useState<{ id: string; date: string; from: number; to: number; attendees: number } | null>(null);
  const form = booking ? (edit?.id === booking.id ? edit : { id: booking.id, date: booking.date, from: booking.from, to: booking.to, attendees: booking.attendees }) : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    try {
      await api.updateBooking({ bookingId: form.id, date: form.date, from: form.from, to: form.to, attendees: form.attendees });
      flash.success("myBookings.updated");
      onClose();
    } catch (err) {
      flash.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={booking !== null} onClose={onClose} title={t("myBookings.changeTitle")}>
      {booking && form && (
        <form onSubmit={submit} className="space-y-4">
          <p className="font-semibold">{booking.spaceName}</p>
          <Field label={t("reserve.date")}>
            <Input type="date" required value={form.date} onChange={(e) => setEdit({ ...form, date: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("reserve.start")}>
              <TimeSelect value={form.from} max={23 * 60 + 30} onChange={(from) => setEdit({ ...form, from })} />
            </Field>
            <Field label={t("reserve.end")}>
              <TimeSelect value={form.to} min={30} onChange={(to) => setEdit({ ...form, to })} />
            </Field>
          </div>
          <Field label={t("reserve.attendees")}>
            <Input type="number" min={1} value={form.attendees} onChange={(e) => setEdit({ ...form, attendees: Math.max(1, Number(e.target.value)) })} />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={onClose}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={busy || !online || form.to <= form.from}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function CancelBookingModal({ booking, onClose, locale }: { booking: BookingRow | null; onClose: () => void; locale: Locale }) {
  const { t } = useI18n();
  const flash = useFlash();
  const [busy, setBusy] = useState(false);

  async function confirm() {
    if (!booking) return;
    setBusy(true);
    try {
      await api.cancelBooking({ bookingId: booking.id });
      flash.success("myBookings.cancelled");
      onClose();
    } catch (err) {
      flash.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ConfirmModal open={booking !== null} onClose={onClose} onConfirm={() => void confirm()} title={t("myBookings.cancelTitle")} confirmLabel={t("myBookings.cancel")} danger busy={busy}>
      {booking && (
        <>
          <strong>{booking.spaceName}</strong> · {formatDate(booking.date, locale)} · {formatMinutes(booking.from)} – {formatMinutes(booking.to)}
          <br />
          {t("myBookings.cancelConfirm")}
        </>
      )}
    </ConfirmModal>
  );
}

/** Periods when the user is away. Declaring one cancels the bookings inside it. */
function Absences() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const flash = useFlash();
  const uid = user?.uid;

  const absencesQuery = useMemo(() => (uid ? query(collection(getFirebase().db, COL.absences), where("userId", "==", uid)) : null), [uid]);
  const { data } = useCollection<Absence<Timestamp>>(absencesQuery);
  const absences = [...data].sort((a, b) => b.from.localeCompare(a.from));

  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(todayLocal());
  const [to, setTo] = useState(todayLocal());
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function declare(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { cancelled } = await api.declareAbsence({ from, to, note });
      flash.success("myBookings.absenceDeclared", { count: cancelled });
      setOpen(false);
      setNote("");
    } catch (err) {
      flash.error(err);
    } finally {
      setBusy(false);
    }
  }

  async function remove(absenceId: string) {
    try {
      await api.removeAbsence({ absenceId });
      flash.success("myBookings.absenceRemoved");
    } catch (err) {
      flash.error(err);
    }
  }

  return (
    <Section
      title={t("myBookings.absences")}
      icon="clock"
      actions={
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          {t("myBookings.declareAbsence")}
        </Button>
      }
    >
      <p className="mb-4 text-sm text-slate-600">{t("myBookings.absencesHint")}</p>
      {absences.length === 0 ? (
        <p className="text-sm text-slate-600">{t("myBookings.noAbsences")}</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {absences.map((absence) => (
            <li key={absence.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                {formatDate(absence.from, locale)} → {formatDate(absence.to, locale)}
                {absence.note && <span className="text-slate-600"> · {absence.note}</span>}
              </span>
              <Button size="sm" variant="ghost" onClick={() => void remove(absence.id)}>
                {t("common.delete")}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t("myBookings.declareAbsence")}>
        <form onSubmit={declare} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("myBookings.absenceFrom")}>
              <Input type="date" required value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label={t("myBookings.absenceTo")}>
              <Input type="date" required min={from} value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </div>
          <Field label={`${t("myBookings.absenceNote")} ${t("common.optional")}`}>
            <Textarea maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={busy || to < from}>
              {t("common.save")}
            </Button>
          </div>
        </form>
      </Modal>
    </Section>
  );
}
