"use client";

import Link from "next/link";
import { useState } from "react";
import { addDays, formatMinutes, isEquipment, isErrorReason, type FloorPlanPerson, type FloorPlanSpace, type FloorSpaceState } from "@reservation/shared";
import { PlanSurface, tileStyle } from "@/components/plan/PlanSurface";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, Section } from "@/components/ui/Card";
import { Field, Input, Select } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { Spinner } from "@/components/ui/Spinner";
import { TimeSelect } from "@/components/ui/TimeSelect";
import { api } from "@/lib/api/client";
import { useCallableQuery } from "@/lib/api/useCallableQuery";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/cn";
import { todayLocal } from "@/lib/format";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Tile colours by state. Written with palette colours so that dark mode maps them like the rest of the app. */
const TILE: Record<FloorSpaceState, string> = {
  free: "border-green-600 bg-green-100 text-green-900 hover:bg-green-200",
  partial: "border-amber-500 bg-amber-100 text-amber-900 hover:bg-amber-200",
  taken: "border-red-600 bg-red-100 text-red-900 hover:bg-red-200",
  mine: "border-brand-700 bg-brand-100 text-brand-900 hover:bg-brand-200",
  closed: "border-slate-400 bg-slate-200 text-slate-600 hover:bg-slate-300",
};
const SWATCH: Record<FloorSpaceState, string> = {
  free: "border-green-600 bg-green-100",
  partial: "border-amber-500 bg-amber-100",
  taken: "border-red-600 bg-red-100",
  mine: "border-brand-700 bg-brand-100",
  closed: "border-slate-400 bg-slate-200",
};
const STATES: FloorSpaceState[] = ["free", "partial", "taken", "mine", "closed"];
const TONE: Record<FloorSpaceState, "success" | "warning" | "danger" | "info" | "neutral"> = {
  free: "success",
  partial: "warning",
  taken: "danger",
  mine: "info",
  closed: "neutral",
};

/** Half hour the current time falls in, and the hour after it (capped at midnight). */
function currentSlot(): { from: number; to: number } {
  const now = new Date();
  const from = Math.min(Math.floor((now.getHours() * 60 + now.getMinutes()) / 30) * 30, 23 * 60 + 30);
  return { from, to: Math.min(from + 60, 24 * 60) };
}

function initialsOf(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
}

/** The people in a tile: their names when the tile is big enough, their initials in small round badges otherwise. */
function Occupants({ people, big, anonymous }: { people: FloorPlanPerson[]; big: boolean; anonymous: string }) {
  if (people.length === 0) return null;
  if (big) {
    return (
      <ul className="mt-0.5 space-y-px">
        {people.slice(0, 3).map((person, i) => (
          <li key={i} className="truncate text-[0.7rem] font-medium leading-tight">
            {person.checkedIn ? "● " : ""}
            {person.name ?? anonymous}
          </li>
        ))}
        {people.length > 3 && <li className="text-[0.7rem] leading-tight">+{people.length - 3}</li>}
      </ul>
    );
  }
  return (
    <span className="mt-px flex justify-center -space-x-1">
      {people.slice(0, 2).map((person, i) => (
        <span
          key={i}
          className="flex size-4 items-center justify-center rounded-full border border-current bg-white/80 text-[0.55rem] font-bold leading-none sm:size-5 sm:text-[0.65rem]"
        >
          {initialsOf(person.name)}
        </span>
      ))}
    </span>
  );
}

/** The interactive map of one floor: free and taken spaces at the chosen time, who is in them, and a click to book. */
export function FloorPlanView() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const flash = useFlash();
  const online = useOnlineStatus();

  const [siteChoice, setSiteChoice] = useState("");
  const [floorChoice, setFloorChoice] = useState("");
  const [date, setDate] = useState(todayLocal);
  const [{ from, to }, setSlot] = useState(currentSlot);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const sitesQuery = useCallableQuery("listSites", api.listSites, {});
  const sites = [...(sitesQuery.data ?? [])].sort((a, b) => a.name.localeCompare(b.name));
  const siteId = siteChoice || (sites.some((s) => s.id === profile?.defaultSiteId) ? profile!.defaultSiteId! : (sites[0]?.id ?? ""));
  const site = sites.find((s) => s.id === siteId);
  const floors = site?.floors ?? [];
  const floor = floors.some((f) => f.id === floorChoice) ? floorChoice : (floors[0]?.id ?? "");

  // The plan is refreshed every 20 seconds, so a space taken by someone else turns red without reloading.
  const plan = useCallableQuery("getFloorPlan", api.getFloorPlan, siteId && floor ? { siteId, floor, date, from, to } : null);
  const wallet = useCallableQuery("getMyWallet", api.getMyWallet, {}, { pollMs: 30_000 }).data;
  const spaces = plan.data?.spaces ?? [];
  const selected = spaces.find((s) => s.id === selectedId) ?? null;
  const balance = wallet?.balance ?? 0;

  const counts = Object.fromEntries(STATES.map((state) => [state, spaces.filter((s) => s.state === state).length])) as Record<FloorSpaceState, number>;
  const present = spaces
    .flatMap((space) => space.people.map((person) => ({ person, space })))
    .sort((a, b) => (a.person.name ?? "￿").localeCompare(b.person.name ?? "￿"));
  const isNow = date === todayLocal() && from === currentSlot().from;

  function changeFrom(value: number) {
    setSlot({ from: value, to: to > value ? to : Math.min(value + 60, 24 * 60) });
  }

  async function book(space: FloorPlanSpace) {
    setBooking(true);
    try {
      await api.createBooking({ spaceId: space.id, date, from, to, attendees: 1 });
      flash.success("reserve.booked");
      plan.refetch();
    } catch (err) {
      flash.error(err);
      plan.refetch(); // somebody may have been faster
    } finally {
      setBooking(false);
    }
  }

  if (sitesQuery.loading) return <Spinner />;
  if (sites.length === 0) return <EmptyState icon="building">{t("reserve.noSites")}</EmptyState>;

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Field label={t("plan.site")} className="lg:col-span-2">
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
          <Field label={t("reserve.date")}>
            <Input type="date" required value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </Field>
          <Field label={t("reserve.start")}>
            <TimeSelect value={from} max={23 * 60 + 30} onChange={changeFrom} />
          </Field>
          <Field label={t("reserve.end")}>
            <TimeSelect value={to} min={from + 30} onChange={(value) => setSlot({ from, to: value })} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setDate(todayLocal());
              setSlot(currentSlot());
            }}
            disabled={isNow}
          >
            {t("plan.now")}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDate(addDays(date, -1))}>
            {t("calendar.previous")}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDate(addDays(date, 1))}>
            {t("calendar.next")}
          </Button>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label={t("plan.legend")}>
            {STATES.map((state) => (
              <li key={state} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={cn("size-3.5 rounded border-2", SWATCH[state])} />
                {t(`plan.state.${state}`)} <span className="text-slate-500">({counts[state]})</span>
              </li>
            ))}
          </ul>
          <span className="ms-auto flex items-center gap-1.5 text-sm text-slate-600" role="status">
            <span aria-hidden="true" className={cn("size-2 rounded-full", plan.failed || !online ? "bg-amber-500" : "animate-pulse bg-green-600")} />
            {plan.failed || !online ? t("plan.stale") : t("plan.live")}
          </span>
        </div>
      </Card>

      {plan.loading ? (
        <Spinner />
      ) : spaces.length === 0 ? (
        <EmptyState icon="map">{t("plan.empty")}</EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-4">
            <PlanSurface label={t("plan.mapLabel", { floor: floors.find((f) => f.id === floor)?.label ?? floor })}>
              {spaces.map((space) => {
                const big = space.layout.w >= 10 && space.layout.h >= 8;
                return (
                  <button
                    key={space.id}
                    type="button"
                    onClick={() => setSelectedId(space.id)}
                    aria-pressed={space.id === selectedId}
                    aria-label={`${space.name} — ${t(`plan.state.${space.state}`)}${space.people.length ? ` — ${space.people.map((p) => p.name ?? t("plan.someone")).join(", ")}` : ""}`}
                    title={space.name}
                    style={tileStyle(space.layout)}
                    className={cn(
                      "absolute flex flex-col items-center justify-center overflow-hidden rounded-md border-2 p-0.5 text-center transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700",
                      TILE[space.state],
                      space.id === selectedId && "z-10 ring-4 ring-brand-700/50",
                    )}
                  >
                    <span className={cn("max-w-full truncate font-semibold leading-tight", big ? "text-xs" : "text-[0.6rem] sm:text-[0.7rem]")}>
                      {space.name}
                    </span>
                    <Occupants people={space.people} big={big} anonymous={t("plan.someone")} />
                  </button>
                );
              })}
            </PlanSurface>
            <p className="text-sm text-slate-600">{t("plan.hint")}</p>
          </div>

          <div className="space-y-6">
            <Section title={selected ? selected.name : t("plan.details")} icon="map-pin">
              {!selected ? (
                <p className="text-sm text-slate-600">{t("plan.selectHint")}</p>
              ) : (
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={TONE[selected.state]}>{t(`plan.state.${selected.state}`)}</Badge>
                    <span className="text-slate-600">
                      {t(`spaceCategories.${selected.category}`)} · {t("plan.capacity", { count: selected.capacity })}
                    </span>
                  </div>
                  {selected.location && <p className="text-slate-600">{selected.location}</p>}
                  {selected.equipment.length > 0 && <p className="text-slate-600">{selected.equipment.map((e) => isEquipment(e) ? t(`equipment.${e}`) : e).join(", ")}</p>}
                  <div>
                    <p className="font-medium">{t("plan.inside")}</p>
                    {selected.people.length === 0 ? (
                      <p className="text-slate-600">{t("plan.nobody")}</p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {selected.people.map((person, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-900">{initialsOf(person.name)}</span>
                            <span>{person.name ?? t("plan.someone")}</span>
                            {person.me && <Badge tone="info">{t("plan.you")}</Badge>}
                            {person.checkedIn && <Badge tone="success">{t("plan.checkedIn")}</Badge>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <p className="font-medium">
                    {formatMinutes(from)} – {formatMinutes(to)} · {selected.cost > 0 ? t("common.credits", { count: selected.cost }) : t("common.free")}
                  </p>
                  {selected.state === "mine" ? (
                    <Link href="/mes-reservations" className="inline-block font-medium text-brand-700 underline">
                      {t("plan.seeMyBookings")}
                    </Link>
                  ) : selected.bookable ? (
                    <>
                      <Button onClick={() => void book(selected)} disabled={booking || !online || selected.cost > balance}>
                        {t("plan.book")}
                      </Button>
                      {selected.cost > balance && <p className="text-red-700">{t("errors.notEnoughCredits")}</p>}
                    </>
                  ) : (
                    <p className="text-slate-600">{selected.reason && isErrorReason(selected.reason) ? t(`errors.${selected.reason}`) : t("plan.unavailable")}</p>
                  )}
                </div>
              )}
            </Section>

            <Section title={t("plan.whoIsHere", { count: present.length })} icon="users">
              {present.length === 0 ? (
                <p className="text-sm text-slate-600">{t("plan.noOne")}</p>
              ) : (
                <ul className="max-h-80 space-y-1 overflow-y-auto text-sm">
                  {present.map(({ person, space }, i) => (
                    <li key={i}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(space.id)}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-start hover:bg-slate-100"
                      >
                        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-900">{initialsOf(person.name)}</span>
                        <span className="min-w-0 flex-1 truncate">{person.name ?? t("plan.someone")}</span>
                        <span className="shrink-0 text-slate-500">{space.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
