import type { Locale } from "./i18n";
import type { Role } from "./roles";

/**
 * Document shapes. Timestamps are typed as `T` so the same interfaces work with
 * the client SDK Timestamp, the Admin SDK Timestamp, or plain Dates in tests.
 */

export type UserStatus = "active" | "disabled" | "anonymized";

export interface NotificationPrefs {
  email: boolean;
  push: boolean;
  weeklyDigest: boolean;
}

export interface UserProfile<T = unknown> {
  email: string;
  displayName: string;
  photoURL: string | null;
  departmentId: string | null;
  teamIds: string[];
  defaultSiteId: string | null;
  /** Mirror of the `role` custom claim. Written by Cloud Functions only. */
  role: Role;
  status: UserStatus;
  notificationPrefs: NotificationPrefs;
  /** Preferred UI language, also used for server-sent emails and notifications. */
  locale: Locale;
  /** Bumped by Functions when custom claims change, so clients refresh their ID token. */
  claimsUpdatedAt: T | null;
  lastLoginAt: T | null;
  createdAt: T;
}

export interface Department {
  name: string;
}

export interface Team {
  name: string;
  departmentId: string;
  managerIds: string[];
  memberIds: string[];
}

/** Minutes since local midnight, e.g. 08:30 → 510. */
export type MinuteOfDay = number;

export interface TimeRange {
  from: MinuteOfDay;
  to: MinuteOfDay;
}

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type OpeningHours = Record<Weekday, TimeRange[]>;

export interface Floor {
  id: string;
  label: string;
}

export interface Site {
  name: string;
  address: string;
  timeZone: string;
  floors: Floor[];
  defaultOpeningHours: OpeningHours;
}

export const SPACE_CATEGORIES = ["desk", "open_space", "meeting_room", "coworking", "phone_booth"] as const;
export type SpaceCategory = (typeof SPACE_CATEGORIES)[number];

export interface Closure {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD (inclusive)
  reason: string;
}

export const EQUIPMENT = ["screen", "dock", "whiteboard", "videoconference", "projector"] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const SPACE_TAGS = ["quiet_zone", "window", "standing_desk", "accessible"] as const;
export type SpaceTag = (typeof SPACE_TAGS)[number];

export function isEquipment(value: string): value is Equipment {
  return (EQUIPMENT as readonly string[]).includes(value);
}

export function isSpaceTag(value: string): value is SpaceTag {
  return (SPACE_TAGS as readonly string[]).includes(value);
}

export interface Space<T = unknown> {
  siteId: string;
  floor: string;
  location: string;
  name: string;
  category: SpaceCategory;
  capacity: number;
  /** Credits charged per hour of booking. 0 means free. */
  creditsPerHour: number;
  equipment: string[];
  tags: string[];
  openingHours: OpeningHours;
  status: "active" | "closed";
  closures: Closure[];
  createdAt: T;
  updatedAt: T;
}

export interface AuditLog<T = unknown> {
  actorId: string;
  actorRole: Role;
  action: string;
  targetType: string;
  targetId: string;
  details: Record<string, unknown> | null;
  createdAt: T;
}

// ---------- Bookings ----------

export type BookingStatus = "confirmed" | "cancelled";

export interface Booking<T = unknown> {
  userId: string;
  userName: string;
  teamIds: string[];
  spaceId: string;
  spaceName: string;
  siteId: string;
  /** Day of the booking in the site's time zone, YYYY-MM-DD. */
  date: string;
  from: MinuteOfDay;
  to: MinuteOfDay;
  /** Seats taken (shared spaces) or people attending (meeting rooms). */
  attendees: number;
  /** The exact start instant, used to send reminders. */
  startsAt: T;
  status: BookingStatus;
  /** Credits charged for this booking. */
  credits: number;
  cancelledBy: string | null;
  cancelReason: string | null;
  reminderSent: boolean;
  createdAt: T;
  updatedAt: T;
}

/** Dates (inclusive) when a user is away: their bookings are cancelled and new ones refused. */
export interface Absence<T = unknown> {
  userId: string;
  userName: string;
  from: string;
  to: string;
  note: string;
  createdAt: T;
}

// ---------- Notifications ----------

export const NOTIFICATION_TYPES = [
  "bookingConfirmed",
  "bookingCancelled",
  "bookingCancelledByAdmin",
  "bookingMoved",
  "bookingReminder",
  "weeklyDigest",
  "creditsAdded",
  "subscriptionRenewed",
  "incidentReceived",
  "incidentUpdated",
  "equipmentUpdated",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** In-app inbox item at users/{uid}/notifications/{id}. Text is stored already translated. */
export interface AppNotification<T = unknown> {
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  readAt: T | null;
  createdAt: T;
}

// ---------- Credits and subscriptions ----------

/** The balance of a user, at wallets/{uid}. Written by Cloud Functions only. */
export interface Wallet<T = unknown> {
  balance: number;
  updatedAt: T;
}

export const PLAN_KINDS = ["pack", "subscription"] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

/** A pack adds credits once; a subscription adds them every month. */
export interface Plan {
  name: string;
  description: string;
  kind: PlanKind;
  credits: number;
  priceCents: number;
  active: boolean;
}

export type SubscriptionStatus = "active" | "cancelled";

export interface Subscription<T = unknown> {
  userId: string;
  planId: string;
  planName: string;
  /** Credits added at each renewal. */
  credits: number;
  status: SubscriptionStatus;
  nextRenewalAt: T;
  createdAt: T;
  cancelledAt: T | null;
}

export const CREDIT_TRANSACTION_TYPES = ["purchase", "subscription", "booking", "refund", "adjustment"] as const;
export type CreditTransactionType = (typeof CREDIT_TRANSACTION_TYPES)[number];

export interface CreditTransaction<T = unknown> {
  userId: string;
  type: CreditTransactionType;
  /** Positive when credits are added, negative when spent. */
  amount: number;
  balanceAfter: number;
  /** Plan name, space name or admin note. */
  label: string;
  bookingId: string | null;
  createdAt: T;
}

// ---------- Incidents and equipment ----------

export const INCIDENT_STATUSES = ["open", "in_progress", "resolved"] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export interface Incident<T = unknown> {
  reporterId: string;
  reporterName: string;
  spaceId: string | null;
  spaceName: string | null;
  title: string;
  description: string;
  /** Storage paths under incidents/{uid}/. */
  photoPaths: string[];
  status: IncidentStatus;
  adminNote: string;
  createdAt: T;
  updatedAt: T;
}

export const REQUESTABLE_ITEMS = ["screen", "keyboard", "mouse", "headset", "webcam", "adapter", "chair"] as const;
export type RequestableItem = (typeof REQUESTABLE_ITEMS)[number];

export const EQUIPMENT_REQUEST_STATUSES = ["pending", "approved", "rejected"] as const;
export type EquipmentRequestStatus = (typeof EQUIPMENT_REQUEST_STATUSES)[number];

export interface EquipmentRequest<T = unknown> {
  requesterId: string;
  requesterName: string;
  item: RequestableItem;
  quantity: number;
  /** Date the equipment is needed, YYYY-MM-DD. */
  neededOn: string;
  comment: string;
  status: EquipmentRequestStatus;
  adminNote: string;
  createdAt: T;
  updatedAt: T;
}
