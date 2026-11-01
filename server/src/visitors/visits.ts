import { ObjectId } from "mongodb";
import {
  COL,
  createVisitInput,
  listVisitsForDayInput,
  visitIdInput,
  emptyInput,
  type Site,
  type UserProfile,
  type Visit,
  type VisitSummary,
} from "@reservation/shared";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";
import { getDb } from "../lib/mongo";
import { notifyUser } from "../lib/notify";

function toSummary(visit: Visit): VisitSummary {
  return {
    id: visit._id,
    siteId: visit.siteId,
    siteName: visit.siteName,
    hostUserId: visit.hostUserId,
    hostName: visit.hostName,
    guestName: visit.guestName,
    guestEmail: visit.guestEmail,
    guestCompany: visit.guestCompany,
    visitDate: visit.visitDate,
    status: visit.status,
    checkedInAt: visit.checkedInAt ? visit.checkedInAt.toISOString() : null,
    checkedOutAt: visit.checkedOutAt ? visit.checkedOutAt.toISOString() : null,
  };
}

async function visits() {
  const mongo = await getDb();
  return mongo.collection<Visit>(COL.visits);
}

/** Invites an external guest to a site. The host name is copied from their current profile. */
export const createVisit = secureCall(
  { name: "createVisit", schema: createVisitInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, data }) => {
    const mongo = await getDb();
    const [user, site] = await Promise.all([
      mongo.collection<UserProfile & { _id: string }>(COL.users).findOne({ _id: uid }),
      mongo.collection<Site & { _id: string }>(COL.sites).findOne({ _id: data.siteId }),
    ]);
    if (!user || user.status !== "active") throw appError("permission-denied", "forbidden", "Account is not active.");
    if (!site) throw appError("not-found", "spaceNotFound", "Site not found.");

    const now = new Date();
    const visit: Visit = {
      _id: new ObjectId().toHexString(),
      siteId: data.siteId,
      siteName: site.name,
      hostUserId: uid,
      hostName: user.displayName,
      guestName: data.guestName.trim(),
      guestEmail: data.guestEmail ?? null,
      guestCompany: data.guestCompany ?? null,
      visitDate: data.visitDate,
      status: "expected",
      checkedInAt: null,
      checkedOutAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await (await visits()).insertOne(visit);
    return { visitId: visit._id };
  },
);

/** The signed-in user's own invites, most recent first. */
export const getMyVisits = secureCall({ name: "getMyVisits", schema: emptyInput }, async ({ uid }) => {
  const docs = await (await visits()).find({ hostUserId: uid }).sort({ visitDate: -1 }).limit(100).toArray();
  return docs.map(toSummary);
});

/** Cancels an invite that hasn't happened yet. The host, or an administrator, can cancel it. */
export const cancelVisit = secureCall(
  { name: "cancelVisit", schema: visitIdInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const col = await visits();
    const visit = await col.findOne({ _id: data.visitId });
    if (!visit) throw appError("not-found", "visitNotFound", "Visit not found.");
    if (visit.hostUserId !== uid && role !== "admin") throw appError("permission-denied", "forbidden", "Not your invite.");
    if (visit.status !== "expected") throw appError("failed-precondition", "invalidVisitStatus", "Visit can no longer be cancelled.");

    await col.updateOne({ _id: data.visitId }, { $set: { status: "cancelled", updatedAt: new Date() } });
    return { cancelled: true };
  },
);

/** Today's (or a given day's) expected guests, for reception. */
export const listVisitsForDay = secureCall({ name: "listVisitsForDay", schema: listVisitsForDayInput, role: "admin" }, async ({ data }) => {
  const docs = await (await visits())
    .find({ visitDate: data.date, status: { $ne: "cancelled" } })
    .sort({ guestName: 1 })
    .limit(200)
    .toArray();
  return docs.map(toSummary);
});

/** Marks a guest as arrived and tells the host. Reception-only. */
export const checkInVisit = secureCall({ name: "checkInVisit", schema: visitIdInput, role: "admin" }, async ({ uid, data }) => {
  const col = await visits();
  const visit = await col.findOne({ _id: data.visitId });
  if (!visit) throw appError("not-found", "visitNotFound", "Visit not found.");
  if (visit.status !== "expected") throw appError("failed-precondition", "invalidVisitStatus", "Visit is not expected.");

  const checkedInAt = new Date();
  await col.updateOne({ _id: data.visitId }, { $set: { status: "checkedIn", checkedInAt, updatedAt: checkedInAt } });
  await writeAudit({ actorId: uid, actorRole: "admin", action: "visit.checkedIn", targetType: "visit", targetId: data.visitId });
  await notifyUser(visit.hostUserId, { type: "visitorArrived", values: { guest: visit.guestName }, link: "/visiteurs" });
  return { checkedIn: true };
});

/** Marks a guest as left. Reception-only. */
export const checkOutVisit = secureCall({ name: "checkOutVisit", schema: visitIdInput, role: "admin" }, async ({ uid, data }) => {
  const col = await visits();
  const visit = await col.findOne({ _id: data.visitId });
  if (!visit) throw appError("not-found", "visitNotFound", "Visit not found.");
  if (visit.status !== "checkedIn") throw appError("failed-precondition", "invalidVisitStatus", "Visit is not checked in.");

  const checkedOutAt = new Date();
  await col.updateOne({ _id: data.visitId }, { $set: { status: "checkedOut", checkedOutAt, updatedAt: checkedOutAt } });
  await writeAudit({ actorId: uid, actorRole: "admin", action: "visit.checkedOut", targetType: "visit", targetId: data.visitId });
  return { checkedOut: true };
});
