"use client";

import { addDoc, collection, deleteDoc, doc, serverTimestamp, updateDoc, type FieldValue, type Timestamp } from "firebase/firestore";
import { useState, type FormEvent } from "react";
import {
  COL,
  EQUIPMENT,
  SPACE_CATEGORIES,
  SPACE_TAGS,
  type Closure,
  type OpeningHours,
  type Site,
  type Space,
  type SpaceCategory,
} from "@reservation/shared";
import { OpeningHoursEditor } from "@/components/spaces/OpeningHoursEditor";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/Card";
import { Checkbox, Field, Input, Select } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { Table, Td } from "@/components/ui/Table";
import { getFirebase } from "@/lib/firebase/client";
import type { WithId } from "@/lib/firebase/hooks";
import { useI18n } from "@/lib/i18n/I18nProvider";

type SpaceRow = WithId<Space<Timestamp>>;

interface SpaceDraft {
  id: string | null;
  siteId: string;
  name: string;
  floor: string;
  location: string;
  category: SpaceCategory;
  capacity: number;
  creditsPerHour: number;
  equipment: string[];
  tags: string[];
  status: "active" | "closed";
  openingHours: OpeningHours;
  closures: Closure[];
}

function newDraft(site: WithId<Site>): SpaceDraft {
  return {
    id: null,
    siteId: site.id,
    name: "",
    floor: site.floors[0]?.id ?? "",
    location: "",
    category: "desk",
    capacity: 1,
    creditsPerHour: 0,
    equipment: [],
    tags: [],
    status: "active",
    openingHours: site.defaultOpeningHours,
    closures: [],
  };
}

function toggle(list: string[], value: string, on: boolean): string[] {
  return on ? [...list, value] : list.filter((v) => v !== value);
}

export function SpacesSection({ sites, spaces }: { sites: WithId<Site>[]; spaces: SpaceRow[] }) {
  const { t } = useI18n();
  const flash = useFlash();
  const [siteFilter, setSiteFilter] = useState("");
  const [draft, setDraft] = useState<SpaceDraft | null>(null);
  const [deleting, setDeleting] = useState<SpaceRow | null>(null);

  const shown = spaces.filter((s) => !siteFilter || s.siteId === siteFilter).sort((a, b) => a.name.localeCompare(b.name));
  const siteOf = (id: string) => sites.find((s) => s.id === id);
  const draftSite = draft ? siteOf(draft.siteId) : undefined;

  function edit(space: SpaceRow) {
    setDraft({
      id: space.id,
      siteId: space.siteId,
      name: space.name,
      floor: space.floor,
      location: space.location,
      category: space.category,
      capacity: space.capacity,
      creditsPerHour: space.creditsPerHour ?? 0,
      equipment: space.equipment,
      tags: space.tags,
      status: space.status,
      openingHours: space.openingHours,
      closures: space.closures,
    });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const fields = {
      siteId: draft.siteId,
      name: draft.name.trim(),
      floor: draft.floor,
      location: draft.location.trim(),
      category: draft.category,
      capacity: draft.capacity,
      creditsPerHour: draft.creditsPerHour,
      equipment: draft.equipment,
      tags: draft.tags,
      status: draft.status,
      openingHours: draft.openingHours,
      closures: draft.closures,
    };
    try {
      const { db } = getFirebase();
      if (draft.id) await updateDoc(doc(db, COL.spaces, draft.id), { ...fields, updatedAt: serverTimestamp() });
      else {
        const space: Space<FieldValue> = { ...fields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
        await addDoc(collection(db, COL.spaces), space);
      }
      flash.success("common.saved");
      setDraft(null);
    } catch (err) {
      flash.error(err);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await deleteDoc(doc(getFirebase().db, COL.spaces, deleting.id));
      flash.success("common.deleted");
      setDeleting(null);
    } catch (err) {
      flash.error(err);
    }
  }

  return (
    <Section
      title={t("admin.spaces.spaces")}
      icon="layers"
      actions={
        <Button size="sm" disabled={sites.length === 0} onClick={() => sites[0] && setDraft(newDraft(siteOf(siteFilter) ?? sites[0]))}>
          {t("admin.spaces.newSpace")}
        </Button>
      }
    >
      <div className="mb-4 max-w-xs">
        <Field label={t("admin.spaces.site")}>
          <Select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}>
            <option value="">{t("admin.spaces.allSites")}</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-slate-600">{t("admin.spaces.noSpaces")}</p>
      ) : (
        <Table
          caption={t("admin.spaces.spaces")}
          headers={[t("common.name"), t("admin.spaces.site"), t("admin.spaces.category"), t("admin.spaces.capacity"), t("admin.spaces.creditsPerHour"), t("common.status"), ""]}
        >
          {shown.map((space) => (
            <tr key={space.id}>
              <Td className="font-medium">{space.name}</Td>
              <Td className="text-slate-600">
                {siteOf(space.siteId)?.name}
                <span className="block text-xs">{siteOf(space.siteId)?.floors.find((f) => f.id === space.floor)?.label}</span>
              </Td>
              <Td>{t(`spaceCategories.${space.category}`)}</Td>
              <Td>{space.capacity}</Td>
              <Td>{space.creditsPerHour ?? 0}</Td>
              <Td>
                <Badge tone={space.status === "active" ? "success" : "neutral"}>
                  {space.status === "active" ? t("admin.spaces.statusActive") : t("admin.spaces.statusClosed")}
                </Badge>
              </Td>
              <Td>
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => edit(space)}>
                    {t("common.edit")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(space)}>
                    {t("common.delete")}
                  </Button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? t("admin.spaces.editSpace") : t("admin.spaces.newSpace")}>
        {draft && (
          <form onSubmit={save} className="space-y-4">
            <Field label={t("common.name")}>
              <Input required maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("admin.spaces.site")}>
                <Select
                  value={draft.siteId}
                  onChange={(e) => setDraft({ ...draft, siteId: e.target.value, floor: siteOf(e.target.value)?.floors[0]?.id ?? "" })}
                >
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("admin.spaces.floor")}>
                <Select value={draft.floor} onChange={(e) => setDraft({ ...draft, floor: e.target.value })}>
                  {draftSite?.floors.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label={t("admin.spaces.location")}>
              <Input maxLength={120} value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label={t("admin.spaces.category")}>
                <Select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value as SpaceCategory })}>
                  {SPACE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`spaceCategories.${c}`)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("admin.spaces.capacity")}>
                <Input type="number" min={1} max={500} required value={draft.capacity} onChange={(e) => setDraft({ ...draft, capacity: Math.max(1, Math.round(Number(e.target.value))) })} />
              </Field>
              <Field label={t("admin.spaces.creditsPerHour")}>
                <Input type="number" min={0} max={1000} step={0.5} required value={draft.creditsPerHour} onChange={(e) => setDraft({ ...draft, creditsPerHour: Math.max(0, Number(e.target.value)) })} />
              </Field>
            </div>
            <Field label={t("common.status")}>
              <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as "active" | "closed" })}>
                <option value="active">{t("admin.spaces.statusActive")}</option>
                <option value="closed">{t("admin.spaces.statusClosed")}</option>
              </Select>
            </Field>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">{t("admin.spaces.equipment")}</legend>
              <div className="flex flex-wrap gap-x-4">
                {EQUIPMENT.map((e) => (
                  <Checkbox key={e} label={t(`equipment.${e}`)} checked={draft.equipment.includes(e)} onChange={(ev) => setDraft({ ...draft, equipment: toggle(draft.equipment, e, ev.target.checked) })} />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-1 text-sm font-medium">{t("admin.spaces.tags")}</legend>
              <div className="flex flex-wrap gap-x-4">
                {SPACE_TAGS.map((tag) => (
                  <Checkbox key={tag} label={t(`tags.${tag}`)} checked={draft.tags.includes(tag)} onChange={(ev) => setDraft({ ...draft, tags: toggle(draft.tags, tag, ev.target.checked) })} />
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend className="mb-2 flex items-center justify-between gap-2 text-sm font-medium">
                {t("admin.spaces.openingHours")}
                {draftSite && (
                  <Button size="sm" variant="ghost" onClick={() => setDraft({ ...draft, openingHours: draftSite.defaultOpeningHours })}>
                    {t("admin.spaces.useSiteHours")}
                  </Button>
                )}
              </legend>
              <OpeningHoursEditor value={draft.openingHours} onChange={(openingHours) => setDraft({ ...draft, openingHours })} />
            </fieldset>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">{t("admin.spaces.closures")}</legend>
              <ul className="space-y-2">
                {draft.closures.map((closure, i) => (
                  <li key={i} className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-2">
                    <Input type="date" required aria-label={t("common.from")} value={closure.from} onChange={(e) => setDraft({ ...draft, closures: draft.closures.map((c, j) => (j === i ? { ...c, from: e.target.value } : c)) })} />
                    <Input type="date" required aria-label={t("common.to")} min={closure.from} value={closure.to} onChange={(e) => setDraft({ ...draft, closures: draft.closures.map((c, j) => (j === i ? { ...c, to: e.target.value } : c)) })} />
                    <Input aria-label={t("admin.spaces.closureReason")} placeholder={t("admin.spaces.closureReason")} maxLength={120} value={closure.reason} onChange={(e) => setDraft({ ...draft, closures: draft.closures.map((c, j) => (j === i ? { ...c, reason: e.target.value } : c)) })} />
                    <Button size="sm" variant="ghost" aria-label={t("common.delete")} onClick={() => setDraft({ ...draft, closures: draft.closures.filter((_, j) => j !== i) })}>
                      ✕
                    </Button>
                  </li>
                ))}
              </ul>
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => setDraft({ ...draft, closures: [...draft.closures, { from: "", to: "", reason: "" }] })}>
                {t("admin.spaces.addClosure")}
              </Button>
            </fieldset>
            <div className="flex justify-end gap-2 pt-2">
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
