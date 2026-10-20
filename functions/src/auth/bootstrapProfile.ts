import { FieldValue } from "firebase-admin/firestore";
import {
  COL,
  DEFAULT_LOCALE,
  bootstrapProfileInput,
  type BootstrapProfileResult,
  type Role,
  type UserProfile,
} from "@reservation/shared";
import { auth, db } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { appError } from "../lib/errors";
import { secureCall } from "../lib/callable";
import { ALLOWED_EMAIL_DOMAINS, BOOTSTRAP_ADMIN_EMAILS, csv, WELCOME_CREDITS } from "../lib/config";
import { readBalance, writeCredits } from "../lib/credits";

export function isEmailAllowed(email: string, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && allowedDomains.includes(domain);
}

async function giveWelcomeCredits(uid: string): Promise<void> {
  const amount = WELCOME_CREDITS.value();
  if (amount <= 0) return;
  await db.runTransaction(async (tx) => {
    const balance = await readBalance(tx, uid);
    writeCredits(tx, uid, balance, { amount, type: "adjustment", label: "Welcome" });
  });
}

/**
 * Called by the client right after sign-in. Assigns the initial role claim
 * (which Firestore rules require for any access) and creates or refreshes the
 * profile document. Replaces a blocking `beforeUserCreated` function, which
 * would require Identity Platform.
 */
export const bootstrapProfile = secureCall(
  { name: "bootstrapProfile", schema: bootstrapProfileInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, data }): Promise<BootstrapProfileResult> => {
    const user = await auth.getUser(uid);
    const email = user.email?.toLowerCase();
    if (!email) throw appError("failed-precondition", "noEmail", "Account has no email address.");
    if (!isEmailAllowed(email, csv(ALLOWED_EMAIL_DOMAINS.value()))) {
      throw appError("permission-denied", "notInCompany", "Email domain is not allowed.");
    }

    const ref = db.collection(COL.users).doc(uid);
    const snap = await ref.get();
    const existingRole = user.customClaims?.role as Role | undefined;

    // The client's current language seeds the preference; afterwards the profile is the source of truth.
    const locale = data.locale ?? DEFAULT_LOCALE;

    let claimsChanged = false;
    let role: Role = existingRole ?? "user";
    if (!existingRole) {
      role = csv(BOOTSTRAP_ADMIN_EMAILS.value()).includes(email) ? "admin" : "user";
      await auth.setCustomUserClaims(uid, { ...user.customClaims, role });
      claimsChanged = true;
    }

    if (snap.exists) {
      await ref.update({
        lastLoginAt: FieldValue.serverTimestamp(),
        ...(snap.get("locale") ? {} : { locale }),
        ...(claimsChanged ? { role, claimsUpdatedAt: FieldValue.serverTimestamp() } : {}),
      });
    } else {
      const profile: UserProfile<FieldValue> = {
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
        claimsUpdatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      };
      await ref.create(profile);
      await giveWelcomeCredits(uid);
      await writeAudit({ actorId: uid, actorRole: role, action: "user.created", targetType: "user", targetId: uid });
    }

    return { created: !snap.exists, claimsChanged };
  },
);
