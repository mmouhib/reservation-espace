import { FieldValue } from "firebase-admin/firestore";
import { COL, updateUserOrgInput, type UserProfile } from "@reservation/shared";
import { db } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";

/**
 * Admin-only: puts a user in a department and in teams. The team documents list
 * their members too, so both sides are updated together.
 */
export const updateUserOrg = secureCall(
  { name: "updateUserOrg", schema: updateUserOrgInput, role: "admin", rateLimit: { limit: 30, windowSec: 60 } },
  async ({ uid: actorId, data }) => {
    const userRef = db.collection(COL.users).doc(data.uid);
    const user = (await userRef.get()).data() as UserProfile | undefined;
    if (!user) throw appError("not-found", "userNotFound", "User not found.");

    const previous = new Set(user.teamIds ?? []);
    const next = new Set(data.teamIds);

    const batch = db.batch();
    batch.update(userRef, { departmentId: data.departmentId, teamIds: [...next] });
    for (const teamId of next) {
      if (!previous.has(teamId)) batch.update(db.collection(COL.teams).doc(teamId), { memberIds: FieldValue.arrayUnion(data.uid) });
    }
    for (const teamId of previous) {
      if (!next.has(teamId)) batch.update(db.collection(COL.teams).doc(teamId), { memberIds: FieldValue.arrayRemove(data.uid) });
    }
    await batch.commit();

    await writeAudit({
      actorId,
      actorRole: "admin",
      action: "user.org_changed",
      targetType: "user",
      targetId: data.uid,
      details: { departmentId: data.departmentId, teamIds: data.teamIds },
    });
    return { updated: true };
  },
);
