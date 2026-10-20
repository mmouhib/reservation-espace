import { FieldValue, type DocumentData, type Query } from "firebase-admin/firestore";
import { COL, anonymizeUserInput, emptyInput, type Role } from "@reservation/shared";
import { cancelUpcomingBookings } from "../bookings/cancelBooking";
import { auth, db } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";

const ANONYMOUS_NAME = "[deleted user]";

/** Plain JSON for a Firestore document (timestamps become ISO strings). */
function toPlain(data: DocumentData): DocumentData {
  return JSON.parse(JSON.stringify(data, (_key, value) => (value && typeof value.toDate === "function" ? value.toDate().toISOString() : value)));
}

async function documents(query: Query) {
  return (await query.get()).docs.map((d) => ({ id: d.id, ...toPlain(d.data()) }));
}

/** Everything the app stores about the signed-in user (GDPR data export). */
export const exportMyData = secureCall(
  { name: "exportMyData", schema: emptyInput, rateLimit: { limit: 5, windowSec: 60 } },
  async ({ uid }) => {
    const userRef = db.collection(COL.users).doc(uid);
    const [profile, wallet, bookings, absences, transactions, subscriptions, incidents, equipmentRequests, notifications] = await Promise.all([
      userRef.get(),
      db.collection(COL.wallets).doc(uid).get(),
      documents(db.collection(COL.bookings).where("userId", "==", uid)),
      documents(db.collection(COL.absences).where("userId", "==", uid)),
      documents(db.collection(COL.creditTransactions).where("userId", "==", uid)),
      documents(db.collection(COL.subscriptions).where("userId", "==", uid)),
      documents(db.collection(COL.incidents).where("reporterId", "==", uid)),
      documents(db.collection(COL.equipmentRequests).where("requesterId", "==", uid)),
      documents(userRef.collection(COL.notifications)),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      profile: toPlain(profile.data() ?? {}),
      wallet: toPlain(wallet.data() ?? {}),
      bookings,
      absences,
      creditTransactions: transactions,
      subscriptions,
      incidents,
      equipmentRequests,
      notifications,
    };
  },
);

/** Replaces the person's name by a placeholder in the records that are kept (history, statistics). */
async function anonymizeNames(collection: string, userField: string, nameField: string, uid: string): Promise<void> {
  const writer = db.bulkWriter();
  const snap = await db.collection(collection).where(userField, "==", uid).get();
  for (const doc of snap.docs) void writer.update(doc.ref, { [nameField]: ANONYMOUS_NAME });
  await writer.close();
}

/**
 * Removes a person from the app: their upcoming bookings are cancelled and refunded,
 * their profile is blanked and their sign-in account is deleted. Past bookings and credit
 * history are kept without the name.
 */
async function anonymizeAccount(uid: string, actor: { uid: string; role: Role }): Promise<void> {
  const userRef = db.collection(COL.users).doc(uid);
  if (!(await userRef.get()).exists) throw appError("not-found", "userNotFound", "User not found.");

  await cancelUpcomingBookings(uid, { uid: actor.uid, role: "system" }, "account_deleted");

  const writer = db.bulkWriter();
  for (const collection of [COL.notifications, COL.devices]) {
    for (const doc of (await userRef.collection(collection).get()).docs) void writer.delete(doc.ref);
  }
  for (const doc of (await db.collection(COL.subscriptions).where("userId", "==", uid).where("status", "==", "active").get()).docs) {
    void writer.update(doc.ref, { status: "cancelled", cancelledAt: FieldValue.serverTimestamp() });
  }
  for (const doc of (await db.collection(COL.teams).where("memberIds", "array-contains", uid).get()).docs) {
    void writer.update(doc.ref, { memberIds: FieldValue.arrayRemove(uid), managerIds: FieldValue.arrayRemove(uid) });
  }
  void writer.update(userRef, {
    email: `${uid}@anonymized.invalid`,
    displayName: ANONYMOUS_NAME,
    photoURL: null,
    departmentId: null,
    teamIds: [],
    defaultSiteId: null,
    status: "anonymized",
    notificationPrefs: { email: false, push: false, weeklyDigest: false },
  });
  await writer.close();

  await anonymizeNames(COL.bookings, "userId", "userName", uid);
  await anonymizeNames(COL.absences, "userId", "userName", uid);
  await anonymizeNames(COL.incidents, "reporterId", "reporterName", uid);
  await anonymizeNames(COL.equipmentRequests, "requesterId", "requesterName", uid);

  await auth.deleteUser(uid).catch(() => undefined);
  await writeAudit({ actorId: actor.uid, actorRole: actor.role, action: "user.anonymized", targetType: "user", targetId: uid });
}

/** The signed-in user deletes their own account. */
export const deleteMyAccount = secureCall(
  { name: "deleteMyAccount", schema: emptyInput, rateLimit: { limit: 3, windowSec: 60 } },
  async ({ uid, role }) => {
    await anonymizeAccount(uid, { uid, role: role ?? "user" });
    return { deleted: true };
  },
);

/** Admin-only: removes someone else's account. */
export const anonymizeUser = secureCall(
  { name: "anonymizeUser", schema: anonymizeUserInput, role: "admin", rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid: actorId, data }) => {
    if (data.uid === actorId) throw appError("failed-precondition", "cannotDemoteSelf", "Admins cannot remove themselves.");
    await anonymizeAccount(data.uid, { uid: actorId, role: "admin" });
    return { deleted: true };
  },
);
