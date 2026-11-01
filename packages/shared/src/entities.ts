import { z } from "zod";
import { WEEKDAYS, NOTIFICATION_TYPES, SPACE_CATEGORIES, PLAN_KINDS, CREDIT_TRANSACTION_TYPES, INCIDENT_STATUSES, REQUESTABLE_ITEMS, EQUIPMENT_REQUEST_STATUSES, VISIT_STATUSES } from "./models";
import { ROLES } from "./roles";
import { LOCALES } from "./i18n";

/**
 * MongoDB document schemas: the shapes of what is stored, built on the types in `models.ts`.
 * All dates are stored as native `Date`, and `_id` is explicit: the user id for users and
 * wallets, an ObjectId hex string for everything else.
 *
 * These are *document* shapes (what's stored), not API *input* shapes
 * (what a client may send): those live in `schemas.ts`.
 */

const timeRangeSchema = z.object({ from: z.number().int().min(0).max(24 * 60), to: z.number().int().min(0).max(24 * 60) });
const timeRangeArraySchema = z.array(timeRangeSchema);
const openingHoursSchema = z.object(
  Object.fromEntries(WEEKDAYS.map((day) => [day, timeRangeArraySchema])) as Record<(typeof WEEKDAYS)[number], typeof timeRangeArraySchema>,
);

export const notificationPrefsSchema = z.object({ email: z.boolean(), push: z.boolean(), weeklyDigest: z.boolean() });

export const userProfileSchema = z.object({
  _id: z.string().min(1), // uid
  email: z.string().email(),
  displayName: z.string(),
  photoURL: z.string().nullable(),
  departmentId: z.string().nullable(),
  teamIds: z.array(z.string()),
  defaultSiteId: z.string().nullable(),
  role: z.enum(ROLES),
  status: z.enum(["active", "disabled", "anonymized"]),
  notificationPrefs: notificationPrefsSchema,
  locale: z.enum(LOCALES),
  claimsUpdatedAt: z.date().nullable(),
  lastLoginAt: z.date().nullable(),
  disabledAt: z.date().nullable().optional(),
  createdAt: z.date(),
});

export const departmentSchema = z.object({ _id: z.string().min(1), name: z.string() });

export const teamSchema = z.object({
  _id: z.string().min(1),
  name: z.string(),
  departmentId: z.string(),
  managerIds: z.array(z.string()),
  memberIds: z.array(z.string()),
});

const floorSchema = z.object({ id: z.string(), label: z.string() });

export const siteSchema = z.object({
  _id: z.string().min(1),
  name: z.string(),
  address: z.string(),
  timeZone: z.string(),
  floors: z.array(floorSchema),
  defaultOpeningHours: openingHoursSchema,
});

const closureSchema = z.object({ from: z.string(), to: z.string(), reason: z.string() });

export const spaceSchema = z.object({
  _id: z.string().min(1),
  siteId: z.string(),
  floor: z.string(),
  location: z.string(),
  name: z.string(),
  category: z.enum(SPACE_CATEGORIES),
  capacity: z.number().int().min(0),
  creditsPerHour: z.number().min(0),
  equipment: z.array(z.string()),
  tags: z.array(z.string()),
  openingHours: openingHoursSchema,
  status: z.enum(["active", "closed"]),
  closures: z.array(closureSchema),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const auditLogSchema = z.object({
  _id: z.string().min(1),
  actorId: z.string(),
  actorRole: z.union([z.enum(ROLES), z.literal("system")]),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string(),
  details: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.date(),
});

export const bookingSchema = z.object({
  _id: z.string().min(1),
  userId: z.string(),
  userName: z.string(),
  teamIds: z.array(z.string()),
  spaceId: z.string(),
  spaceName: z.string(),
  siteId: z.string(),
  date: z.string(),
  from: z.number().int().min(0).max(24 * 60),
  to: z.number().int().min(0).max(24 * 60),
  attendees: z.number().int().min(1),
  startsAt: z.date(),
  status: z.enum(["confirmed", "cancelled"]),
  credits: z.number().min(0),
  cancelledBy: z.string().nullable(),
  cancelReason: z.string().nullable(),
  reminderSent: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const absenceSchema = z.object({
  _id: z.string().min(1),
  userId: z.string(),
  userName: z.string(),
  from: z.string(),
  to: z.string(),
  note: z.string(),
  createdAt: z.date(),
});

export const appNotificationSchema = z.object({
  _id: z.string().min(1),
  userId: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  body: z.string(),
  link: z.string(),
  readAt: z.date().nullable(),
  createdAt: z.date(),
});

export const deviceSchema = z.object({
  _id: z.string().min(1),
  userId: z.string(),
  endpoint: z.string().max(2048),
  p256dh: z.string().max(256),
  auth: z.string().max(256),
  platform: z.string(),
  userAgent: z.string(),
  lastSeenAt: z.date(),
});

export const walletSchema = z.object({ _id: z.string().min(1), balance: z.number(), updatedAt: z.date() }); // _id: uid

export const planSchema = z.object({
  _id: z.string().min(1),
  name: z.string(),
  description: z.string(),
  kind: z.enum(PLAN_KINDS),
  credits: z.number().int().min(0),
  priceCents: z.number().int().min(0),
  active: z.boolean(),
});

export const subscriptionSchema = z.object({
  _id: z.string().min(1),
  userId: z.string(),
  planId: z.string(),
  planName: z.string(),
  credits: z.number().int().min(0),
  status: z.enum(["active", "cancelled"]),
  nextRenewalAt: z.date(),
  createdAt: z.date(),
  cancelledAt: z.date().nullable(),
});

export const creditTransactionSchema = z.object({
  _id: z.string().min(1),
  userId: z.string(),
  type: z.enum(CREDIT_TRANSACTION_TYPES),
  amount: z.number(),
  balanceAfter: z.number(),
  label: z.string(),
  bookingId: z.string().nullable(),
  createdAt: z.date(),
});

export const incidentSchema = z.object({
  _id: z.string().min(1),
  reporterId: z.string(),
  reporterName: z.string(),
  spaceId: z.string().nullable(),
  spaceName: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  photoIds: z.array(z.string()),
  status: z.enum(INCIDENT_STATUSES),
  adminNote: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const equipmentRequestSchema = z.object({
  _id: z.string().min(1),
  requesterId: z.string(),
  requesterName: z.string(),
  item: z.enum(REQUESTABLE_ITEMS),
  quantity: z.number().int().min(1),
  neededOn: z.string(),
  comment: z.string(),
  status: z.enum(EQUIPMENT_REQUEST_STATUSES),
  adminNote: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

/**
 * A guest invited by an employee. `hostName` is copied at creation from the host's profile
 * (same pattern as `Booking.userName`) rather than read from the ID token, because the token
 * is not refreshed when the host edits their profile.
 */
export const visitSchema = z.object({
  _id: z.string().min(1),
  siteId: z.string().min(1),
  siteName: z.string().min(1),
  hostUserId: z.string().min(1),
  hostName: z.string().min(1),
  guestName: z.string().min(1),
  guestEmail: z.string().email().nullable(),
  guestCompany: z.string().min(1).nullable(),
  visitDate: z.string(), // YYYY-MM-DD
  status: z.enum(VISIT_STATUSES),
  checkedInAt: z.date().nullable(),
  checkedOutAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Visit = z.infer<typeof visitSchema>;

/** Matches `@reservation/shared`'s `RateLimitState` shape; `_id` is `${uid}_${fnName}`. */
export const rateLimitStateSchema = z.object({
  _id: z.string().min(1),
  windowStart: z.number(),
  count: z.number().int().min(0),
});
