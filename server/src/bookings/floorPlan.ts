import {
  bookingCost,
  fitsOpeningHours,
  findBookingProblem,
  floorPlanInput,
  hasCapacity,
  isClosedOn,
  isWithinRanges,
  nowIn,
  overlaps,
  setSpaceLayoutsInput,
  type FloorPlan,
  type FloorPlanSpace,
  type FloorSpaceState,
} from "@reservation/shared";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";
import { absences, bookings, sites, spaces, userAbsencesFilter, userDayFilter, users } from "./common";

/**
 * The plan of one floor at a chosen time: every space that is on the plan, whether it is free, partly or fully taken,
 * closed, or the caller's own, and who is in it. A person who turned off "show my name on the floor plan" appears as
 * someone without a name. Any signed-in person can read it, like they can search for a free space.
 */
export const getFloorPlan = secureCall(
  { name: "getFloorPlan", schema: floorPlanInput, rateLimit: { limit: 90, windowSec: 60 } },
  async ({ uid, data }): Promise<FloorPlan> => {
    const site = await (await sites()).findOne({ _id: data.siteId });
    if (!site) throw appError("not-found", "spaceNotFound", "Site not found.");

    const slot = { from: data.from, to: data.to };
    const [floorSpaces, dayBookings, myBookings, myAbsences] = await Promise.all([
      (await spaces()).find({ siteId: data.siteId, floor: data.floor, layout: { $ne: null } }).toArray(),
      (await bookings()).find({ siteId: data.siteId, date: data.date, status: "confirmed" }).toArray(),
      (await bookings()).find(userDayFilter(uid, data.date)).toArray(),
      (await absences()).find(userAbsencesFilter(uid)).toArray(),
    ]);

    // Who chose not to be shown.
    const bookedUserIds = [...new Set(dayBookings.filter((b) => overlaps(b, slot)).map((b) => b.userId))];
    const hiding = new Set(
      (await (await users()).find({ _id: { $in: bookedUserIds }, showOnFloorPlan: false }, { projection: { _id: 1 } }).toArray()).map((u) => u._id),
    );

    const now = nowIn(site.timeZone);
    const absent = isWithinRanges(data.date, myAbsences);
    const alreadyBooked = myBookings.some((b) => overlaps(b, slot));

    const result: FloorPlanSpace[] = floorSpaces.flatMap((space) => {
      if (!space.layout) return [];
      const existing = dayBookings.filter((b) => b.spaceId === space._id);
      const here = existing.filter((b) => overlaps(b, slot));

      const closed = space.status === "closed" || isClosedOn(space.closures ?? [], data.date) || !fitsOpeningHours(space.openingHours, data.date, slot);
      const state: FloorSpaceState = closed
        ? "closed"
        : here.some((b) => b.userId === uid)
          ? "mine"
          : !hasCapacity(existing, { from: data.from, to: data.to, attendees: 1 }, space)
            ? "taken"
            : here.length > 0
              ? "partial"
              : "free";

      const problem = findBookingProblem({ space, date: data.date, slot, attendees: 1, existing, now }) ?? (absent ? "absent" : alreadyBooked ? "alreadyBooked" : null);
      return [
        {
          id: space._id,
          name: space.name,
          location: space.location,
          category: space.category,
          capacity: space.capacity,
          equipment: space.equipment,
          tags: space.tags,
          layout: space.layout,
          state,
          people: here.map((b) => ({ name: hiding.has(b.userId) ? null : b.userName, checkedIn: Boolean(b.checkedInAt), me: b.userId === uid })),
          bookable: problem === null,
          reason: problem,
          cost: bookingCost(space.creditsPerHour ?? 0, slot),
        },
      ];
    });
    return { spaces: result };
  },
);

/** Administrator places spaces on the plan of their floor, moves them, or takes them off (a null layout). */
export const setSpaceLayouts = secureCall(
  { name: "setSpaceLayouts", schema: setSpaceLayoutsInput, role: "admin", rateLimit: { limit: 30, windowSec: 60 } },
  async ({ data }) => {
    const col = await spaces();
    const result = await col.bulkWrite(
      data.layouts.map(({ spaceId, layout }) => ({ updateOne: { filter: { _id: spaceId }, update: { $set: { layout, updatedAt: new Date() } } } })),
    );
    if (result.matchedCount < data.layouts.length) throw appError("not-found", "spaceNotFound", "Space not found.");
    return { updated: data.layouts.length };
  },
);
