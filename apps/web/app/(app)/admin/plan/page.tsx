"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { PLAN_HEIGHT, PLAN_WIDTH, autoLayout, clampLayout, tilesCollide, type PlanLayout, type SpaceSummary } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { PlanSurface, tileStyle } from "@/components/plan/PlanSurface";
import { Button } from "@/components/ui/Button";
import { Card, Section } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { PageHeader } from "@/components/ui/PageHeader";
import { Spinner } from "@/components/ui/Spinner";
import { api } from "@/lib/api/client";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/I18nProvider";

const SNAP = 0.5;
const snap = (value: number) => Math.round(value / SNAP) * SNAP;
const same = (a: PlanLayout | null, b: PlanLayout | null) => (a === null || b === null ? a === b : a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h);

interface Drag {
  id: string;
  startX: number;
  startY: number;
  origin: PlanLayout;
}

/** Administrators draw the floor: drag each space to where it is, resize it, or take it off the plan. */
export default function PlanEditorPage() {
  const { t } = useI18n();
  const flash = useFlash();
  const surfaceRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);

  const [siteChoice, setSiteChoice] = useState("");
  const [floorChoice, setFloorChoice] = useState("");
  // Changes not saved yet, by space. A missing entry means "as saved".
  const [draft, setDraft] = useState<Record<string, PlanLayout | null>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sitesQuery = useCallableQuery("listSites", api.listSites, {});
  const sites = [...(sitesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const siteId = siteChoice || sites[0]?.id || "";
  const site = sites.find((s) => s.id === siteId);
  const floors = site?.floors ?? [];
  const floor = floors.some((f) => f.id === floorChoice) ? floorChoice : (floors[0]?.id ?? "");
  const spacesQuery = useCallableQuery("listSpaces", api.listSpaces, siteId ? { siteId } : null);
  const onFloor = (spacesQuery.data ?? []).filter((s) => s.floor === floor).sort((a, b) => a.name.localeCompare(b.name));

  const layoutOf = (space: SpaceSummary): PlanLayout | null => (space.id in draft ? draft[space.id]! : space.layout);
  const placed = onFloor.flatMap((space) => {
    const layout = layoutOf(space);
    return layout ? [{ space, layout }] : [];
  });
  const unplaced = onFloor.filter((space) => !layoutOf(space));
  const changed = onFloor.filter((space) => space.id in draft && !same(draft[space.id]!, space.layout));
  const selected = placed.find((p) => p.space.id === selectedId) ?? null;
  const overlapping = new Set(
    placed.flatMap((a, i) => placed.slice(i + 1).flatMap((b) => (tilesCollide(a.layout, b.layout) ? [a.space.id, b.space.id] : []))),
  );

  const move = (id: string, layout: PlanLayout) => setDraft((current) => ({ ...current, [id]: clampLayout(layout) }));

  function onPointerDown(e: PointerEvent<HTMLButtonElement>, id: string, origin: PlanLayout) {
    setSelectedId(id);
    drag.current = { id, startX: e.clientX, startY: e.clientY, origin };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!current || !rect) return;
    const dx = ((e.clientX - current.startX) / rect.width) * PLAN_WIDTH;
    const dy = ((e.clientY - current.startY) / rect.height) * PLAN_HEIGHT;
    move(current.id, { ...current.origin, x: snap(current.origin.x + dx), y: snap(current.origin.y + dy) });
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, id: string, layout: PlanLayout) {
    const step = e.shiftKey ? 5 : 1;
    const delta: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const d = delta[e.key];
    if (!d) return;
    e.preventDefault();
    move(id, { ...layout, x: layout.x + d[0], y: layout.y + d[1] });
  }

  /** Puts the spaces that are not on the plan in the free room, biggest first. */
  function placeUnplaced(only?: SpaceSummary) {
    const todo = only ? [only] : unplaced;
    const result = autoLayout(
      todo.map((s) => ({ id: s.id, category: s.category })),
      placed.map((p) => p.layout),
    );
    setDraft((current) => ({ ...current, ...Object.fromEntries(result) }));
    if (only) setSelectedId(only.id);
  }

  async function save() {
    setSaving(true);
    try {
      await api.setSpaceLayouts({ layouts: changed.map((space) => ({ spaceId: space.id, layout: draft[space.id]! })) });
      flash.success("adminPlan.saved");
      spacesQuery.refetch();
    } catch (err) {
      flash.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <DocumentTitle titleKey="admin.sections.plan.title" />
      <PageHeader
        title={t("adminPlan.title")}
        description={t("adminPlan.description")}
        actions={
          <Button onClick={() => void save()} disabled={saving || changed.length === 0}>
            {saving ? t("common.saving") : t("adminPlan.save", { count: changed.length })}
          </Button>
        }
      />
      {sitesQuery.loading ? (
        <Spinner />
      ) : (
        <div className="space-y-6">
          <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("plan.site")}>
              <Select
                value={siteId}
                onChange={(e) => {
                  setSiteChoice(e.target.value);
                  setFloorChoice("");
                  setSelectedId(null);
                }}
              >
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("plan.floor")}>
              <Select
                value={floor}
                onChange={(e) => {
                  setFloorChoice(e.target.value);
                  setSelectedId(null);
                }}
              >
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Field>
          </Card>

          {overlapping.size > 0 && (
            <p role="status" className="rounded-xl bg-amber-100 px-4 py-2 text-sm font-medium text-amber-900">
              {t("adminPlan.overlap", { count: overlapping.size })}
            </p>
          )}

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="space-y-3">
              <PlanSurface surfaceRef={surfaceRef} label={t("adminPlan.mapLabel")}>
                {placed.map(({ space, layout }) => (
                  <button
                    key={space.id}
                    type="button"
                    style={{ ...tileStyle(layout), touchAction: "none" }}
                    onPointerDown={(e) => onPointerDown(e, space.id, layout)}
                    onPointerMove={onPointerMove}
                    onPointerUp={() => (drag.current = null)}
                    onPointerCancel={() => (drag.current = null)}
                    onKeyDown={(e) => onKeyDown(e, space.id, layout)}
                    aria-pressed={space.id === selectedId}
                    className={cn(
                      "absolute flex cursor-grab items-center justify-center overflow-hidden rounded-md border-2 border-brand-700 bg-brand-100 p-0.5 text-center text-[0.6rem] font-semibold leading-tight text-brand-900 active:cursor-grabbing sm:text-xs",
                      overlapping.has(space.id) && "border-red-600 bg-red-100 text-red-900",
                      space.id === selectedId && "z-10 ring-4 ring-brand-700/50",
                    )}
                  >
                    <span className="max-w-full truncate">{space.name}</span>
                  </button>
                ))}
              </PlanSurface>
              <p className="text-sm text-slate-600">{t("adminPlan.hint")}</p>
            </div>

            <div className="space-y-6">
              <Section title={selected ? selected.space.name : t("adminPlan.selection")} icon="pencil">
                {!selected ? (
                  <p className="text-sm text-slate-600">{t("adminPlan.selectHint")}</p>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label={t("adminPlan.width")}>
                        <Input
                          type="number"
                          min={3}
                          max={PLAN_WIDTH}
                          step={SNAP}
                          value={selected.layout.w}
                          onChange={(e) => move(selected.space.id, { ...selected.layout, w: Number(e.target.value) || 3 })}
                        />
                      </Field>
                      <Field label={t("adminPlan.height")}>
                        <Input
                          type="number"
                          min={3}
                          max={PLAN_HEIGHT}
                          step={SNAP}
                          value={selected.layout.h}
                          onChange={(e) => move(selected.space.id, { ...selected.layout, h: Number(e.target.value) || 3 })}
                        />
                      </Field>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setDraft((current) => ({ ...current, [selected.space.id]: null }));
                        setSelectedId(null);
                      }}
                    >
                      {t("adminPlan.remove")}
                    </Button>
                  </div>
                )}
              </Section>

              <Section
                title={t("adminPlan.unplaced", { count: unplaced.length })}
                icon="layers"
                actions={
                  unplaced.length > 0 ? (
                    <Button size="sm" onClick={() => placeUnplaced()}>
                      {t("adminPlan.placeAll")}
                    </Button>
                  ) : undefined
                }
              >
                {unplaced.length === 0 ? (
                  <p className="text-sm text-slate-600">{t("adminPlan.allPlaced")}</p>
                ) : (
                  <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
                    {unplaced.map((space) => (
                      <li key={space.id} className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {space.name} <span className="text-slate-500">· {t(`spaceCategories.${space.category}`)}</span>
                        </span>
                        <Button size="sm" variant="secondary" onClick={() => placeUnplaced(space)}>
                          {t("adminPlan.place")}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
