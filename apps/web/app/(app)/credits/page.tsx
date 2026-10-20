"use client";

import { collection, doc, limit, orderBy, query, where, type Timestamp } from "firebase/firestore";
import { useMemo, useState } from "react";
import { COL, type CreditTransaction, type Plan, type Subscription, type Wallet } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, Section, StatCard } from "@/components/ui/Card";
import { useFlash } from "@/components/ui/Flash";
import { ConfirmModal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api/functions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFirebase } from "@/lib/firebase/client";
import { useCollection, useDocument } from "@/lib/firebase/hooks";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { useOnlineStatus } from "@/lib/hooks/useOnlineStatus";
import { useI18n } from "@/lib/i18n/I18nProvider";

export default function CreditsPage() {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const flash = useFlash();
  const online = useOnlineStatus();
  const uid = user?.uid;
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const walletRef = useMemo(() => (uid ? doc(getFirebase().db, COL.wallets, uid) : null), [uid]);
  const plansQuery = useMemo(() => query(collection(getFirebase().db, COL.plans), where("active", "==", true)), []);
  const subscriptionQuery = useMemo(
    () => (uid ? query(collection(getFirebase().db, COL.subscriptions), where("userId", "==", uid), where("status", "==", "active"), limit(1)) : null),
    [uid],
  );
  const historyQuery = useMemo(
    () => (uid ? query(collection(getFirebase().db, COL.creditTransactions), where("userId", "==", uid), orderBy("createdAt", "desc"), limit(50)) : null),
    [uid],
  );

  const { data: wallet } = useDocument<Wallet>(walletRef);
  const { data: plans } = useCollection<Plan>(plansQuery);
  const { data: subscriptions } = useCollection<Subscription<Timestamp>>(subscriptionQuery);
  const { data: history } = useCollection<CreditTransaction<Timestamp>>(historyQuery);
  const subscription = subscriptions[0];

  async function buy(planId: string) {
    setBusyPlan(planId);
    try {
      const { credits } = await api.purchasePlan({ planId });
      flash.success("credits.purchased", { count: credits });
    } catch (err) {
      flash.error(err);
    } finally {
      setBusyPlan(null);
    }
  }

  async function cancelSubscription() {
    if (!subscription) return;
    try {
      await api.cancelSubscription({ subscriptionId: subscription.id });
      flash.success("credits.subscriptionCancelled");
      setCancelling(false);
    } catch (err) {
      flash.error(err);
    }
  }

  return (
    <>
      <DocumentTitle titleKey="nav.credits" />
      <PageHeader title={t("credits.title")} description={t("credits.description")} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard icon="wallet" label={t("credits.balance")} value={wallet?.balance ?? 0} />
        {subscription && (
          <StatCard
            icon="check"
            label={t("credits.subscription")}
            value={subscription.planName}
            hint={
              <>
                {t("credits.renewsOn", { date: formatDate(subscription.nextRenewalAt.toDate().toISOString().slice(0, 10), locale) })}
                {" · "}
                <button type="button" className="underline" onClick={() => setCancelling(true)}>
                  {t("credits.cancelSubscription")}
                </button>
              </>
            }
          />
        )}
      </div>

      <div className="space-y-6">
        <Section title={t("credits.plans")} icon="package">
          {plans.length === 0 ? (
            <p className="text-sm text-slate-600">{t("credits.noPlans")}</p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {plans
                .sort((a, b) => a.priceCents - b.priceCents)
                .map((plan) => (
                  <li key={plan.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold">{plan.name}</h3>
                      <Badge tone={plan.kind === "subscription" ? "info" : "neutral"}>
                        {plan.kind === "subscription" ? t("credits.kindSubscription") : t("credits.kindPack")}
                      </Badge>
                    </div>
                    {plan.description && <p className="text-sm text-slate-600">{plan.description}</p>}
                    <p className="text-2xl font-bold">{t("common.credits", { count: plan.credits })}</p>
                    <p className="text-sm text-slate-600">
                      {formatPrice(plan.priceCents, locale)}
                      {plan.kind === "subscription" && ` ${t("credits.perMonth")}`}
                    </p>
                    <Button
                      className="mt-auto"
                      onClick={() => void buy(plan.id)}
                      disabled={!online || busyPlan !== null || (plan.kind === "subscription" && subscription !== undefined)}
                    >
                      {plan.kind === "subscription" ? t("credits.subscribe") : t("credits.buy")}
                    </Button>
                  </li>
                ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-500">{t("credits.simulated")}</p>
        </Section>

        <Section title={t("credits.history")} icon="list">
          {history.length === 0 ? (
            <EmptyState icon="wallet">{t("credits.noHistory")}</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{t(`credits.types.${entry.type}`)}</p>
                    <p className="truncate text-slate-600">
                      {entry.label && `${entry.label} · `}
                      {formatDateTime(entry.createdAt, locale)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={entry.amount > 0 ? "font-semibold text-green-700" : "font-semibold text-slate-900"}>
                      {entry.amount > 0 ? "+" : ""}
                      {entry.amount}
                    </p>
                    <p className="text-xs text-slate-500">{entry.balanceAfter}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <ConfirmModal
        open={cancelling}
        onClose={() => setCancelling(false)}
        onConfirm={() => void cancelSubscription()}
        title={t("credits.cancelSubscription")}
        confirmLabel={t("credits.cancelSubscription")}
        danger
      >
        {subscription?.planName}
      </ConfirmModal>
    </>
  );
}
