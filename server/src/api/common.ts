import {
  COL,
  type AppNotification,
  type AuditLog,
  type Department,
  type Team,
  type AbsenceSummary,
  type BookingSummary,
  type NotificationSummary,
  type SiteSummary,
  type SpaceSummary,
  type TeamSummary,
  type UserSummary,
} from "@reservation/shared";
import { getDb } from "../lib/mongo";
import type { AbsenceDoc, BookingDoc, SiteDoc, SpaceDoc, UserDoc } from "../bookings/common";

export type { AbsenceDoc, BookingDoc, SiteDoc, SpaceDoc, UserDoc };

export type TeamDoc = Team & { _id: string };
export type DepartmentDoc = Department & { _id: string };
export type NotificationDoc = AppNotification<Date> & { _id: string; userId: string };
export type AuditDoc = AuditLog<Date> & { _id: string };

/** A browser's Web Push subscription, one document per subscription (`_id` is its endpoint). */
export interface DeviceDoc {
  _id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  platform: string;
  userAgent: string;
  lastSeenAt: Date;
}

export async function col<T extends { _id: string }>(name: string) {
  return (await getDb()).collection<T>(name);
}

export const usersCol = () => col<UserDoc>(COL.users);
export const teamsCol = () => col<TeamDoc>(COL.teams);
export const departmentsCol = () => col<DepartmentDoc>(COL.departments);
export const sitesCol = () => col<SiteDoc>(COL.sites);
export const spacesCol = () => col<SpaceDoc>(COL.spaces);
export const notificationsCol = () => col<NotificationDoc>(COL.notifications);

export const isoOrNull = (date: Date | null | undefined): string | null => (date ? date.toISOString() : null);

export function toUserSummary(user: UserDoc): UserSummary {
  return {
    id: user._id,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    departmentId: user.departmentId,
    teamIds: user.teamIds,
    defaultSiteId: user.defaultSiteId,
    role: user.role,
    status: user.status,
    notificationPrefs: user.notificationPrefs,
    locale: user.locale,
    claimsUpdatedAt: isoOrNull(user.claimsUpdatedAt),
    lastLoginAt: isoOrNull(user.lastLoginAt),
    showOnFloorPlan: user.showOnFloorPlan ?? true,
    createdAt: user.createdAt.toISOString(),
  };
}

export function toSiteSummary(site: SiteDoc): SiteSummary {
  return {
    id: site._id,
    name: site.name,
    address: site.address,
    timeZone: site.timeZone,
    floors: site.floors,
    defaultOpeningHours: site.defaultOpeningHours,
  };
}

export function toSpaceSummary(space: SpaceDoc): SpaceSummary {
  return {
    id: space._id,
    siteId: space.siteId,
    floor: space.floor,
    location: space.location,
    name: space.name,
    category: space.category,
    capacity: space.capacity,
    creditsPerHour: space.creditsPerHour,
    equipment: space.equipment,
    tags: space.tags,
    openingHours: space.openingHours,
    status: space.status,
    closures: space.closures,
    layout: space.layout ?? null,
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString(),
  };
}

export function toTeamSummary(team: TeamDoc): TeamSummary {
  return {
    id: team._id,
    name: team.name,
    departmentId: team.departmentId,
    managerIds: team.managerIds,
    memberIds: team.memberIds,
  };
}

export function toBookingSummary(booking: BookingDoc): BookingSummary {
  return {
    id: booking._id,
    userId: booking.userId,
    userName: booking.userName,
    teamIds: booking.teamIds,
    spaceId: booking.spaceId,
    spaceName: booking.spaceName,
    siteId: booking.siteId,
    date: booking.date,
    from: booking.from,
    to: booking.to,
    attendees: booking.attendees,
    startsAt: booking.startsAt.toISOString(),
    status: booking.status,
    credits: booking.credits,
    cancelledBy: booking.cancelledBy,
    cancelReason: booking.cancelReason,
    checkedInAt: booking.checkedInAt?.toISOString() ?? null,
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString(),
  };
}

export function toAbsenceSummary(absence: AbsenceDoc): AbsenceSummary {
  return {
    id: absence._id,
    userId: absence.userId,
    userName: absence.userName,
    from: absence.from,
    to: absence.to,
    note: absence.note,
    createdAt: absence.createdAt.toISOString(),
  };
}

export function toNotificationSummary(notification: NotificationDoc): NotificationSummary {
  return {
    id: notification._id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    readAt: isoOrNull(notification.readAt),
    createdAt: notification.createdAt.toISOString(),
  };
}
