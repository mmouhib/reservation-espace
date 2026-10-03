import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import {
  COL,
  bootstrapProfileInput,
  type BootstrapProfileResult,
  type Role,
  type UserProfile,
} from "@reservation/shared";
import { auth, db } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { ALLOWED_EMAIL_DOMAINS, BOOTSTRAP_ADMIN_EMAILS, csv } from "../lib/config";

export function isEmailAllowed(email: string, allowedDomains: string[]): boolean {
  if (allowedDomains.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && allowedDomains.includes(domain);
}

/**
 * Called by the client right after sign-in. Assigns the initial role claim
 * (which Firestore rules require for any access) and creates or refreshes the
 * profile document. Replaces a blocking `beforeUserCreated` function, which
 * would require Identity Platform.
 */
export const bootstrapProfile = secureCall(
  { name: "bootstrapProfile", schema: bootstrapProfileInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid }): Promise<BootstrapProfileResult> => {
    const user = await auth.getUser(uid);
    const email = user.email?.toLowerCase();
    if (!email) throw new HttpsError("failed-precondition", "Aucune adresse e-mail associée au compte.");
    if (!isEmailAllowed(email, csv(ALLOWED_EMAIL_DOMAINS.value()))) {
      throw new HttpsError("permission-denied", "Ce compte n'appartient pas à l'entreprise.");
    }

    const ref = db.collection(COL.users).doc(uid);
    const snap = await ref.get();
    const existingRole = user.customClaims?.role as Role | undefined;

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
        claimsUpdatedAt: FieldValue.serverTimestamp(),
        lastLoginAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      };
      await ref.create(profile);
      await writeAudit({ actorId: uid, actorRole: role, action: "user.created", targetType: "user", targetId: uid });
    }

    return { created: !snap.exists, claimsChanged };
  },
);
