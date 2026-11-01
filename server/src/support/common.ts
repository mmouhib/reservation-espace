import { COL, createTranslator, DEFAULT_LOCALE, isLocale, type UserProfile } from "@reservation/shared";
import { appError } from "../lib/errors";
import { getDb } from "../lib/mongo";

export type UserDoc = UserProfile<Date> & { _id: string };

export async function usersCol() {
  return (await getDb()).collection<UserDoc>(COL.users);
}

/** The caller's profile, which must be active to report incidents or request equipment. */
export async function requireActiveProfile(uid: string): Promise<UserDoc> {
  const user = await (await usersCol()).findOne({ _id: uid });
  if (!user || user.status !== "active") throw appError("permission-denied", "forbidden", "Account is not active.");
  return user;
}

/** The user's language, for the words that are filled into a notification (statuses, item names). */
export async function translatorFor(uid: string) {
  const user = await (await usersCol()).findOne({ _id: uid });
  return createTranslator(user && isLocale(user.locale) ? user.locale : DEFAULT_LOCALE);
}
