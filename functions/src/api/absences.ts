import { emptyInput, type AbsenceSummary } from "@reservation/shared";
import { absences, userAbsencesFilter } from "../bookings/common";
import { secureCall } from "../lib/callable";
import { toAbsenceSummary } from "./common";

/** The signed-in user's absences, latest start first. */
export const listMyAbsences = secureCall({ name: "listMyAbsences", schema: emptyInput }, async ({ uid }): Promise<AbsenceSummary[]> => {
  const docs = await (await absences()).find(userAbsencesFilter(uid)).sort({ from: -1 }).limit(200).toArray();
  return docs.map(toAbsenceSummary);
});
