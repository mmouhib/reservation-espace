import { COL, emptyInput, registerDeviceInput, updateMyProfileInput, type UserSummary } from "@reservation/shared";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";
import { requireActiveProfile } from "../support/common";
import { type DeviceDoc, toUserSummary, usersCol, col } from "./common";

/** The signed-in user's own profile, or null when it has not been created yet. */
export const getMyProfile = secureCall({ name: "getMyProfile", schema: emptyInput }, async ({ uid }): Promise<UserSummary | null> => {
  const user = await (await usersCol()).findOne({ _id: uid });
  return user ? toUserSummary(user) : null;
});

/**
 * Updates the fields a user may change on their own profile: display name,
 * notification preferences and language. Department, teams and role are admin-only.
 */
export const updateMyProfile = secureCall(
  { name: "updateMyProfile", schema: updateMyProfileInput, rateLimit: { limit: 30, windowSec: 60 } },
  async ({ uid, data }) => {
    await requireActiveProfile(uid);
    const set: Record<string, unknown> = {};
    if (data.displayName !== undefined) set.displayName = data.displayName;
    if (data.notificationPrefs !== undefined) set.notificationPrefs = data.notificationPrefs;
    if (data.locale !== undefined) set.locale = data.locale;

    const result = await (await usersCol()).updateOne({ _id: uid }, { $set: set });
    if (result.matchedCount === 0) throw appError("not-found", "userNotFound", "User not found.");
    return { updated: true };
  },
);

/**
 * Stores this browser's push subscription for the signed-in user. A subscription belongs to one
 * user at a time: registering it again (e.g. after a sign-in on the same device) moves it.
 */
export const registerDevice = secureCall(
  { name: "registerDevice", schema: registerDeviceInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, data }) => {
    await requireActiveProfile(uid);
    const devices = await col<DeviceDoc>(COL.devices);
    await devices.updateOne(
      { _id: data.endpoint },
      {
        $set: {
          userId: uid,
          endpoint: data.endpoint,
          p256dh: data.keys.p256dh,
          auth: data.keys.auth,
          platform: data.platform,
          userAgent: data.userAgent,
          lastSeenAt: new Date(),
        },
      },
      { upsert: true },
    );
    return { registered: true };
  },
);
