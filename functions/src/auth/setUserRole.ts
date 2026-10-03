import { FieldValue } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";
import { COL, setUserRoleInput } from "@reservation/shared";
import { auth, db } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";

/** Admin-only: changes a user's role claim and mirrors it on the profile document. */
export const setUserRole = secureCall(
  { name: "setUserRole", schema: setUserRoleInput, role: "admin" },
  async ({ uid: actorId, data }) => {
    if (data.uid === actorId && data.role !== "admin") {
      throw new HttpsError("failed-precondition", "Vous ne pouvez pas retirer votre propre rôle d'administrateur.");
    }

    const target = await auth.getUser(data.uid).catch(() => {
      throw new HttpsError("not-found", "Utilisateur introuvable.");
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
