import { ObjectId } from "mongodb";
import {
  COL,
  createIncidentInput,
  emptyInput,
  updateIncidentStatusInput,
  type Incident,
  type IncidentSummary,
  type Space,
} from "@reservation/shared";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";
import { getDb } from "../lib/mongo";
import { notifyUser } from "../lib/notify";
import { photoOwners } from "../lib/photos";
import { requireActiveProfile, translatorFor, usersCol } from "./common";

export type IncidentDoc = Incident<Date> & { _id: string };
type SpaceDoc = Space<Date> & { _id: string };

async function incidents() {
  return (await getDb()).collection<IncidentDoc>(COL.incidents);
}

function toSummary(incident: IncidentDoc): IncidentSummary {
  return {
    id: incident._id,
    reporterId: incident.reporterId,
    reporterName: incident.reporterName,
    spaceId: incident.spaceId,
    spaceName: incident.spaceName,
    title: incident.title,
    description: incident.description,
    photoIds: incident.photoIds,
    status: incident.status,
    adminNote: incident.adminNote,
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString(),
  };
}

/**
 * Reports an incident. The client uploads the photos first (see `/api/uploads/photos`) and
 * sends their ids. Notifies every active administrator.
 */
export const createIncident = secureCall(
  { name: "createIncident", schema: createIncidentInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, data }) => {
    const reporter = await requireActiveProfile(uid);
    const owners = await photoOwners(data.photoIds);
    if (data.photoIds.some((id) => owners.get(id) !== uid)) {
      throw appError("invalid-argument", "invalidInput", "Photos must belong to the reporter.");
    }

    let space: SpaceDoc | null = null;
    if (data.spaceId) {
      space = await (await getDb()).collection<SpaceDoc>(COL.spaces).findOne({ _id: data.spaceId });
      if (!space) throw appError("not-found", "spaceNotFound", "Space not found.");
    }

    const now = new Date();
    const incident: IncidentDoc = {
      _id: new ObjectId().toHexString(),
      reporterId: uid,
      reporterName: reporter.displayName,
      spaceId: space?._id ?? null,
      spaceName: space?.name ?? null,
      title: data.title,
      description: data.description,
      photoIds: data.photoIds,
      status: "open",
      adminNote: "",
      createdAt: now,
      updatedAt: now,
    };
    await (await incidents()).insertOne(incident);

    const admins = await (await usersCol()).find({ role: "admin", status: "active" }).toArray();
    for (const admin of admins) {
      await notifyUser(admin._id, {
        type: "incidentReceived",
        values: { title: incident.title, name: incident.reporterName },
        link: "/admin/support",
      });
    }
    return { incidentId: incident._id };
  },
);

/** The signed-in user's own incidents, most recent first. */
export const listMyIncidents = secureCall({ name: "listMyIncidents", schema: emptyInput }, async ({ uid }) => {
  const docs = await (await incidents()).find({ reporterId: uid }).sort({ createdAt: -1 }).limit(50).toArray();
  return docs.map(toSummary);
});

/** All incidents, most recent first. Administrators only. */
export const listAllIncidents = secureCall({ name: "listAllIncidents", schema: emptyInput, role: "admin" }, async () => {
  const docs = await (await incidents()).find({}).sort({ createdAt: -1 }).limit(100).toArray();
  return docs.map(toSummary);
});

/**
 * Administrator sets the status and note of an incident. When the status
 * changes, the reporter is notified in their language.
 */
export const updateIncidentStatus = secureCall(
  { name: "updateIncidentStatus", schema: updateIncidentStatusInput, role: "admin", rateLimit: { limit: 60, windowSec: 60 } },
  async ({ data }) => {
    const col = await incidents();
    const before = await col.findOneAndUpdate(
      { _id: data.incidentId },
      { $set: { status: data.status, adminNote: data.adminNote, updatedAt: new Date() } },
      { returnDocument: "before" },
    );
    // No dedicated error reason exists for this yet (errors.ts and i18n are not owned here).
    if (!before) throw appError("not-found", "invalidInput", "Incident not found.");

    if (before.status !== data.status) {
      const { t } = await translatorFor(before.reporterId);
      await notifyUser(before.reporterId, {
        type: "incidentUpdated",
        values: { title: before.title, status: t(`incidentStatus.${data.status}`) },
        link: "/support",
      });
    }
    return { updated: true };
  },
);
