import { ObjectId } from "mongodb";
import type { z } from "zod";
import webpush from "web-push";
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
import { RESEND_API_KEY, RESEND_FROM, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT } from "./config";
import { logger } from "./logger";
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
  const apiKey = RESEND_API_KEY();
  if (!apiKey) {
    logger.warn("RESEND_API_KEY is not set, email skipped", { subject });
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM(), to: [to], subject, text }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
}

/** Sends a Web Push message to each browser the user enabled notifications on. Skipped without VAPID keys. */
async function sendPush(uid: string, payload: { title: string; body: string; link: string }): Promise<void> {
  const publicKey = VAPID_PUBLIC_KEY();
  const privateKey = VAPID_PRIVATE_KEY();
  if (!publicKey || !privateKey) {
    logger.warn("VAPID keys are not set, push skipped", { title: payload.title });
    return;
  }
  webpush.setVapidDetails(VAPID_SUBJECT(), publicKey, privateKey);

  const devices = (await getDb()).collection<DeviceDoc>(COL.devices);
  for (const device of await devices.find({ userId: uid }).toArray()) {
    try {
      await webpush.sendNotification(
        { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
        JSON.stringify(payload),
        { TTL: 24 * 60 * 60 },
      );
    } catch (err) {
      // A subscription of an uninstalled app or a revoked permission is gone for good (404 or 410): forget it.
      const status = (err as { statusCode?: number }).statusCode;
      logger.warn("Push failed", { uid, status });
      if (status === 404 || status === 410) await devices.deleteOne({ _id: device._id });
    }
  }
}
