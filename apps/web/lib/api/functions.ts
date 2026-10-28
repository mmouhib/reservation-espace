import { FirebaseError } from "firebase/app";
import { FunctionsError, httpsCallable } from "firebase/functions";
import {
  isErrorReason,
  type AdjustCreditsInput,
  type AnonymizeUserInput,
  type BootstrapProfileInput,
  type BootstrapProfileResult,
  type CancelBookingInput,
  type CancelSubscriptionInput,
  type ChatMessageInput,
  type ChatWithAssistantResult,
  type CreateBookingInput,
  type CreatePlanInput,
  type CreateVisitInput,
  type CreateIncidentInput,
  type CreateEquipmentRequestInput,
  type CreditTransactionSummary,
  type DeclareAbsenceInput,
  type DeletePlanInput,
  type GeneratePlanDescriptionInput,
  type GeneratePlanDescriptionResult,
  type ListVisitsForDayInput,
  type MessageKey,
  type MyWallet,
  type PlanSummary,
  type PurchasePlanInput,
  type RemoveAbsenceInput,
  type SearchSpacesInput,
  type SetUserRoleInput,
  type SpaceSlotStatus,
  type SubscriptionSummary,
  type TeamBookingsInput,
  type TeamBookingsResult,
  type UpdateBookingInput,
  type UpdatePlanInput,
  type UpdateUserOrgInput,
  type VisitIdInput,
  type VisitSummary,
  type UserSummary,
  type SiteSummary,
  type SpaceSummary,
  type DepartmentSummary,
  type TeamSummary,
  type BookingSummary,
  type AbsenceSummary,
  type NotificationSummary,
  type AuditLogSummary,
  type BookingTotals,
  type BookingsPerDay,
  type HoursPerCategory,
  type TopSpace,
  type Role,
  type NotificationPrefs,
  type IncidentSummary,
  type EquipmentRequestSummary,
  type UpdateIncidentStatusInput,
  type UpdateEquipmentRequestStatusInput,
} from "@reservation/shared";
import { getFirebase } from "@/lib/firebase/client";

/** Typed wrappers over callable Cloud Functions. */

function callable<I, O>(name: string) {
  return async (input: I): Promise<O> => {
    const fn = httpsCallable<I, O>(getFirebase().functions, name);
    const res = await fn(input);
    return res.data;
  };
}

type Empty = Record<string, never>;

export const api = {
  // Users
  bootstrapProfile: callable<BootstrapProfileInput, BootstrapProfileResult>("bootstrapProfile"),
  setUserRole: callable<SetUserRoleInput, { changed: boolean }>("setUserRole"),
  runDirectorySyncNow: callable<Empty, { checked: number; disabled: string[] }>("runDirectorySyncNow"),
  updateUserOrg: callable<UpdateUserOrgInput, { updated: boolean }>("updateUserOrg"),
  exportMyData: callable<Empty, Record<string, unknown>>("exportMyData"),
  deleteMyAccount: callable<Empty, { deleted: boolean }>("deleteMyAccount"),
  anonymizeUser: callable<AnonymizeUserInput, { deleted: boolean }>("anonymizeUser"),
  // Bookings
  searchSpaces: callable<SearchSpacesInput, SpaceSlotStatus[]>("searchSpaces"),
  createBooking: callable<CreateBookingInput, { bookingId: string }>("createBooking"),
  updateBooking: callable<UpdateBookingInput, { updated: boolean }>("updateBooking"),
  cancelBooking: callable<CancelBookingInput, { cancelled: boolean }>("cancelBooking"),
  declareAbsence: callable<DeclareAbsenceInput, { absenceId: string; cancelled: number }>("declareAbsence"),
  removeAbsence: callable<RemoveAbsenceInput, { removed: boolean }>("removeAbsence"),
  teamBookings: callable<TeamBookingsInput, TeamBookingsResult>("teamBookings"),
  // Credits
  purchasePlan: callable<PurchasePlanInput, { credits: number }>("purchasePlan"),
  cancelSubscription: callable<CancelSubscriptionInput, { cancelled: boolean }>("cancelSubscription"),
  adjustCredits: callable<AdjustCreditsInput, { adjusted: boolean }>("adjustCredits"),
  getMyWallet: callable<Empty, MyWallet>("getMyWallet"),
  getMyCreditHistory: callable<Empty, CreditTransactionSummary[]>("getMyCreditHistory"),
  getMySubscription: callable<Empty, SubscriptionSummary | null>("getMySubscription"),
  listPlans: callable<Empty, PlanSummary[]>("listPlans"),
  listAllPlans: callable<Empty, PlanSummary[]>("listAllPlans"),
  createPlan: callable<CreatePlanInput, { planId: string }>("createPlan"),
  updatePlan: callable<UpdatePlanInput, { updated: boolean }>("updatePlan"),
  deletePlan: callable<DeletePlanInput, { deleted: boolean }>("deletePlan"),
  // Visitors
  createVisit: callable<CreateVisitInput, { visitId: string }>("createVisit"),
  getMyVisits: callable<Empty, VisitSummary[]>("getMyVisits"),
  cancelVisit: callable<VisitIdInput, { cancelled: boolean }>("cancelVisit"),
  listVisitsForDay: callable<ListVisitsForDayInput, VisitSummary[]>("listVisitsForDay"),
  checkInVisit: callable<VisitIdInput, { checkedIn: boolean }>("checkInVisit"),
  checkOutVisit: callable<VisitIdInput, { checkedOut: boolean }>("checkOutVisit"),
  // Profile and devices
  getMyProfile: callable<Empty, UserSummary | null>("getMyProfile"),
  updateMyProfile: callable<
    { displayName?: string; notificationPrefs?: NotificationPrefs; locale?: "fr" | "en" },
    { updated: boolean }
  >("updateMyProfile"),
  registerDevice: callable<{ fcmToken: string; platform: string; userAgent: string }, { registered: boolean }>("registerDevice"),
  // Reference data (sites, spaces, departments, teams)
  listSites: callable<Empty, SiteSummary[]>("listSites"),
  listSpaces: callable<{ siteId?: string }, SpaceSummary[]>("listSpaces"),
  listDepartments: callable<Empty, DepartmentSummary[]>("listDepartments"),
  listMyTeams: callable<Empty, TeamSummary[]>("listMyTeams"),
  listTeams: callable<Empty, TeamSummary[]>("listTeams"),
  createSite: callable<Record<string, unknown>, { siteId: string }>("createSite"),
  updateSite: callable<Record<string, unknown>, { updated: boolean }>("updateSite"),
  deleteSite: callable<{ siteId: string }, { deleted: boolean }>("deleteSite"),
  createSpace: callable<Record<string, unknown>, { spaceId: string }>("createSpace"),
  updateSpace: callable<Record<string, unknown>, { updated: boolean }>("updateSpace"),
  deleteSpace: callable<{ spaceId: string }, { deleted: boolean }>("deleteSpace"),
  createDepartment: callable<{ name: string }, { departmentId: string }>("createDepartment"),
  updateDepartment: callable<{ departmentId: string; name: string }, { updated: boolean }>("updateDepartment"),
  deleteDepartment: callable<{ departmentId: string }, { deleted: boolean }>("deleteDepartment"),
  createTeam: callable<{ name: string; departmentId: string | null; managerIds: string[] }, { teamId: string }>("createTeam"),
  updateTeam: callable<{ teamId: string; name: string; departmentId: string | null; managerIds: string[] }, { updated: boolean }>("updateTeam"),
  deleteTeam: callable<{ teamId: string }, { deleted: boolean }>("deleteTeam"),
  // Bookings and absences (reads)
  listMyBookings: callable<{ limit?: number }, BookingSummary[]>("listMyBookings"),
  listMyUpcomingBookings: callable<{ fromDate: string }, BookingSummary[]>("listMyUpcomingBookings"),
  listBookingsInRange: callable<{ from: string; to: string; limit?: number }, BookingSummary[]>("listBookingsInRange"),
  listMyAbsences: callable<Empty, AbsenceSummary[]>("listMyAbsences"),
  // Notifications
  listMyNotifications: callable<{ unreadOnly?: boolean; limit?: number }, NotificationSummary[]>("listMyNotifications"),
  markNotificationRead: callable<{ notificationId: string }, { marked: boolean }>("markNotificationRead"),
  markAllNotificationsRead: callable<Empty, { marked: number }>("markAllNotificationsRead"),
  // Support (own requests)
  createIncident: callable<CreateIncidentInput, { incidentId: string }>("createIncident"),
  listMyIncidents: callable<Empty, IncidentSummary[]>("listMyIncidents"),
  createEquipmentRequest: callable<CreateEquipmentRequestInput, { requestId: string }>("createEquipmentRequest"),
  listMyEquipmentRequests: callable<Empty, EquipmentRequestSummary[]>("listMyEquipmentRequests"),
  // Support (admin)
  listAllIncidents: callable<Empty, IncidentSummary[]>("listAllIncidents"),
  updateIncidentStatus: callable<UpdateIncidentStatusInput, { updated: boolean }>("updateIncidentStatus"),
  listAllEquipmentRequests: callable<Empty, EquipmentRequestSummary[]>("listAllEquipmentRequests"),
  updateEquipmentRequestStatus: callable<UpdateEquipmentRequestStatusInput, { updated: boolean }>("updateEquipmentRequestStatus"),
  // Admin reads
  listUsers: callable<
    { roles?: Role[]; limit?: number; after?: { displayName: string; id: string } | null },
    { users: UserSummary[]; next: { displayName: string; id: string } | null }
  >("listUsers"),
  listAuditLogs: callable<{ action?: string; limit?: number }, AuditLogSummary[]>("listAuditLogs"),
  getBookingTotals: callable<{ from: string; to: string }, BookingTotals>("getBookingTotals"),
  getBookingsPerDay: callable<{ from: string; to: string }, BookingsPerDay[]>("getBookingsPerDay"),
  getHoursPerCategory: callable<{ from: string; to: string }, HoursPerCategory[]>("getHoursPerCategory"),
  getTopSpaces: callable<{ from: string; to: string }, TopSpace[]>("getTopSpaces"),
  // AI assistant
  generatePlanDescription: callable<GeneratePlanDescriptionInput, GeneratePlanDescriptionResult>("generatePlanDescription"),
  /** Streaming chat: the text arrives chunk by chunk through `.stream`, then `.data` resolves to the full reply. */
  chatWithAssistant: (messages: ChatMessageInput[]) =>
    httpsCallable<{ messages: ChatMessageInput[] }, ChatWithAssistantResult, string>(getFirebase().functions, "chatWithAssistant").stream({
      messages,
    }),
};

const CODE_KEYS: Record<string, MessageKey> = {
  "functions/unauthenticated": "errors.authRequired",
  "functions/permission-denied": "errors.forbidden",
  "functions/resource-exhausted": "errors.rateLimited",
  "functions/unavailable": "errors.unavailable",
  "functions/internal": "errors.internal",
  "auth/popup-closed-by-user": "errors.popupClosed",
  "auth/network-request-failed": "errors.network",
  "auth/invalid-credential": "errors.invalidCredential",
  "auth/user-disabled": "errors.accountDisabled",
};

/**
 * Translation key for any error. Callable errors carry a `reason` set by the
 * server (see functions/src/lib/errors.ts); other Firebase errors map by code.
 */
export function errorKey(err: unknown): MessageKey {
  if (err instanceof FunctionsError) {
    const reason = (err.details as { reason?: unknown } | undefined)?.reason;
    if (isErrorReason(reason)) return `errors.${reason}`;
  }
  if (err instanceof FirebaseError) {
    return CODE_KEYS[err.code] ?? "errors.generic";
  }
  return "errors.generic";
}
