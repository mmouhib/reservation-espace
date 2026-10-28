import { COL, teamBookingsInput, type Team, type TeamBookingsResult } from "@reservation/shared";
import { secureCall } from "../lib/callable";
import { getDb } from "../lib/mongo";
import { bookings, users } from "./common";

type TeamDoc = Team & { _id: string };

/**
 * For managers: the members of the teams they manage, and who has booked what on a day.
 * Administrators see every team. Done on the server because other people's bookings
 * are not readable from the client.
 */
export const teamBookings = secureCall(
  { name: "teamBookings", schema: teamBookingsInput, role: "manager", rateLimit: { limit: 30, windowSec: 60 } },
  async ({ uid, role, data }): Promise<TeamBookingsResult> => {
    const teamsCol = (await getDb()).collection<TeamDoc>(COL.teams);
    const teams = await teamsCol.find(role === "admin" ? {} : { managerIds: uid }).toArray();

    const teamNameOf = new Map<string, string>();
    for (const team of teams) for (const memberId of team.memberIds) teamNameOf.set(memberId, team.name);
    const memberIds = [...teamNameOf.keys()];
    if (memberIds.length === 0) return { members: [], bookings: [] };

    const [profiles, dayBookings] = await Promise.all([
      (await users()).find({ _id: { $in: memberIds } }).toArray(),
      (await bookings()).find({ date: data.date, status: "confirmed" }).toArray(),
    ]);

    const members = profiles
      .map((p) => ({ uid: p._id, name: p.displayName, teamName: teamNameOf.get(p._id) ?? "" }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const rows = dayBookings
      .filter((b) => teamNameOf.has(b.userId))
      .map((b) => ({ id: b._id, userId: b.userId, spaceName: b.spaceName, from: b.from, to: b.to }))
      .sort((a, b) => a.from - b.from);

    return { members, bookings: rows };
  },
);
