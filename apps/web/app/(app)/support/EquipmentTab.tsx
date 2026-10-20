"use client";

import { addDoc, collection, limit, orderBy, query, serverTimestamp, where, type Timestamp } from "firebase/firestore";
import { useMemo, useState, type FormEvent } from "react";
import { COL, REQUESTABLE_ITEMS, type EquipmentRequest, type RequestableItem } from "@reservation/shared";
import { EquipmentStatusBadge } from "@/components/support/StatusBadges";
import { Button } from "@/components/ui/Button";
import { Card, EmptyState, Section } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { useFlash } from "@/components/ui/Flash";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getFirebase } from "@/lib/firebase/client";
import { useCollection } from "@/lib/firebase/hooks";
import { formatDate, nextWorkday } from "@/lib/format";
import { useI18n } from "@/lib/i18n/I18nProvider";

export function EquipmentTab() {
  const { user, profile } = useAuth();
  const { t, locale } = useI18n();
  const flash = useFlash();
  const uid = user?.uid;

  const [item, setItem] = useState<RequestableItem>("screen");
  const [quantity, setQuantity] = useState(1);
  const [neededOn, setNeededOn] = useState(nextWorkday());
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  const requestsQuery = useMemo(
    () => (uid ? query(collection(getFirebase().db, COL.equipmentRequests), where("requesterId", "==", uid), orderBy("createdAt", "desc"), limit(50)) : null),
    [uid],
  );
  const { data: requests } = useCollection<EquipmentRequest<Timestamp>>(requestsQuery);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!uid || !profile) return;
    setBusy(true);
    try {
      await addDoc(collection(getFirebase().db, COL.equipmentRequests), {
        requesterId: uid,
        requesterName: profile.displayName,
        item,
        quantity,
        neededOn,
        comment: comment.trim(),
        status: "pending",
        adminNote: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      flash.success("support.requestSent");
      setComment("");
      setQuantity(1);
    } catch (err) {
      flash.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section title={t("support.newRequest")} icon="package">
        <form onSubmit={submit} className="space-y-4">
          <Field label={t("support.item")}>
            <Select value={item} onChange={(e) => setItem(e.target.value as RequestableItem)}>
              {REQUESTABLE_ITEMS.map((i) => (
                <option key={i} value={i}>
                  {t(`items.${i}`)}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t("support.quantity")}>
              <Input type="number" min={1} max={20} required value={quantity} onChange={(e) => setQuantity(Math.min(20, Math.max(1, Number(e.target.value))))} />
            </Field>
            <Field label={t("support.neededOn")}>
              <Input type="date" required value={neededOn} onChange={(e) => setNeededOn(e.target.value)} />
            </Field>
          </div>
          <Field label={`${t("support.comment")} ${t("common.optional")}`}>
            <Textarea maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
          </Field>
          <Button type="submit" disabled={busy}>
            {t("support.send")}
          </Button>
        </form>
      </Section>

      <Section title={t("support.myRequests")} icon="list">
        {requests.length === 0 ? (
          <EmptyState icon="package">{t("support.noRequests")}</EmptyState>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => (
              <li key={request.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">
                        {request.quantity} × {t(`items.${request.item}`)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t("support.neededOn")} {formatDate(request.neededOn, locale)}
                      </p>
                    </div>
                    <EquipmentStatusBadge status={request.status} />
                  </div>
                  {request.comment && <p className="mt-2 text-sm text-slate-700">{request.comment}</p>}
                  {request.adminNote && (
                    <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm">
                      <strong>{t("support.answer")} :</strong> {request.adminNote}
                    </p>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}
