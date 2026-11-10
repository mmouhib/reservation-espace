"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { PlanSummary } from "@reservation/shared";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { api, errorKey } from "@/lib/api/client";
import { formatPrice } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

/** Public key of Stripe (pk_test_... in test mode). Without it the card form cannot be shown. */
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

let stripePromise: Promise<Stripe | null> | null = null;
/** Loads stripe.js the first time a payment is started, not with the page. */
function getStripe(): Promise<Stripe | null> {
  stripePromise ??= loadStripe(STRIPE_PUBLISHABLE_KEY);
  return stripePromise;
}

function CardForm({ plan, paymentIntentId, onPaid }: { plan: PlanSummary; paymentIntentId: string; onPaid: (credits: number) => void }) {
  const { t, locale } = useI18n();
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // The card was charged, but the server has not given the credits yet (a network problem, for example).
  const [charged, setCharged] = useState(false);

  async function giveCredits() {
    setBusy(true);
    try {
      const { credits } = await api.confirmPayment({ paymentIntentId });
      onPaid(credits);
    } catch (err) {
      setCharged(true);
      setMessage(t("credits.paymentReceived") + " " + t(errorKey(err)));
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setMessage(null);
    // The card is charged here. A card that needs a bank check opens it in a popup, so the page is not left.
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: "if_required" });
    if (error) {
      setMessage(error.message ?? t("errors.paymentFailed"));
      setBusy(false);
    } else if (paymentIntent?.status === "succeeded") {
      await giveCredits();
    } else {
      setMessage(t("errors.paymentFailed"));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-4">
      {!charged && <PaymentElement />}
      <div role="alert" className="empty:hidden rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
        {message}
      </div>
      {charged ? (
        <Button type="button" className="w-full" disabled={busy} onClick={() => void giveCredits()}>
          {t("credits.checkPayment")}
        </Button>
      ) : (
        <Button type="submit" className="w-full" disabled={busy || !stripe || !elements}>
          {busy ? t("common.saving") : t("credits.pay", { price: formatPrice(plan.priceCents, locale) })}
        </Button>
      )}
    </form>
  );
}

/** Asks the server for a payment of the plan, then shows the card form. */
function PaymentSession({ plan, onPaid }: { plan: PlanSummary; onPaid: (credits: number) => void }) {
  const { t, locale } = useI18n();
  const [payment, setPayment] = useState<{ clientSecret: string; paymentIntentId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api
      .createPayment({ planId: plan.id })
      .then(setPayment)
      .catch((err) => setError(t(errorKey(err))));
  }, [plan.id, t]);

  if (error) return <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>;
  if (!payment) return <Spinner />;
  return (
    <>
      <Elements stripe={getStripe()} options={{ clientSecret: payment.clientSecret, locale: locale === "aeb" ? "ar" : locale, appearance: { theme: document.documentElement.dataset.theme === "dark" ? "night" : "stripe" } }}>
        <CardForm plan={plan} paymentIntentId={payment.paymentIntentId} onPaid={onPaid} />
      </Elements>
    </>
  );
}

/** The dialog that takes the card payment of a plan. Open while `plan` is set. */
export function PaymentModal({ plan, onClose, onPaid }: { plan: PlanSummary | null; onClose: () => void; onPaid: (credits: number) => void }) {
  const { t } = useI18n();
  return (
    <Modal open={plan !== null} onClose={onClose} title={plan ? t("credits.payTitle", { name: plan.name }) : ""}>
      {plan && <PaymentSession plan={plan} onPaid={onPaid} />}
    </Modal>
  );
}
