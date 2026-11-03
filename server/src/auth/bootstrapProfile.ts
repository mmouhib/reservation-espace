import {
  COL,
  DEFAULT_LOCALE,
  bootstrapProfileInput,
  type BootstrapProfileResult,
  type Role,
  type UserProfile,
} from "@reservation/shared";
import { auth } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { appError } from "../lib/errors";
import { secureCall } from "../lib/callable";
import { ALLOWED_EMAIL_DOMAINS, csv, WELCOME_CREDITS } from "../lib/config";
import { applyCredit } from "../lib/credits";
import { getDb } from "../lib/mongo";

type UserDoc = UserProfile<Date> & { _id: string };

export function isEmailAllowed(email: string, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && allowedDomains.includes(domain);
}

async function giveWelcomeCredits(uid: string): Promise<void> {
  const amount = WELCOME_CREDITS();
  if (amount <= 0) return;
  await applyCredit(uid, { amount, type: "adjustment", label: "Welcome" });
}

/**
 * Called by the client right after sign-in. Gives an account its first role, "user" (which every
 * endpoint requires for any access), and creates or refreshes the profile document.
 * Only an account whose email address is verified, in an allowed domain, can get that role: a Google
 * account always has a verified address, and a person who signed up with a password proves theirs by
 * clicking the link Firebase emails them. Without that proof anyone could sign up with somebody else's
 * address and be taken for them. Administrators are never made here: they are created with
 * `npm run create-admin`, which sets their role before their first sign-in.
 */
export const bootstrapProfile = secureCall(
  // The only function open to an account without a role: it is the one that gives the role.
  { name: "bootstrapProfile", schema: bootstrapProfileInput, role: null, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, data }): Promise<BootstrapProfileResult> => {
    const user = await auth.getUser(uid);
    const email = user.email?.toLowerCase();
    if (!email) throw appError("failed-precondition", "noEmail", "Account has no email address.");

    const users = (await getDb()).collection<UserDoc>(COL.users);
    const existing = await users.findOne({ _id: uid });
    const existingRole = user.customClaims?.role as Role | undefined;

    if (!existingRole) {
      const knownProvider = user.providerData.some((provider) => provider.providerId === "google.com" || provider.providerId === "password");
      if (!user.emailVerified || !knownProvider) {
        throw appError("permission-denied", "emailNotVerified", "Verify the email address first.");
      }
      if (!isEmailAllowed(email, csv(ALLOWED_EMAIL_DOMAINS()))) {
        throw appError("permission-denied", "notInCompany", "Email domain is not allowed.");
      }
    }

    // The client's current language seeds the preference; afterwards the profile is the source of truth.
    const locale = data.locale ?? DEFAULT_LOCALE;
    const now = new Date();

    let claimsChanged = false;
    const role: Role = existingRole ?? "user";
    if (!existingRole) {
      await auth.setCustomUserClaims(uid, { ...user.customClaims, role });
      claimsChanged = true;
    }

    if (existing) {
      await users.updateOne(
        { _id: uid },
        {
          $set: {
            lastLoginAt: now,
            ...(existing.locale ? {} : { locale }),
            ...(claimsChanged ? { role, claimsUpdatedAt: now } : {}),
          },
        },
      );
    } else {
      const profile: UserDoc = {
        _id: uid,
        email,
        displayName: user.displayName ?? email.split("@")[0]!,
        photoURL: user.photoURL ?? null,
        departmentId: null,
        teamIds: [],
        defaultSiteId: null,
        role,
        status: "active",
        notificationPrefs: { email: true, push: false, weeklyDigest: false },
        locale,
        claimsUpdatedAt: now,
        lastLoginAt: now,
        createdAt: now,
      };
      // The browser may call this twice at once right after a new account is confirmed: the call that inserts the
      // profile first does the rest of the setup, the other one finds it already there and has nothing left to do.
      const inserted = await users.insertOne(profile).then(
        () => true,
        (err: { code?: number }) => {
          if (err.code === 11000) return false;
          throw err;
        },
      );
      if (!inserted) return { created: false, claimsChanged };
      await giveWelcomeCredits(uid);
      await writeAudit({ actorId: uid, actorRole: role, action: "user.created", targetType: "user", targetId: uid });
    }

    return { created: !existing, claimsChanged };
  },
);
