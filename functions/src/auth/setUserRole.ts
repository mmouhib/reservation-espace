import { FieldValue } from "firebase-admin/firestore";
import { COL, setUserRoleInput } from "@reservation/shared";
import { auth, db } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { appError } from "../lib/errors";
import { secureCall } from "../lib/callable";

/** Admin-only: changes a user's role claim and mirrors it on the profile document. */
export const setUserRole = secureCall(
  { name: "setUserRole", schema: setUserRoleInput, role: "admin" },
  async ({ uid: actorId, data }) => {
    if (data.uid === actorId && data.role !== "admin") {
      throw appError("failed-precondition", "cannotDemoteSelf", "Admins cannot remove their own admin role.");
    }

    const target = await auth.getUser(data.uid).catch(() => {
      throw appError("not-found", "userNotFound", "User not found.");
    });
    const previousRole = target.customClaims?.role ?? null;
    if (previousRole === data.role) return { changed: false };

    await auth.setCustomUserClaims(data.uid, { ...target.customClaims, role: data.role });
    await db.runTransaction(async (tx) => {
      tx.update(db.collection(COL.users).doc(data.uid), {
        role: data.role,
        claimsUpdatedAt: FieldValue.serverTimestamp(),
      });
      await writeAudit(
        {
          actorId,
          actorRole: "admin",
          action: "user.role_changed",
          targetType: "user",
          targetId: data.uid,
          details: { from: previousRole, to: data.role },
        },
        tx,
      );
    });
    return { changed: true };
  },
);
