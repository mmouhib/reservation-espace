import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { COL, createTranslator, DEFAULT_LOCALE, isLocale, type EquipmentRequest, type Incident, type UserProfile } from "@reservation/shared";
import { db } from "../lib/admin";
import { REGION } from "../lib/config";
import { notifyUser } from "../lib/notify";

/** The user's language, for the words that are filled into a notification (statuses, item names). */
async function translatorFor(uid: string) {
  const user = (await db.collection(COL.users).doc(uid).get()).data() as UserProfile | undefined;
  return createTranslator(user && isLocale(user.locale) ? user.locale : DEFAULT_LOCALE);
}

/** A new incident report: tell the administrators. */
export const onIncidentCreated = onDocumentCreated({ document: `${COL.incidents}/{id}`, region: REGION }, async (event) => {
  const incident = event.data?.data() as Incident | undefined;
  if (!incident) return;
  const admins = await db.collection(COL.users).where("role", "==", "admin").where("status", "==", "active").get();
  for (const admin of admins.docs) {
    await notifyUser(admin.id, {
      type: "incidentReceived",
      values: { title: incident.title, name: incident.reporterName },
      link: "/admin/support",
    });
  }
});

/** An administrator changed the status of an incident: tell the person who reported it. */
export const onIncidentUpdated = onDocumentUpdated({ document: `${COL.incidents}/{id}`, region: REGION }, async (event) => {
  const before = event.data?.before.data() as Incident | undefined;
  const after = event.data?.after.data() as Incident | undefined;
  if (!before || !after || before.status === after.status) return;
  const { t } = await translatorFor(after.reporterId);
  await notifyUser(after.reporterId, {
    type: "incidentUpdated",
    values: { title: after.title, status: t(`incidentStatus.${after.status}`) },
    link: "/support",
  });
});

/** An administrator answered an equipment request: tell the requester. */
export const onEquipmentRequestUpdated = onDocumentUpdated({ document: `${COL.equipmentRequests}/{id}`, region: REGION }, async (event) => {
  const before = event.data?.before.data() as EquipmentRequest | undefined;
  const after = event.data?.after.data() as EquipmentRequest | undefined;
  if (!before || !after || before.status === after.status) return;
  const { t } = await translatorFor(after.requesterId);
  await notifyUser(after.requesterId, {
    type: "equipmentUpdated",
    values: { item: t(`items.${after.item}`), status: t(`equipmentStatus.${after.status}`) },
    link: "/support",
  });
});
