"use client";

import { useState, type FormEvent } from "react";
import type { EventSummary } from "@reservation/shared";
import { Button } from "@/components/ui/Button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { Modal } from "@/components/ui/Modal";
import { TimeSelect } from "@/components/ui/TimeSelect";
import { api } from "@/lib/api/client";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** What the form starts with: a new event on a day (and a time), or an existing event. */
export type EventDraft = { event: EventSummary } | { date: string; from: number; to: number; allDay?: boolean };

function EventForm({ draft, onClose, onChanged }: { draft: EventDraft; onClose: () => void; onChanged: () => void }) {
  const { t } = useI18n();
  const flash = useFlash();
  const existing = "event" in draft ? draft.event : null;
  const start = existing ?? (draft as { date: string; from: number; to: number; allDay?: boolean });

  const [title, setTitle] = useState(existing?.title ?? "");
  const [date, setDate] = useState(start.date);
  const [allDay, setAllDay] = useState(existing?.allDay ?? ("allDay" in start ? (start.allDay ?? false) : false));
  const [from, setFrom] = useState(existing && !existing.allDay ? existing.from : existing ? 9 * 60 : start.from);
  const [to, setTo] = useState(existing && !existing.allDay ? existing.to : existing ? 10 * 60 : start.to);
  const [note, setNote] = useState(existing?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const endsBeforeStart = !allDay && to <= from;

  async function save(e: FormEvent) {
    e.preventDefault();
    if (endsBeforeStart) return;
    setBusy(true);
    try {
      const data = { title: title.trim(), date, allDay, from, to, note: note.trim() };
      if (existing) await api.updateEvent({ eventId: existing.id, ...data });
      else await api.createEvent(data);
      flash.success("calendar.event.saved");
      onChanged();
      onClose();
    } catch (err) {
      flash.error(err);
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing) return;
    setBusy(true);
    try {
      await api.deleteEvent({ eventId: existing.id });
      flash.success("calendar.event.deleted");
      onChanged();
      onClose();
    } catch (err) {
      flash.error(err);
      setBusy(false);
    }
  }

  if (confirmingDelete && existing) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-slate-700">{t("calendar.event.deleteText", { title: existing.title })}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setConfirmingDelete(false)} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={() => void remove()} disabled={busy}>
            {t("calendar.event.delete")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void save(e)} className="space-y-4">
      <Field label={t("calendar.event.title")}>
        <Input required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </Field>
      <Field label={t("calendar.event.date")}>
        <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Checkbox label={t("calendar.allDay")} checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />
      {!allDay && (
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("calendar.event.from")}>
            <TimeSelect value={from} onChange={setFrom} max={24 * 60 - 30} />
          </Field>
          <Field label={t("calendar.event.to")}>
            <TimeSelect value={to} onChange={setTo} min={30} />
          </Field>
        </div>
      )}
      {endsBeforeStart && <p role="alert" className="text-sm text-red-700">{t("calendar.event.endBeforeStart")}</p>}
      <Field label={t("calendar.event.note")}>
        <Textarea maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        {existing ? (
          <Button variant="ghost" onClick={() => setConfirmingDelete(true)} disabled={busy}>
            {t("calendar.event.delete")}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={busy || endsBeforeStart || title.trim() === ""}>
            {busy ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** Adds an event, or changes or deletes one. The form is rebuilt each time the dialog opens. */
export function EventModal({ draft, onClose, onChanged }: { draft: EventDraft | null; onClose: () => void; onChanged: () => void }) {
  const { t } = useI18n();
  return (
    <Modal open={draft !== null} onClose={onClose} title={draft && "event" in draft ? t("calendar.event.editTitle") : t("calendar.event.newTitle")}>
      {draft && <EventForm draft={draft} onClose={onClose} onChanged={onChanged} />}
    </Modal>
  );
}
