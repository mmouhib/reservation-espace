import { COL, teamBookingsInput, type Booking, type Team, type TeamBookingsResult, type UserProfile } from "@reservation/shared";
import { db } from "../lib/admin";
import { secureCall } from "../lib/callable";

/**
 * For managers: the members of the teams they manage, and who has booked what on a day.
 * Administrators see every team. Done on the server because other people's bookings
 * are not readable from the client.
 */
export const teamBookings = secureCall(
  { name: "teamBookings", schema: teamBookingsInput, role: "manager", rateLimit: { limit: 30, windowSec: 60 } },
  async ({ uid, role, data }): Promise<TeamBookingsResult> => {
    const teamsQuery = role === "admin" ? db.collection(COL.teams) : db.collection(COL.teams).where("managerIds", "array-contains", uid);
    const teams = (await teamsQuery.get()).docs.map((d) => d.data() as Team);

    const teamNameOf = new Map<string, string>();
    for (const team of teams) for (const memberId of team.memberIds) teamNameOf.set(memberId, team.name);
    const memberIds = [...teamNameOf.keys()];
    if (memberIds.length === 0) return { members: [], bookings: [] };

    const [profiles, dayBookings] = await Promise.all([
      db.getAll(...memberIds.map((id) => db.collection(COL.users).doc(id))),
      db.collection(COL.bookings).where("date", "==", data.date).where("status", "==", "confirmed").get(),
    ]);

    const members = profiles
      .filter((p) => p.exists)
      .map((p) => ({ uid: p.id, name: (p.data() as UserProfile).displayName, teamName: teamNameOf.get(p.id) ?? "" }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const bookings = dayBookings.docs
      .map((d) => ({ id: d.id, ...(d.data() as Booking) }))
      .filter((b) => teamNameOf.has(b.userId))
      .map((b) => ({ id: b.id, userId: b.userId, spaceName: b.spaceName, from: b.from, to: b.to }))
      .sort((a, b) => a.from - b.from);

    return { members, bookings };
  },
);
