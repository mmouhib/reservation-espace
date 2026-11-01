import { emptyInput, listMyNotificationsInput, markNotificationReadInput, type NotificationSummary } from "@reservation/shared";
import { secureCall } from "../lib/callable";
import { notificationsCol, toNotificationSummary } from "./common";

/** The signed-in user's in-app notifications, newest first. */
export const listMyNotifications = secureCall(
  { name: "listMyNotifications", schema: listMyNotificationsInput },
  async ({ uid, data }): Promise<NotificationSummary[]> => {
    const filter = data.unreadOnly ? { userId: uid, readAt: null } : { userId: uid };
    const docs = await (await notificationsCol()).find(filter).sort({ createdAt: -1 }).limit(data.limit).toArray();
    return docs.map(toNotificationSummary);
  },
);

/** Marks one of the signed-in user's notifications as read. `marked` is false when it was already read or is not theirs. */
export const markNotificationRead = secureCall(
  { name: "markNotificationRead", schema: markNotificationReadInput, rateLimit: { limit: 120, windowSec: 60 } },
  async ({ uid, data }) => {
    const result = await (await notificationsCol()).updateOne(
      { _id: data.notificationId, userId: uid, readAt: null },
      { $set: { readAt: new Date() } },
    );
    return { marked: result.modifiedCount === 1 };
  },
);

/** Marks all of the signed-in user's notifications as read. */
export const markAllNotificationsRead = secureCall(
  { name: "markAllNotificationsRead", schema: emptyInput, rateLimit: { limit: 30, windowSec: 60 } },
  async ({ uid }) => {
    const result = await (await notificationsCol()).updateMany({ userId: uid, readAt: null }, { $set: { readAt: new Date() } });
    return { marked: result.modifiedCount };
  },
);
