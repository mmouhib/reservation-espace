import type { Db, Document, Filter } from "mongodb";
import { COL, anonymizeUserInput, emptyInput, type Role, type UserProfile } from "@reservation/shared";
import { cancelUpcomingBookings } from "../bookings/cancelBooking";
import { auth } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { cancelActiveSubscriptionsForUser, getWallet, listCreditTransactions, listSubscriptionsForUser } from "../lib/credits";
import { appError } from "../lib/errors";
import { getDb } from "../lib/mongo";
import { deletePhotosOf } from "../lib/photos";

const ANONYMOUS_NAME = "[deleted user]";

type UserDoc = UserProfile<Date> & { _id: string };
type TeamDoc = { _id: string; memberIds: string[]; managerIds: string[] };

/** Plain JSON for a Mongo document (dates become ISO strings) and its `_id` exposed as `id`. */
function toPlain(data: Document): Record<string, unknown> {
  const { _id, ...rest } = data;
  return { id: _id, ...JSON.parse(JSON.stringify(rest)) };
}

async function documents(db: Db, collection: string, filter: Filter<Document>) {
  return (await db.collection(collection).find(filter).toArray()).map(toPlain);
}

/** Everything the app stores about the signed-in user (GDPR data export). */
export const exportMyData = secureCall(
  { name: "exportMyData", schema: emptyInput, rateLimit: { limit: 5, windowSec: 60 } },
  async ({ uid }) => {
    const db = await getDb();
    const [profile, wallet, bookings, absences, transactions, subscriptions, incidents, equipmentRequests, notifications, events] = await Promise.all([
      db.collection<UserDoc>(COL.users).findOne({ _id: uid }),
      getWallet(uid),
      documents(db, COL.bookings, { userId: uid }),
      documents(db, COL.absences, { userId: uid }),
      listCreditTransactions(uid, Number.MAX_SAFE_INTEGER),
      listSubscriptionsForUser(uid),
      documents(db, COL.incidents, { reporterId: uid }),
      documents(db, COL.equipmentRequests, { requesterId: uid }),
      documents(db, COL.notifications, { userId: uid }),
      documents(db, COL.events, { userId: uid }),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      profile: JSON.parse(JSON.stringify(profile ?? {})),
      wallet: JSON.parse(JSON.stringify(wallet ?? {})),
      bookings,
      absences,
      creditTransactions: JSON.parse(JSON.stringify(transactions)),
      subscriptions: JSON.parse(JSON.stringify(subscriptions)),
      incidents,
      equipmentRequests,
      notifications,
      events,
    };
  },
);

/** Replaces the person's name by a placeholder in the records that are kept (history, statistics). */
async function anonymizeNames(db: Db, collection: string, userField: string, nameField: string, uid: string): Promise<void> {
  await db.collection(collection).updateMany({ [userField]: uid }, { $set: { [nameField]: ANONYMOUS_NAME } });
}

/**
 * Removes a person from the app: their upcoming bookings are cancelled and refunded,
 * their profile is blanked and their sign-in account is deleted. Past bookings and credit
 * history are kept without the name.
 */
async function anonymizeAccount(uid: string, actor: { uid: string; role: Role }): Promise<void> {
  const db = await getDb();
  const users = db.collection<UserDoc>(COL.users);
  if (!(await users.findOne({ _id: uid }))) throw appError("not-found", "userNotFound", "User not found.");

  await cancelUpcomingBookings(uid, { uid: actor.uid, role: "system" }, "account_deleted");

  await cancelActiveSubscriptionsForUser(uid);

  await db.collection(COL.notifications).deleteMany({ userId: uid });
  await db.collection(COL.events).deleteMany({ userId: uid });
  await db.collection(COL.devices).deleteMany({ userId: uid });
  await deletePhotosOf(uid);
  await db.collection(COL.incidents).updateMany({ reporterId: uid }, { $set: { photoIds: [] } });
  await db.collection<TeamDoc>(COL.teams).updateMany({ memberIds: uid }, { $pull: { memberIds: uid, managerIds: uid } });
  await users.updateOne(
    { _id: uid },
    {
      $set: {
        email: `${uid}@anonymized.invalid`,
        displayName: ANONYMOUS_NAME,
        photoURL: null,
        departmentId: null,
        teamIds: [],
        defaultSiteId: null,
        status: "anonymized",
        notificationPrefs: { email: false, push: false, weeklyDigest: false },
      },
    },
  );

  await anonymizeNames(db, COL.bookings, "userId", "userName", uid);
  await anonymizeNames(db, COL.absences, "userId", "userName", uid);
  await anonymizeNames(db, COL.incidents, "reporterId", "reporterName", uid);
  await anonymizeNames(db, COL.equipmentRequests, "requesterId", "requesterName", uid);

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
