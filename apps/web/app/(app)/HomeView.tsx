"use client";

import { collection, doc, limit, orderBy, query, where, type Timestamp } from "firebase/firestore";
import Link from "next/link";
import { useMemo } from "react";
import { COL, formatMinutes, hasRole, type AppNotification, type Booking, type Wallet } from "@reservation/shared";
import { BookingCard } from "@/components/bookings/BookingCard";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { EmptyState, StatCard } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFirebase } from "@/lib/firebase/client";
import { useCollection, useDocument } from "@/lib/firebase/hooks";
import { formatDate, todayLocal } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { NAV_ITEMS } from "@/lib/navigation";

export function HomeView() {
  const { profile, role, user } = useAuth();
  const { t, locale } = useI18n();
  const uid = user?.uid;
  const today = todayLocal();
  const firstName = profile?.displayName.split(" ")[0];
  const shortcuts = NAV_ITEMS.filter((i) => i.href !== "/" && role && hasRole(role, i.minRole));

  const upcomingQuery = useMemo(
    () =>
      uid
        ? query(
            collection(getFirebase().db, COL.bookings),
            where("userId", "==", uid),
            where("status", "==", "confirmed"),
            where("date", ">=", today),
            orderBy("date"),
            limit(10),
          )
        : null,
    [uid, today],
  );
  const walletRef = useMemo(() => (uid ? doc(getFirebase().db, COL.wallets, uid) : null), [uid]);
  const unreadQuery = useMemo(
    () => (uid ? query(collection(getFirebase().db, COL.users, uid, COL.notifications), where("readAt", "==", null), limit(50)) : null),
    [uid],
  );

  const { data: bookings } = useCollection<Booking<Timestamp>>(upcomingQuery);
  const { data: wallet } = useDocument<Wallet>(walletRef);
  const { data: unread } = useCollection<AppNotification>(unreadQuery);

  const upcoming = [...bookings].sort((a, b) => a.date.localeCompare(b.date) || a.from - b.from).slice(0, 3);
  const next = upcoming[0];

  return (
    <>
      <DocumentTitle />
      <section className="mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {firstName ? t("home.greetingName", { name: firstName }) : t("home.greeting")}
        </h1>
        <p className="mt-1 text-brand-100">{t("home.subtitle")}</p>
        <Link
          href="/reserver"
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-4 text-sm font-semibold text-brand-800 hover:bg-brand-50"
        >
          <Icon name="calendar-plus" />
          {t("nav.reserve")}
        </Link>
      </section>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon="clock"
          label={t("home.nextBooking")}
          value={next ? formatDate(next.date, locale) : t("home.noNextBooking")}
          hint={next ? `${next.spaceName} · ${formatMinutes(next.from)}` : undefined}
        />
        <StatCard icon="wallet" label={t("home.balance")} value={wallet?.balance ?? 0} hint={<Link href="/credits" className="underline">{t("nav.credits")}</Link>} />
        <StatCard
          icon="bell"
          label={t("nav.notifications")}
          value={unread.length}
          hint={
            <Link href="/notifications" className="underline">
              {unread.length > 0 ? t("home.unread", { count: unread.length }) : t("home.allRead")}
            </Link>
          }
        />
      </div>

      <section aria-labelledby="upcoming" className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="upcoming" className="text-lg font-semibold">
            {t("home.upcoming")}
          </h2>
          <Link href="/mes-reservations" className="text-sm font-medium text-brand-700 hover:underline">
            {t("home.seeAll")}
          </Link>
        </div>
        {upcoming.length === 0 ? (
          <EmptyState icon="calendar-plus">{t("home.noUpcoming")}</EmptyState>
        ) : (
          <ul className="space-y-3">
            {upcoming.map((booking) => (
              <li key={booking.id}>
                <BookingCard booking={booking} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex h-full flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-600 hover:shadow"
            >
              <span className="flex items-center gap-2 font-semibold text-brand-800">
                <Icon name={item.icon} />
                {t(item.labelKey)}
              </span>
              {item.descriptionKey && <span className="text-sm text-slate-600">{t(item.descriptionKey)}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
