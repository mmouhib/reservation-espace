"use client";

import { addDoc, collection, deleteDoc, doc, limit, orderBy, query, updateDoc } from "firebase/firestore";
import { useMemo, useState, type FormEvent } from "react";
import { COL, PLAN_KINDS, type Plan, type PlanKind, type UserProfile } from "@reservation/shared";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, Section } from "@/components/ui/Card";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { ConfirmModal, Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { api } from "@/lib/api/functions";
import { getFirebase } from "@/lib/firebase/client";
import { useCollection, type WithId } from "@/lib/firebase/hooks";
import { formatPrice } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface PlanDraft {
  id: string | null;
  name: string;
  description: string;
  kind: PlanKind;
  credits: number;
  price: number;
  active: boolean;
}

export default function CreditsAdminPage() {
  const { t, locale } = useI18n();
  const flash = useFlash();
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [deleting, setDeleting] = useState<WithId<Plan> | null>(null);
  const [adjusting, setAdjusting] = useState<{ uid: string; amount: number; label: string } | null>(null);

  const plansQuery = useMemo(() => query(collection(getFirebase().db, COL.plans), orderBy("priceCents")), []);
  const usersQuery = useMemo(() => query(collection(getFirebase().db, COL.users), orderBy("displayName"), limit(300)), []);
  const { data: plans } = useCollection<Plan>(plansQuery);
  const { data: users } = useCollection<UserProfile>(usersQuery);

  function edit(plan?: WithId<Plan>) {
    setDraft({
      id: plan?.id ?? null,
      name: plan?.name ?? "",
      description: plan?.description ?? "",
      kind: plan?.kind ?? "pack",
      credits: plan?.credits ?? 10,
      price: (plan?.priceCents ?? 1000) / 100,
      active: plan?.active ?? true,
    });
  }

  async function savePlan(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    const plan: Plan = {
      name: draft.name.trim(),
      description: draft.description.trim(),
      kind: draft.kind,
      credits: draft.credits,
      priceCents: Math.round(draft.price * 100),
      active: draft.active,
    };
    try {
      const { db } = getFirebase();
      if (draft.id) await updateDoc(doc(db, COL.plans, draft.id), { ...plan });
      else await addDoc(collection(db, COL.plans), plan);
      flash.success("common.saved");
      setDraft(null);
    } catch (err) {
      flash.error(err);
    }
  }

  async function removePlan() {
    if (!deleting) return;
    try {
      await deleteDoc(doc(getFirebase().db, COL.plans, deleting.id));
      flash.success("common.deleted");
      setDeleting(null);
    } catch (err) {
      flash.error(err);
    }
  }

  async function adjust(e: FormEvent) {
    e.preventDefault();
    if (!adjusting) return;
    try {
      await api.adjustCredits({ uid: adjusting.uid, amount: adjusting.amount, label: adjusting.label.trim() });
      flash.success("admin.credits.adjusted");
      setAdjusting(null);
    } catch (err) {
      flash.error(err);
    }
  }

  return (
    <>
      <DocumentTitle titleKey="admin.credits.title" />
      <PageHeader
        title={t("admin.credits.title")}
        description={t("admin.credits.description")}
        actions={
          <Button variant="secondary" onClick={() => setAdjusting({ uid: users[0]?.id ?? "", amount: 10, label: "" })}>
            {t("admin.credits.adjust")}
          </Button>
        }
      />

      <Section
        title={t("admin.credits.plans")}
        icon="package"
        actions={
          <Button size="sm" onClick={() => edit()}>
            {t("admin.credits.newPlan")}
          </Button>
        }
      >
        {plans.length === 0 ? (
          <EmptyState icon="package">{t("admin.credits.noPlans")}</EmptyState>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <li key={plan.id} className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{plan.name}</h3>
                  <span className="flex gap-1">
                    <Badge tone={plan.kind === "subscription" ? "info" : "neutral"}>
                      {plan.kind === "subscription" ? t("credits.kindSubscription") : t("credits.kindPack")}
                    </Badge>
                    {!plan.active && <Badge tone="warning">{t("admin.credits.hidden")}</Badge>}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{plan.description}</p>
                <p className="text-sm font-medium">
                  {t("common.credits", { count: plan.credits })} · {formatPrice(plan.priceCents, locale)}
                  {plan.kind === "subscription" && ` ${t("credits.perMonth")}`}
                </p>
                <div className="mt-auto flex gap-1">
                  <Button size="sm" variant="secondary" onClick={() => edit(plan)}>
                    {t("common.edit")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleting(plan)}>
                    {t("common.delete")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Modal open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? t("admin.credits.editPlan") : t("admin.credits.newPlan")}>
        {draft && (
          <form onSubmit={savePlan} className="space-y-4">
            <Field label={t("admin.credits.planName")}>
              <Input required maxLength={80} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </Field>
            <Field label={t("common.description")}>
              <Textarea rows={2} maxLength={300} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label={t("admin.credits.planKind")}>
                <Select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as PlanKind })}>
                  {PLAN_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind === "pack" ? t("credits.kindPack") : t("credits.kindSubscription")}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("admin.credits.planCredits")}>
                <Input type="number" min={1} required value={draft.credits} onChange={(e) => setDraft({ ...draft, credits: Math.max(1, Math.round(Number(e.target.value))) })} />
              </Field>
              <Field label={t("admin.credits.planPrice")}>
                <Input type="number" min={0} step={0.01} required value={draft.price} onChange={(e) => setDraft({ ...draft, price: Math.max(0, Number(e.target.value)) })} />
              </Field>
            </div>
            <Checkbox label={t("admin.credits.planActive")} checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDraft(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit">{t("common.save")}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={adjusting !== null} onClose={() => setAdjusting(null)} title={t("admin.credits.adjust")}>
        {adjusting && (
          <form onSubmit={adjust} className="space-y-4">
            <Field label={t("admin.credits.adjustUser")}>
              <Select value={adjusting.uid} onChange={(e) => setAdjusting({ ...adjusting, uid: e.target.value })}>
                {users
                  .filter((u) => u.status === "active")
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.displayName} ({u.email})
                    </option>
                  ))}
              </Select>
            </Field>
            <Field label={t("admin.credits.adjustAmount")}>
              <Input type="number" step={1} required value={adjusting.amount} onChange={(e) => setAdjusting({ ...adjusting, amount: Math.round(Number(e.target.value)) })} />
            </Field>
            <Field label={t("admin.credits.adjustLabel")}>
              <Input maxLength={120} value={adjusting.label} onChange={(e) => setAdjusting({ ...adjusting, label: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setAdjusting(null)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={adjusting.amount === 0 || !adjusting.uid}>
                {t("common.confirm")}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmModal open={deleting !== null} onClose={() => setDeleting(null)} onConfirm={() => void removePlan()} title={t("common.delete")} confirmLabel={t("common.delete")} danger>
        {deleting && t("admin.credits.confirmDelete", { name: deleting.name })}
      </ConfirmModal>
    </>
  );
}
