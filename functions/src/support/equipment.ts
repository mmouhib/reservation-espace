import { ObjectId } from "mongodb";
import {
  COL,
  createEquipmentRequestInput,
  emptyInput,
  updateEquipmentRequestStatusInput,
  type EquipmentRequest,
  type EquipmentRequestSummary,
} from "@reservation/shared";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";
import { getDb } from "../lib/mongo";
import { notifyUser } from "../lib/notify";
import { requireActiveProfile, translatorFor } from "./common";

export type EquipmentRequestDoc = EquipmentRequest<Date> & { _id: string };

async function requests() {
  return (await getDb()).collection<EquipmentRequestDoc>(COL.equipmentRequests);
}

function toSummary(request: EquipmentRequestDoc): EquipmentRequestSummary {
  return {
    id: request._id,
    requesterId: request.requesterId,
    requesterName: request.requesterName,
    item: request.item,
    quantity: request.quantity,
    neededOn: request.neededOn,
    comment: request.comment,
    status: request.status,
    adminNote: request.adminNote,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString(),
  };
}

/** Asks for equipment. The request starts as pending. */
export const createEquipmentRequest = secureCall(
  { name: "createEquipmentRequest", schema: createEquipmentRequestInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, data }) => {
    const requester = await requireActiveProfile(uid);
    const now = new Date();
    const request: EquipmentRequestDoc = {
      _id: new ObjectId().toHexString(),
      requesterId: uid,
      requesterName: requester.displayName,
      item: data.item,
      quantity: data.quantity,
      neededOn: data.neededOn,
      comment: data.comment,
      status: "pending",
      adminNote: "",
      createdAt: now,
      updatedAt: now,
    };
    await (await requests()).insertOne(request);
    return { requestId: request._id };
  },
);

/** The signed-in user's own equipment requests, most recent first. */
export const listMyEquipmentRequests = secureCall({ name: "listMyEquipmentRequests", schema: emptyInput }, async ({ uid }) => {
  const docs = await (await requests()).find({ requesterId: uid }).sort({ createdAt: -1 }).limit(50).toArray();
  return docs.map(toSummary);
});

/** All equipment requests, most recent first. Administrators only. */
export const listAllEquipmentRequests = secureCall({ name: "listAllEquipmentRequests", schema: emptyInput, role: "admin" }, async () => {
  const docs = await (await requests()).find({}).sort({ createdAt: -1 }).limit(100).toArray();
  return docs.map(toSummary);
});

/**
 * Administrator answers an equipment request. When the status changes, the
 * requester is notified in their language.
 */
export const updateEquipmentRequestStatus = secureCall(
  { name: "updateEquipmentRequestStatus", schema: updateEquipmentRequestStatusInput, role: "admin", rateLimit: { limit: 60, windowSec: 60 } },
  async ({ data }) => {
    const before = await (await requests()).findOneAndUpdate(
      { _id: data.requestId },
      { $set: { status: data.status, adminNote: data.adminNote, updatedAt: new Date() } },
      { returnDocument: "before" },
    );
    // No dedicated error reason exists for this yet (errors.ts and i18n are not owned here).
    if (!before) throw appError("not-found", "invalidInput", "Equipment request not found.");

    if (before.status !== data.status) {
      const { t } = await translatorFor(before.requesterId);
      await notifyUser(before.requesterId, {
        type: "equipmentUpdated",
        values: { item: t(`items.${before.item}`), status: t(`equipmentStatus.${data.status}`) },
        link: "/support",
      });
    }
    return { updated: true };
  },
);
