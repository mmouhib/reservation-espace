import { COL, updateUserOrgInput, type UserProfile } from "@reservation/shared";
import { writeAudit } from "../lib/audit";
import { bulkUpdate, updateOneOp } from "../lib/bulk";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";
import { getDb } from "../lib/mongo";
import { withTransaction } from "../lib/transaction";

type UserDoc = UserProfile<Date> & { _id: string };
type TeamDoc = { _id: string; memberIds: string[] };

/**
 * Admin-only: puts a user in a department and in teams. The team documents list
 * their members too, so both sides are updated together, atomically.
 */
export const updateUserOrg = secureCall(
  { name: "updateUserOrg", schema: updateUserOrgInput, role: "admin", rateLimit: { limit: 30, windowSec: 60 } },
  async ({ uid: actorId, data }) => {
    const db = await getDb();
    const users = db.collection<UserDoc>(COL.users);
    const teams = db.collection<TeamDoc>(COL.teams);

    const user = await users.findOne({ _id: data.uid });
    if (!user) throw appError("not-found", "userNotFound", "User not found.");

    const previous = new Set(user.teamIds ?? []);
    const next = new Set(data.teamIds);
    const teamOps = [
      ...[...next]
        .filter((teamId) => !previous.has(teamId))
        .map((teamId) => updateOneOp<TeamDoc>({ _id: teamId }, { $addToSet: { memberIds: data.uid } })),
      ...[...previous]
        .filter((teamId) => !next.has(teamId))
        .map((teamId) => updateOneOp<TeamDoc>({ _id: teamId }, { $pull: { memberIds: data.uid } })),
    ];

    await withTransaction(async (session) => {
      await users.updateOne({ _id: data.uid }, { $set: { departmentId: data.departmentId, teamIds: [...next] } }, { session });
      await bulkUpdate(teams, teamOps, session);
    });

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
