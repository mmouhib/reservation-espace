import { COL, setUserRoleInput, type UserProfile } from "@reservation/shared";
import { auth } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { appError } from "../lib/errors";
import { secureCall } from "../lib/callable";
import { getDb } from "../lib/mongo";
import { withTransaction } from "../lib/transaction";

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
    const db = await getDb();
    await withTransaction(async (session) => {
      const res = await db
        .collection<UserProfile<Date> & { _id: string }>(COL.users)
        .updateOne({ _id: data.uid }, { $set: { role: data.role, claimsUpdatedAt: new Date() } }, { session });
      if (res.matchedCount === 0) throw appError("not-found", "userNotFound", "User not found.");
      await writeAudit(
        {
          actorId,
          actorRole: "admin",
          action: "user.role_changed",
          targetType: "user",
          targetId: data.uid,
          details: { from: previousRole, to: data.role },
        },
        session,
      );
    });
    return { changed: true };
  },
);
