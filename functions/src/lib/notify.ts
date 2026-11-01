import { ObjectId } from "mongodb";
import type { z } from "zod";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions/v2";
import {
  COL,
  appNotificationSchema,
  createTranslator,
  DEFAULT_LOCALE,
  deviceSchema,
  isDateString,
  isLocale,
  type MessageValues,
  type NotificationType,
  userProfileSchema,
} from "@reservation/shared";
import { RESEND_API_KEY, RESEND_FROM } from "./config";
import { getDb } from "./mongo";

type UserDoc = z.infer<typeof userProfileSchema>;
type NotificationDoc = z.infer<typeof appNotificationSchema>;
type DeviceDoc = z.infer<typeof deviceSchema>;

export interface NotifyOptions {
  type: NotificationType;
  /** Values for the message placeholders. A `date` value (YYYY-MM-DD) is written in the user's language. */
  values?: MessageValues;
  /** Where the notification leads in the app. */
  link?: string;
}

function localizeDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
}

/**
 * Tells a user about something, in their language: an in-app notification, and an
 * email and a push notification when their preferences allow it. Never throws:
 * a failed notification must not undo the action that caused it.
 */
export async function notifyUser(uid: string, { type, values = {}, link = "/" }: NotifyOptions): Promise<void> {
  try {
    const db = await getDb();
    const user = await db.collection<UserDoc>(COL.users).findOne({ _id: uid });
    if (!user || user.status !== "active") return;

    const locale = isLocale(user.locale) ? user.locale : DEFAULT_LOCALE;
    const { t } = createTranslator(locale);
    const localized = typeof values.date === "string" && isDateString(values.date) ? { ...values, date: localizeDate(values.date, locale) } : values;
    const title = t(`notify.${type}.title`);
    const body = t(`notify.${type}.body`, localized);

    const notification: NotificationDoc = {
      _id: new ObjectId().toHexString(),
      userId: uid,
      type,
      title,
      body,
      link,
      readAt: null,
      createdAt: new Date(),
    };
    await db.collection<NotificationDoc>(COL.notifications).insertOne(notification);
    if (user.notificationPrefs?.email) await sendEmail(user.email, title, `${body}\n`);
    if (user.notificationPrefs?.push) await sendPush(uid, { title, body, link });
  } catch (err) {
    logger.error("Could not notify user", { uid, type, err });
  }
}

/** Sends a plain-text email through Resend. Skipped (with a warning) when no API key is configured. */
async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const apiKey = RESEND_API_KEY.value();
  if (!apiKey) {
    logger.warn("RESEND_API_KEY is not set, email skipped", { subject });
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM.value(), to: [to], subject, text }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
}

async function sendPush(uid: string, data: Record<string, string>): Promise<void> {
  const db = await getDb();
  const devices = db.collection<DeviceDoc>(COL.devices);
  for (const device of await devices.find({ userId: uid }).toArray()) {
    if (!device.fcmToken) continue;
    try {
      await getMessaging().send({ token: device.fcmToken, data });
    } catch (err) {
      // Tokens of uninstalled apps are no longer valid: forget them.
      logger.warn("Push failed, removing the device", { uid, err });
      await devices.deleteOne({ _id: device._id });
    }
  }
}
