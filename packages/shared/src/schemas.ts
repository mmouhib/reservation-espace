import { z } from "zod";
import { LOCALES } from "./i18n";
import { isDateString } from "./time";
import { ROLES } from "./roles";

/** Input schemas for callable Cloud Functions. Validated on the server, reused for client forms. */

export const setUserRoleInput = z.object({
  uid: z.string().min(1).max(128),
  role: z.enum(ROLES),
});
export type SetUserRoleInput = z.infer<typeof setUserRoleInput>;

export const bootstrapProfileInput = z
  .object({
    /** The client's current language, stored on profile creation. */
    locale: z.enum(LOCALES).optional(),
  })
  .strict();
export type BootstrapProfileInput = z.infer<typeof bootstrapProfileInput>;

export interface BootstrapProfileResult {
  created: boolean;
  /** True when custom claims were changed and the client must refresh its ID token. */
  claimsChanged: boolean;
}

// ---------- Users ----------

export const updateUserOrgInput = z.object({
  uid: z.string().min(1).max(128),
  departmentId: z.string().min(1).max(64).nullable(),
  teamIds: z.array(z.string().min(1).max(64)).max(20),
});
export type UpdateUserOrgInput = z.infer<typeof updateUserOrgInput>;

export const anonymizeUserInput = z.object({ uid: z.string().min(1).max(128) });
export type AnonymizeUserInput = z.infer<typeof anonymizeUserInput>;

// ---------- Bookings ----------

const dateString = z.string().refine(isDateString, "YYYY-MM-DD expected");
const minuteOfDay = z.number().int().min(0).max(24 * 60);
const attendees = z.number().int().min(1).max(500);

export const searchSpacesInput = z.object({
  siteId: z.string().min(1).max(64),
  date: dateString,
  from: minuteOfDay,
  to: minuteOfDay,
  attendees: attendees.optional(),
});
export type SearchSpacesInput = z.infer<typeof searchSpacesInput>;

/** What the search says about one space for the requested slot. */
export interface SpaceSlotStatus {
  spaceId: string;
  available: boolean;
  /** Why the space cannot be booked, when `available` is false. */
  reason: string | null;
  /** Credits this booking would cost. */
  cost: number;
  /** Confirmed bookings of the day, without any user information. */
  busy: { from: number; to: number; attendees: number }[];
}

export const createBookingInput = z.object({
  spaceId: z.string().min(1).max(64),
  date: dateString,
  from: minuteOfDay,
  to: minuteOfDay,
  attendees: attendees.default(1),
});
export type CreateBookingInput = z.input<typeof createBookingInput>;

export const updateBookingInput = z.object({
  bookingId: z.string().min(1).max(64),
  /** Only administrators can move a booking to another space. */
  spaceId: z.string().min(1).max(64).optional(),
  date: dateString,
  from: minuteOfDay,
  to: minuteOfDay,
  attendees: attendees.optional(),
});
export type UpdateBookingInput = z.infer<typeof updateBookingInput>;

export const cancelBookingInput = z.object({
  bookingId: z.string().min(1).max(64),
  reason: z.string().max(200).optional(),
});
export type CancelBookingInput = z.infer<typeof cancelBookingInput>;

export const declareAbsenceInput = z.object({
  from: dateString,
  to: dateString,
  note: z.string().max(200).default(""),
});
export type DeclareAbsenceInput = z.input<typeof declareAbsenceInput>;

export const removeAbsenceInput = z.object({ absenceId: z.string().min(1).max(64) });
export type RemoveAbsenceInput = z.infer<typeof removeAbsenceInput>;

export const teamBookingsInput = z.object({ date: dateString });
export type TeamBookingsInput = z.infer<typeof teamBookingsInput>;

export interface TeamBookingsResult {
  members: { uid: string; name: string; teamName: string }[];
  bookings: { id: string; userId: string; spaceName: string; from: number; to: number }[];
}

// ---------- Credits ----------

export const purchasePlanInput = z.object({ planId: z.string().min(1).max(64) });
export type PurchasePlanInput = z.infer<typeof purchasePlanInput>;

export const cancelSubscriptionInput = z.object({ subscriptionId: z.string().min(1).max(64) });
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionInput>;

export const adjustCreditsInput = z.object({
  uid: z.string().min(1).max(128),
  amount: z.number().int().min(-10_000).max(10_000).refine((n) => n !== 0, "amount must not be 0"),
  label: z.string().max(120).default(""),
});
export type AdjustCreditsInput = z.input<typeof adjustCreditsInput>;

// ---------- Account ----------

export const emptyInput = z.object({}).strict();
