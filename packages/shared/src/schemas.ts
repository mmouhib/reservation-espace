import { z } from "zod";
import { LOCALES, type Locale } from "./i18n";
import {
  EQUIPMENT,
  EQUIPMENT_REQUEST_STATUSES,
  INCIDENT_STATUSES,
  NOTIFICATION_TYPES,
  PLAN_KINDS,
  REQUESTABLE_ITEMS,
  SPACE_CATEGORIES,
  SPACE_TAGS,
  type BookingStatus,
  type CreditTransactionType,
  type EquipmentRequestStatus,
  type IncidentStatus,
  type NotificationPrefs,
  type NotificationType,
  type OpeningHours,
  type PlanKind,
  type RequestableItem,
  type SpaceCategory,
  type SubscriptionStatus,
  type UserStatus,
  type VisitStatus,
} from "./models";
import { daysBetween, isDateString } from "./time";
import { ROLES, type Role } from "./roles";

/** Input schemas for the server's endpoints. Validated on the server, reused for client forms. */

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

export const createPaymentInput = z.object({ planId: z.string().min(1).max(64) });
export type CreatePaymentInput = z.infer<typeof createPaymentInput>;

/** What the browser needs to show the card form of Stripe for one payment. */
export interface CreatePaymentResult {
  paymentIntentId: string;
  clientSecret: string;
}

export const confirmPaymentInput = z.object({ paymentIntentId: z.string().regex(/^pi_[A-Za-z0-9_]+$/).max(100) });
export type ConfirmPaymentInput = z.infer<typeof confirmPaymentInput>;

export interface ConfirmPaymentResult {
  credits: number;
}

export const cancelSubscriptionInput = z.object({ subscriptionId: z.string().min(1).max(64) });
export type CancelSubscriptionInput = z.infer<typeof cancelSubscriptionInput>;

export const adjustCreditsInput = z.object({
  uid: z.string().min(1).max(128),
  amount: z.number().int().min(-10_000).max(10_000).refine((n) => n !== 0, "amount must not be 0"),
  label: z.string().max(120).default(""),
});
export type AdjustCreditsInput = z.input<typeof adjustCreditsInput>;

const planFields = {
  name: z.string().min(1).max(80),
  description: z.string().max(300).default(""),
  kind: z.enum(PLAN_KINDS),
  credits: z.number().int().min(1),
  priceCents: z.number().int().min(0),
  active: z.boolean().default(true),
};

export const createPlanInput = z.object(planFields).strict();
export type CreatePlanInput = z.input<typeof createPlanInput>;

export const updatePlanInput = z.object({ planId: z.string().min(1).max(64), ...planFields }).strict();
export type UpdatePlanInput = z.input<typeof updatePlanInput>;

export const deletePlanInput = z.object({ planId: z.string().min(1).max(64) }).strict();
export type DeletePlanInput = z.infer<typeof deletePlanInput>;

/** Wire shapes for the credits module: dates are ISO strings, as a callable result serializes them. */
export interface MyWallet {
  balance: number;
}

export interface PlanSummary {
  id: string;
  name: string;
  description: string;
  kind: PlanKind;
  credits: number;
  priceCents: number;
  active: boolean;
}

export interface SubscriptionSummary {
  id: string;
  planId: string;
  planName: string;
  credits: number;
  status: SubscriptionStatus;
  nextRenewalAt: string;
  createdAt: string;
  cancelledAt: string | null;
}

export interface CreditTransactionSummary {
  id: string;
  type: CreditTransactionType;
  amount: number;
  balanceAfter: number;
  label: string;
  bookingId: string | null;
  createdAt: string;
}

// ---------- Visitors ----------

export const createVisitInput = z
  .object({
    siteId: z.string().min(1).max(64),
    guestName: z.string().min(2).max(120),
    guestEmail: z.string().email().optional(),
    guestCompany: z.string().min(1).max(120).optional(),
    visitDate: dateString,
  })
  .strict();
export type CreateVisitInput = z.input<typeof createVisitInput>;

export const visitIdInput = z.object({ visitId: z.string().min(1).max(64) }).strict();
export type VisitIdInput = z.infer<typeof visitIdInput>;

export const listVisitsForDayInput = z.object({ date: dateString }).strict();
export type ListVisitsForDayInput = z.infer<typeof listVisitsForDayInput>;

/** Wire shape of a visit: dates are ISO strings, as a callable result serializes them. */
export interface VisitSummary {
  id: string;
  siteId: string;
  siteName: string;
  hostUserId: string;
  hostName: string;
  guestName: string;
  guestEmail: string | null;
  guestCompany: string | null;
  visitDate: string;
  status: VisitStatus;
  checkedInAt: string | null;
  checkedOutAt: string | null;
}

// ---------- AI assistant ----------

export const generatePlanDescriptionInput = z
  .object({
    name: z.string().min(2).max(80),
    /** Language to write the description in (the admin's UI language). */
    locale: z.enum(LOCALES).optional(),
  })
  .strict();
export type GeneratePlanDescriptionInput = z.infer<typeof generatePlanDescriptionInput>;

export interface GeneratePlanDescriptionResult {
  description: string;
}

export const chatMessageInput = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(2000),
});
export type ChatMessageInput = z.infer<typeof chatMessageInput>;

export const chatWithAssistantInput = z
  .object({ messages: z.array(chatMessageInput).min(1).max(30) })
  .strict();
export type ChatWithAssistantInput = z.infer<typeof chatWithAssistantInput>;

export interface ChatWithAssistantResult {
  reply: string;
}

// ---------- Incidents and equipment ----------

export const createIncidentInput = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(2000),
    spaceId: z.string().min(1).max(64).nullable().optional(),
    /** Ids of photos the client uploaded first (checked by the handler: they must be the reporter's own). */
    photoIds: z.array(z.string().regex(/^[0-9a-f]{24}$/)).max(3),
  })
  .strict();
export type CreateIncidentInput = z.input<typeof createIncidentInput>;

export const updateIncidentStatusInput = z
  .object({
    incidentId: z.string().min(1).max(64),
    status: z.enum(INCIDENT_STATUSES),
    adminNote: z.string().trim().max(1000),
  })
  .strict();
export type UpdateIncidentStatusInput = z.input<typeof updateIncidentStatusInput>;

export const createEquipmentRequestInput = z
  .object({
    item: z.enum(REQUESTABLE_ITEMS),
    quantity: z.number().int().min(1).max(20),
    neededOn: dateString,
    comment: z.string().trim().max(500),
  })
  .strict();
export type CreateEquipmentRequestInput = z.input<typeof createEquipmentRequestInput>;

export const updateEquipmentRequestStatusInput = z
  .object({
    requestId: z.string().min(1).max(64),
    status: z.enum(EQUIPMENT_REQUEST_STATUSES),
    adminNote: z.string().trim().max(1000),
  })
  .strict();
export type UpdateEquipmentRequestStatusInput = z.input<typeof updateEquipmentRequestStatusInput>;

/** Wire shape of an incident: dates are ISO strings, as a callable result serializes them. */
export interface IncidentSummary {
  id: string;
  reporterId: string;
  reporterName: string;
  spaceId: string | null;
  spaceName: string | null;
  title: string;
  description: string;
  photoIds: string[];
  status: IncidentStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

/** Wire shape of an equipment request: dates are ISO strings, as a callable result serializes them. */
export interface EquipmentRequestSummary {
  id: string;
  requesterId: string;
  requesterName: string;
  item: RequestableItem;
  quantity: number;
  neededOn: string;
  comment: string;
  status: EquipmentRequestStatus;
  adminNote: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- Account ----------

export const emptyInput = z.object({}).strict();

// ---------- Web reads and writes (server/src/api) ----------

const entityId = z.string().min(1).max(64);
const timeRange = z.object({ from: minuteOfDay, to: minuteOfDay }).strict();
const dayHours = z.array(timeRange).max(10);
const openingHoursInput = z
  .object({ mon: dayHours, tue: dayHours, wed: dayHours, thu: dayHours, fri: dayHours, sat: dayHours, sun: dayHours })
  .strict();

// Profile (own account only; departmentId, teamIds and role stay admin-only)

export const updateMyProfileInput = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    notificationPrefs: z.object({ email: z.boolean(), push: z.boolean(), weeklyDigest: z.boolean() }).strict().optional(),
    locale: z.enum(LOCALES).optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, "at least one field is required");
export type UpdateMyProfileInput = z.input<typeof updateMyProfileInput>;

export const registerDeviceInput = z
  .object({
    endpoint: z.url().max(2048),
    keys: z.object({ p256dh: z.string().min(1).max(256), auth: z.string().min(1).max(256) }).strict(),
    platform: z.string().max(100),
    userAgent: z.string().max(200),
  })
  .strict();
export type RegisterDeviceInput = z.input<typeof registerDeviceInput>;

// Reference data: sites, spaces, departments, teams

const floorInput = z.object({ id: z.string().min(1).max(32), label: z.string().trim().min(1).max(80) }).strict();
const siteFields = {
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().max(300),
  timeZone: z.string().min(1).max(64),
  floors: z.array(floorInput).max(50),
  defaultOpeningHours: openingHoursInput,
};
export const createSiteInput = z.object(siteFields).strict();
export const updateSiteInput = z.object({ siteId: entityId, ...siteFields }).strict();
export const deleteSiteInput = z.object({ siteId: entityId }).strict();
export type CreateSiteInput = z.input<typeof createSiteInput>;
export type UpdateSiteInput = z.input<typeof updateSiteInput>;

const closureInput = z.object({ from: dateString, to: dateString, reason: z.string().trim().max(200) }).strict();
const spaceFields = {
  siteId: entityId,
  floor: z.string().max(32),
  location: z.string().trim().max(120),
  name: z.string().trim().min(1).max(120),
  category: z.enum(SPACE_CATEGORIES),
  capacity: z.number().int().min(0).max(10_000),
  creditsPerHour: z.number().min(0).max(10_000),
  equipment: z.array(z.enum(EQUIPMENT)).max(20),
  tags: z.array(z.enum(SPACE_TAGS)).max(10),
  status: z.enum(["active", "closed"]),
  openingHours: openingHoursInput,
  closures: z.array(closureInput).max(100),
};
export const createSpaceInput = z.object(spaceFields).strict();
export const updateSpaceInput = z.object({ spaceId: entityId, ...spaceFields }).strict();
export const deleteSpaceInput = z.object({ spaceId: entityId }).strict();
export type CreateSpaceInput = z.input<typeof createSpaceInput>;
export type UpdateSpaceInput = z.input<typeof updateSpaceInput>;

export const listSpacesInput = z.object({ siteId: entityId.optional() }).strict();
export type ListSpacesInput = z.input<typeof listSpacesInput>;

export const createDepartmentInput = z.object({ name: z.string().trim().min(1).max(120) }).strict();
export const updateDepartmentInput = z.object({ departmentId: entityId, name: z.string().trim().min(1).max(120) }).strict();
export const deleteDepartmentInput = z.object({ departmentId: entityId }).strict();

const teamFields = {
  name: z.string().trim().min(1).max(120),
  departmentId: entityId,
  managerIds: z.array(entityId).max(50),
};
export const createTeamInput = z.object(teamFields).strict();
export const updateTeamInput = z.object({ teamId: entityId, ...teamFields }).strict();
export const deleteTeamInput = z.object({ teamId: entityId }).strict();
export type CreateTeamInput = z.input<typeof createTeamInput>;
export type UpdateTeamInput = z.input<typeof updateTeamInput>;

// Bookings, absences, statistics

/** A date range, both ends inclusive (YYYY-MM-DD). */
const dateRangeFields = { from: dateString, to: dateString };
const notReversed = (range: { from: string; to: string }) => range.from <= range.to;
export const dateRangeInput = z.object(dateRangeFields).strict().refine(notReversed, "from must not be after to");

export const listMyBookingsInput = z.object({ limit: z.number().int().min(1).max(100).default(100) }).strict();
export const listMyUpcomingBookingsInput = z.object({ fromDate: dateString }).strict();
export const listBookingsInRangeInput = z
  .object({ ...dateRangeFields, limit: z.number().int().min(1).max(5000).default(1000) })
  .strict()
  .refine(notReversed, "from must not be after to");
export type ListBookingsInRangeInput = z.input<typeof listBookingsInRangeInput>;

// Notifications and devices

export const listMyNotificationsInput = z
  .object({ unreadOnly: z.boolean().default(false), limit: z.number().int().min(1).max(100).default(50) })
  .strict();
export type ListMyNotificationsInput = z.input<typeof listMyNotificationsInput>;

export const markNotificationReadInput = z.object({ notificationId: entityId }).strict();

// Admin: users and audit

export const listUsersInput = z
  .object({
    roles: z.array(z.enum(ROLES)).max(3).optional(),
    limit: z.number().int().min(1).max(300).default(20),
    /** Position of the last user of the previous page (displayName, then id). */
    after: z.object({ displayName: z.string(), id: entityId }).strict().nullable().optional(),
  })
  .strict();
export type ListUsersInput = z.input<typeof listUsersInput>;

export const listAuditLogsInput = z
  .object({ action: z.string().min(1).max(60).optional(), limit: z.number().int().min(1).max(500).default(50) })
  .strict();
export type ListAuditLogsInput = z.input<typeof listAuditLogsInput>;

// ---------- Wire shapes of the web reads (dates are ISO strings) ----------

export interface UserSummary {
  id: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  departmentId: string | null;
  teamIds: string[];
  defaultSiteId: string | null;
  role: Role;
  status: UserStatus;
  notificationPrefs: NotificationPrefs;
  locale: Locale;
  claimsUpdatedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface SiteSummary {
  id: string;
  name: string;
  address: string;
  timeZone: string;
  floors: { id: string; label: string }[];
  defaultOpeningHours: OpeningHours;
}

export interface SpaceSummary {
  id: string;
  siteId: string;
  floor: string;
  location: string;
  name: string;
  category: SpaceCategory;
  capacity: number;
  creditsPerHour: number;
  equipment: string[];
  tags: string[];
  openingHours: OpeningHours;
  status: "active" | "closed";
  closures: { from: string; to: string; reason: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface DepartmentSummary {
  id: string;
  name: string;
}

export interface TeamSummary {
  id: string;
  name: string;
  departmentId: string;
  managerIds: string[];
  memberIds: string[];
}

export interface BookingSummary {
  id: string;
  userId: string;
  userName: string;
  teamIds: string[];
  spaceId: string;
  spaceName: string;
  siteId: string;
  date: string;
  from: number;
  to: number;
  attendees: number;
  startsAt: string;
  status: BookingStatus;
  credits: number;
  cancelledBy: string | null;
  cancelReason: string | null;
  /** When the person checked in by scanning the QR code of the space, if they did. */
  checkedInAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AbsenceSummary {
  id: string;
  userId: string;
  userName: string;
  from: string;
  to: string;
  note: string;
  createdAt: string;
}

export interface NotificationSummary {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  readAt: string | null;
  createdAt: string;
}

export interface AuditLogSummary {
  id: string;
  actorId: string;
  /** Display name of the actor, or the id when the user is unknown. */
  actorName: string;
  actorRole: Role | "system";
  action: string;
  targetType: string;
  targetId: string;
  /** Display name when the target is a user, else null. */
  targetName: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface BookingTotals {
  /** Confirmed bookings in the range. */
  confirmed: number;
  cancelled: number;
  /** Hours booked, confirmed only. */
  hours: number;
  /** Credits spent, confirmed only. */
  credits: number;
  /** Distinct users with a confirmed booking. */
  users: number;
}

export interface BookingsPerDay {
  date: string;
  count: number;
}

export interface HoursPerCategory {
  category: SpaceCategory;
  hours: number;
}

export interface TopSpace {
  name: string;
  count: number;
}

// ---------- Calendar ----------

const eventFields = {
  title: z.string().trim().min(1).max(120),
  note: z.string().trim().max(1000).default(""),
  date: dateString,
  allDay: z.boolean().default(false),
  from: minuteOfDay.default(0),
  to: minuteOfDay.default(24 * 60),
};
const hasValidTimes = (event: { allDay: boolean; from: number; to: number }) => event.allDay || event.to > event.from;
const INVALID_TIMES = "an event must end after it starts";

export const createEventInput = z.object(eventFields).strict().refine(hasValidTimes, INVALID_TIMES);
export type CreateEventInput = z.input<typeof createEventInput>;

export const updateEventInput = z
  .object({ eventId: z.string().min(1).max(64), ...eventFields })
  .strict()
  .refine(hasValidTimes, INVALID_TIMES);
export type UpdateEventInput = z.input<typeof updateEventInput>;

export const deleteEventInput = z.object({ eventId: z.string().min(1).max(64) }).strict();
export type DeleteEventInput = z.infer<typeof deleteEventInput>;

/** The days a calendar screen shows: a month view with the days around it is at most 42 days. */
const MAX_CALENDAR_DAYS = 70;
export const calendarRangeInput = z
  .object({ from: dateString, to: dateString })
  .strict()
  .refine((range) => range.to >= range.from && daysBetween(range.from, range.to) <= MAX_CALENDAR_DAYS, "invalid range");
export type CalendarRangeInput = z.infer<typeof calendarRangeInput>;

export interface EventSummary {
  id: string;
  title: string;
  note: string;
  date: string;
  allDay: boolean;
  from: number;
  to: number;
}

/** The secret of the person's calendar link: `<server>/api/calendar/<token>.ics`. */
export interface CalendarFeedResult {
  token: string;
}

// ---------- Check-in ----------

export const checkInInput = z.object({ spaceId: z.string().min(1).max(64) }).strict();
export type CheckInInput = z.infer<typeof checkInInput>;

export interface CheckInResult {
  booking: BookingSummary;
  alreadyCheckedIn: boolean;
}
