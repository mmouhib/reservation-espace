"use client";

import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { useMemo, useState, type FormEvent } from "react";
import { COL, formatMinutes, type Floor, type OpeningHours, type Site, type Space } from "@reservation/shared";
import { OpeningHoursEditor } from "@/components/spaces/OpeningHoursEditor";
import { Button } from "@/components/ui/Button";
import { EmptyState, Section } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { getFirebase } from "@/lib/firebase/client";
import type { WithId } from "@/lib/firebase/hooks";
import { useI18n } from "@/lib/i18n/I18nProvider";

const OFFICE_HOURS: OpeningHours = {
  mon: [{ from: 8 * 60, to: 19 * 60 }],
  tue: [{ from: 8 * 60, to: 19 * 60 }],
  wed: [{ from: 8 * 60, to: 19 * 60 }],
  thu: [{ from: 8 * 60, to: 19 * 60 }],
  fri: [{ from: 8 * 60, to: 18 * 60 }],
  sat: [],
  sun: [],
};

interface SiteDraft {
  id: string | null;
  name: string;
  address: string;
  timeZone: string;
  floorsText: string;
  hours: OpeningHours;
  /** Floors the site had when the form was opened, to keep their ids. */
  existingFloors: Floor[];
}

/** One floor per line. A floor that keeps its label keeps its id, so spaces stay attached to it. */
function floorsFromText(text: string, existing: Floor[]): Floor[] {
  const labels = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const usedIds = new Set(existing.map((f) => f.id));
  let next = 1;
  return labels.map((label) => {
    const known = existing.find((f) => f.label === label);
    if (known) return known;
    while (usedIds.has(String(next))) next += 1;
    usedIds.add(String(next));
    return { id: String(next), label };
  });
}

function timeZones(): string[] {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return ["Europe/Paris", "UTC"];
  }
}

function hoursSummary(hours: OpeningHours): string {
  const days = Object.values(hours).filter((ranges) => ranges.length > 0);
  const first = days[0]?.[0];
  return first ? `${formatMinutes(first.from)}–${formatMinutes(first.to)} · ${days.length}/7` : "—";
}

export function SitesSection({ sites, spaces }: { sites: WithId<Site>[]; spaces: WithId<Space>[] }) {
  const { t } = useI18n();
  const flash = useFlash();
  const zones = useMemo(() => timeZones(), []);
  const [draft, setDraft] = useState<SiteDraft | null>(null);
  const [deleting, setDeleting] = useState<WithId<Site> | null>(null);

  function edit(site?: WithId<Site>) {
    setDraft({
      id: site?.id ?? null,
      name: site?.name ?? "",
      address: site?.address ?? "",
      timeZone: site?.timeZone ?? "Europe/Paris",
      floorsText: site?.floors.map((f) => f.label).join("\n") ?? "",
      hours: site?.defaultOpeningHours ?? OFFICE_HOURS,
      existingFloors: site?.floors ?? [],
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const site: Site = {
      name: draft.name.trim(),
      address: draft.address.trim(),
      timeZone: draft.timeZone,
      floors: floorsFromText(draft.floorsText, draft.existingFloors),
      defaultOpeningHours: draft.hours,
    };
    try {
      const { db } = getFirebase();
      if (draft.id) await updateDoc(doc(db, COL.sites, draft.id), { ...site });
      else await addDoc(collection(db, COL.sites), site);
      flash.success("common.saved");
      setDraft(null);
    } catch (err) {
      flash.error(err);
    }
  }

  async function remove() {
    if (!deleting) return;
    if (spaces.some((s) => s.siteId === deleting.id)) {
      flash.failure("admin.spaces.siteInUse");
      setDeleting(null);
      return;
    }
    try {
      await deleteDoc(doc(getFirebase().db, COL.sites, deleting.id));
      flash.success("common.deleted");
      setDeleting(null);
    } catch (err) {
      flash.error(err);
    }
  }

  return (
    <Section
      title={t("admin.spaces.sites")}
      icon="building"
      actions={
        <Button size="sm" onClick={() => edit()}>
          {t("admin.spaces.newSite")}
        </Button>
      }
    >
      {sites.length === 0 ? (
        <EmptyState icon="building">{t("admin.spaces.noSites")}</EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {sites.map((site) => (
            <li key={site.id} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold">{site.name}</p>
                  <p className="truncate text-sm text-slate-600">{site.address}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {site.timeZone} · {hoursSummary(site.defaultOpeningHours)} · {site.floors.map((f) => f.label).join(", ")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="ghost" onClick={() => edit(site)}>
                    {t("common.edit")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(site)}>
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? t("admin.spaces.editSite") : t("admin.spaces.newSite")}>
        {draft && (
          <form onSubmit={save} className="space-y-4">
            <Field label={t("admin.spaces.siteName")}>
              <Input required maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label={t("admin.spaces.address")}>
              <Input required maxLength={200} value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </Field>
            <Field label={t("admin.spaces.timeZone")}>
              <Select value={draft.timeZone} onChange={(e) => setDraft({ ...draft, timeZone: e.target.value })}>
                {zones.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("admin.spaces.floors")}>
              <Textarea rows={3} value={draft.floorsText} onChange={(e) => setDraft({ ...draft, floorsText: e.target.value })} />
            </Field>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t("admin.spaces.openingHours")}</legend>
              <OpeningHoursEditor value={draft.hours} onChange={(hours) => setDraft({ ...draft, hours })} />
            </fieldset>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDraft(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("common.save")}</Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal open={deleting !== null} onClose={() => setDeleting(null)} onConfirm={() => void remove()} title={t("common.delete")} confirmLabel={t("common.delete")} danger>
        {deleting && t("admin.spaces.confirmDelete", { name: deleting.name })}
      </ConfirmModal>
    </Section>
  );
}
