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

export interface Space<T = unknown> {
  siteId: string;
  floor: string;
  location: string;
  name: string;
  category: SpaceCategory;
  capacity: number;
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
