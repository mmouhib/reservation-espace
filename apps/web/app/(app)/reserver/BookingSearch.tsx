"use client";

import { collection, doc, orderBy, query, where, type Timestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  COL,
  EQUIPMENT,
  SPACE_CATEGORIES,
  formatMinutes,
  type SearchSpacesInput,
  type Site,
  type Space,
  type SpaceCategory,
  type SpaceSlotStatus,
  type Wallet,
} from "@reservation/shared";
import { SpaceCard } from "@/components/spaces/SpaceCard";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState } from "@/components/ui/Card";
import { Checkbox, Field, Input, Select } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { TimeSelect } from "@/components/ui/TimeSelect";
import { api } from "@/lib/api/functions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFirebase } from "@/lib/firebase/client";
import { useCollection, useDocument } from "@/lib/firebase/hooks";
import { formatDate, nextWorkday } from "@/lib/format";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Search form, availability results and the confirmation step of a booking. */
export function BookingSearch() {
  const router = useRouter();
  const flash = useFlash();
  const online = useOnlineStatus();
  const { t, locale } = useI18n();
  const { profile, user } = useAuth();
  const uid = user?.uid;

  // Search form
  const [siteChoice, setSiteChoice] = useState("");
  const [date, setDate] = useState(nextWorkday());
  const [from, setFrom] = useState(9 * 60);
  const [to, setTo] = useState(17 * 60);
  const [people, setPeople] = useState(1);
  // Filters applied to the results
  const [category, setCategory] = useState<SpaceCategory | "all">("all");
  const [minCapacity, setMinCapacity] = useState(1);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [showUnavailable, setShowUnavailable] = useState(false);
  // Results and the space being booked
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<{ params: SearchSpacesInput; statuses: Map<string, SpaceSlotStatus> } | null>(null);
  const [choice, setChoice] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);

  const sitesQuery = useMemo(() => query(collection(getFirebase().db, COL.sites), orderBy("name")), []);
  const { data: sites, loading: loadingSites } = useCollection<Site>(sitesQuery);
  const siteId = siteChoice || (sites.some((s) => s.id === profile?.defaultSiteId) ? profile!.defaultSiteId! : (sites[0]?.id ?? ""));
  const site = sites.find((s) => s.id === siteId);

  const spacesQuery = useMemo(
    () => (siteId ? query(collection(getFirebase().db, COL.spaces), where("siteId", "==", siteId)) : null),
    [siteId],
  );
  const { data: spaces } = useCollection<Space<Timestamp>>(spacesQuery);
  const walletRef = useMemo(() => (uid ? doc(getFirebase().db, COL.wallets, uid) : null), [uid]);
  const { data: wallet } = useDocument<Wallet>(walletRef);

  async function runSearch(params: SearchSpacesInput) {
    setSearching(true);
    try {
      const statuses = await api.searchSpaces(params);
      setResults({ params, statuses: new Map(statuses.map((s) => [s.spaceId, s])) });
    } catch (err) {
      flash.error(err);
    } finally {
      setSearching(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void runSearch({ siteId, date, from, to, attendees: people });
  }

  async function book(spaceId: string) {
    if (!results) return;
    const { date, from, to, attendees } = results.params;
    setBooking(true);
    try {
      await api.createBooking({ spaceId, date, from, to, attendees });
      flash.success("reserve.booked");
      router.push("/mes-reservations");
    } catch (err) {
      flash.error(err);
      setChoice(null);
      void runSearch(results.params); // the space may have been taken in the meantime
    } finally {
      setBooking(false);
    }
  }

  const matching = spaces
    .filter((s) => results?.statuses.has(s.id))
    .filter((s) => category === "all" || s.category === category)
    .filter((s) => s.capacity >= minCapacity)
    .filter((s) => equipment.every((e) => s.equipment.includes(e)));
  const availableCount = matching.filter((s) => results?.statuses.get(s.id)?.available).length;
  const shown = matching
    .filter((s) => showUnavailable || results?.statuses.get(s.id)?.available)
    .sort((a, b) => Number(results?.statuses.get(b.id)?.available) - Number(results?.statuses.get(a.id)?.available) || a.name.localeCompare(b.name));

  const chosenSpace = spaces.find((s) => s.id === choice);
  const chosenStatus = choice ? results?.statuses.get(choice) : undefined;
  const balance = wallet?.balance ?? 0;
  const slotIsValid = to > from;

  if (loadingSites) return <Spinner />;
  if (sites.length === 0) return <EmptyState icon="building">{t("reserve.noSites")}</EmptyState>;

  return (
    <div className="space-y-6">
      <Card>
        <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <Field label={t("reserve.site")} className="lg:col-span-2">
            <Select value={siteId} onChange={(e) => setSiteChoice(e.target.value)}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={t("reserve.date")}>
            <Input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t("reserve.start")}>
            <TimeSelect value={from} max={23 * 60 + 30} onChange={setFrom} />
          </Field>
          <Field label={t("reserve.end")}>
            <TimeSelect value={to} min={30} onChange={setTo} />
          </Field>
          <Field label={t("reserve.attendees")}>
            <Input type="number" min={1} max={500} value={people} onChange={(e) => setPeople(Math.max(1, Number(e.target.value)))} />
          </Field>
          <div className="flex items-end sm:col-span-2 lg:col-span-6">
            <Button type="submit" disabled={searching || !online || !slotIsValid || !siteId}>
              {searching ? t("reserve.searching") : t("reserve.search")}
            </Button>
            {!online && <p className="ml-3 text-sm text-amber-800">{t("reserve.offline")}</p>}
          </div>
        </form>
      </Card>

      {!results ? (
        <EmptyState icon="search">{t("reserve.firstSearch")}</EmptyState>
      ) : (
        <>
          <Card className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={t("reserve.category")}>
              <Select value={category} onChange={(e) => setCategory(e.target.value as SpaceCategory | "all")}>
                <option value="all">{t("reserve.anyCategory")}</option>
                {SPACE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`spaceCategories.${c}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("reserve.minCapacity")}>
              <Input type="number" min={1} value={minCapacity} onChange={(e) => setMinCapacity(Math.max(1, Number(e.target.value)))} />
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1 text-sm font-medium text-slate-800">{t("reserve.equipment")}</legend>
              <div className="flex flex-wrap gap-x-4">
                {EQUIPMENT.map((e) => (
                  <Checkbox
                    key={e}
                    label={t(`equipment.${e}`)}
                    checked={equipment.includes(e)}
                    onChange={(ev) => setEquipment(ev.target.checked ? [...equipment, e] : equipment.filter((x) => x !== e))}
                  />
                ))}
              </div>
            </fieldset>
            <div className="sm:col-span-2 lg:col-span-4">
              <Checkbox label={t("reserve.showUnavailable")} checked={showUnavailable} onChange={(e) => setShowUnavailable(e.target.checked)} />
            </div>
          </Card>

          <p role="status" className="text-sm font-medium text-slate-700">
            {t("reserve.resultsCount", { count: availableCount })}
          </p>
          {shown.length === 0 ? (
            <EmptyState icon="search">{t("reserve.noResults")}</EmptyState>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((space) => (
                <li key={space.id}>
                  <SpaceCard space={space} site={site} status={results.statuses.get(space.id)!} onBook={() => setChoice(space.id)} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Modal
        open={choice !== null}
        onClose={() => setChoice(null)}
        title={t("reserve.confirmTitle")}
        footer={
          <>
            <Button variant="secondary" onClick={() => setChoice(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={() => choice && void book(choice)} disabled={booking || !chosenStatus || chosenStatus.cost > balance}>
              {t("common.confirm")}
            </Button>
          </>
        }
      >
        {chosenSpace && results && chosenStatus && (
          <div className="space-y-3 text-sm">
            <p className="text-base font-semibold">{chosenSpace.name}</p>
            <p>
              {formatDate(results.params.date, locale)} · {formatMinutes(results.params.from)} – {formatMinutes(results.params.to)}
            </p>
            <p>{t("common.people", { count: results.params.attendees ?? 1 })}</p>
            <p className="font-medium">
              {t("reserve.cost")} : {chosenStatus.cost > 0 ? t("common.credits", { count: chosenStatus.cost }) : t("common.free")}
            </p>
            <p className={chosenStatus.cost > balance ? "font-medium text-red-700" : "text-slate-600"}>
              {chosenStatus.cost > balance ? t("errors.notEnoughCredits") : t("reserve.balance", { balance })}
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
