import { FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { logger } from "firebase-functions/v2";
import {
  COL,
  createTranslator,
  DEFAULT_LOCALE,
  isDateString,
  isLocale,
  type MessageValues,
  type NotificationType,
  type UserProfile,
} from "@reservation/shared";
import { db } from "./admin";

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
    const userRef = db.collection(COL.users).doc(uid);
    const snap = await userRef.get();
    const user = snap.data() as UserProfile | undefined;
    if (!user || user.status !== "active") return;

    const locale = isLocale(user.locale) ? user.locale : DEFAULT_LOCALE;
    const { t } = createTranslator(locale);
    const localized = typeof values.date === "string" && isDateString(values.date) ? { ...values, date: localizeDate(values.date, locale) } : values;
    const title = t(`notify.${type}.title`);
    const body = t(`notify.${type}.body`, localized);

    await userRef.collection(COL.notifications).add({ type, title, body, link, readAt: null, createdAt: FieldValue.serverTimestamp() });
    if (user.notificationPrefs?.email) {
      // The "Trigger Email" Firebase extension sends the documents added to this collection.
      await db.collection(COL.mail).add({ to: [user.email], message: { subject: title, text: `${body}\n` } });
    }
    if (user.notificationPrefs?.push) await sendPush(uid, { title, body, link });
  } catch (err) {
    logger.error("Could not notify user", { uid, type, err });
  }
}

async function sendPush(uid: string, data: Record<string, string>): Promise<void> {
  const devices = await db.collection(COL.users).doc(uid).collection(COL.devices).get();
  for (const device of devices.docs) {
    const token = device.get("fcmToken") as string | undefined;
    if (!token) continue;
    try {
      await getMessaging().send({ token, data });
    } catch (err) {
      // Tokens of uninstalled apps are no longer valid: forget them.
      logger.warn("Push failed, removing the device", { uid, err });
      await device.ref.delete();
    }
  }
}
