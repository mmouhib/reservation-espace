import { FirebaseError } from "firebase/app";
import {
  isErrorReason,
  type AdjustCreditsInput,
  type AnonymizeUserInput,
  type BootstrapProfileInput,
  type BootstrapProfileResult,
  type CancelBookingInput,
  type CalendarFeedResult,
  type CalendarRangeInput,
  type CancelSubscriptionInput,
  type CheckInInput,
  type CheckInResult,
  type FloorPlan,
  type FloorPlanInput,
  type SetSpaceLayoutsInput,
  type ConfirmPaymentInput,
  type ConfirmPaymentResult,
  type CreateEventInput,
  type CreatePaymentInput,
  type CreatePaymentResult,
  type ChatMessageInput,
  type ChatWithAssistantResult,
  type CreateBookingInput,
  type CreatePlanInput,
  type CreateVisitInput,
  type CreateIncidentInput,
  type CreateEquipmentRequestInput,
  type CreditTransactionSummary,
  type DeclareAbsenceInput,
  type DeleteEventInput,
  type DeletePlanInput,
  type EventSummary,
  type GeneratePlanDescriptionInput,
  type GeneratePlanDescriptionResult,
  type ListVisitsForDayInput,
  type MessageKey,
  type MyWallet,
  type PlanSummary,
  type RemoveAbsenceInput,
  type SearchSpacesInput,
  type SetUserRoleInput,
  type SpaceSlotStatus,
  type SubscriptionSummary,
  type TeamBookingsInput,
  type TeamBookingsResult,
  type UpdateBookingInput,
  type UpdateEventInput,
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
  type OccupancyHeatmap,
  type OccupancyInput,
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
import { ApiError, photoUrl, post, postStream, uploadPhoto } from "./transport";

export { photoUrl, uploadPhoto };

/** Typed wrappers over the server endpoints (`POST /api/<name>`). */

function callable<I, O>(name: string) {
  return (input: I): Promise<O> => post<O>(name, input);
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
  checkInToSpace: callable<CheckInInput, CheckInResult>("checkInToSpace"),
  getFloorPlan: callable<FloorPlanInput, FloorPlan>("getFloorPlan"),
  declareAbsence: callable<DeclareAbsenceInput, { absenceId: string; cancelled: number }>("declareAbsence"),
  removeAbsence: callable<RemoveAbsenceInput, { removed: boolean }>("removeAbsence"),
  teamBookings: callable<TeamBookingsInput, TeamBookingsResult>("teamBookings"),
  // Credits
  createPayment: callable<CreatePaymentInput, CreatePaymentResult>("createPayment"),
  confirmPayment: callable<ConfirmPaymentInput, ConfirmPaymentResult>("confirmPayment"),
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
    { displayName?: string; notificationPrefs?: NotificationPrefs; locale?: "fr" | "en"; showOnFloorPlan?: boolean },
    { updated: boolean }
  >("updateMyProfile"),
  registerDevice: callable<
    { endpoint: string; keys: { p256dh: string; auth: string }; platform: string; userAgent: string },
    { registered: boolean }
  >("registerDevice"),
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
  // Calendar
  listMyBookingsInRange: callable<CalendarRangeInput, BookingSummary[]>("listMyBookingsInRange"),
  listMyEvents: callable<CalendarRangeInput, EventSummary[]>("listMyEvents"),
  createEvent: callable<CreateEventInput, { eventId: string }>("createEvent"),
  updateEvent: callable<UpdateEventInput, { updated: boolean }>("updateEvent"),
  deleteEvent: callable<DeleteEventInput, { deleted: boolean }>("deleteEvent"),
  getMyCalendarFeed: callable<Empty, CalendarFeedResult>("getMyCalendarFeed"),
  resetMyCalendarFeed: callable<Empty, CalendarFeedResult>("resetMyCalendarFeed"),
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
  getOccupancyHeatmap: callable<OccupancyInput, OccupancyHeatmap>("getOccupancyHeatmap"),
  setSpaceLayouts: callable<SetSpaceLayoutsInput, { updated: number }>("setSpaceLayouts"),
  // AI assistant
  generatePlanDescription: callable<GeneratePlanDescriptionInput, GeneratePlanDescriptionResult>("generatePlanDescription"),
  /** Streaming chat: the text arrives chunk by chunk through `.stream`, then `.data` resolves to the full reply. */
  chatWithAssistant: (messages: ChatMessageInput[]) => postStream<ChatWithAssistantResult>("chatWithAssistant", { messages }),
};

const CODE_KEYS: Record<string, MessageKey> = {
  unauthenticated: "errors.authRequired",
  "permission-denied": "errors.forbidden",
  "resource-exhausted": "errors.rateLimited",
  unavailable: "errors.unavailable",
  internal: "errors.internal",
  "auth/popup-closed-by-user": "errors.popupClosed",
  "auth/network-request-failed": "errors.network",
  "auth/invalid-credential": "errors.invalidCredential",
  "auth/wrong-password": "errors.invalidCredential",
  "auth/user-not-found": "errors.invalidCredential",
  "auth/email-already-in-use": "errors.emailInUse",
  "auth/weak-password": "errors.weakPassword",
  "auth/invalid-email": "errors.invalidEmail",
  "auth/too-many-requests": "errors.tooManyAttempts",
  "auth/user-disabled": "errors.accountDisabled",
};

/**
 * Translation key for any error. Server errors carry a `reason` (see server/src/lib/errors.ts);
 * Firebase sign-in errors map by code, and a request that never reached the server is a network error.
 */
export function errorKey(err: unknown): MessageKey {
  if (err instanceof ApiError) {
    if (isErrorReason(err.reason)) return `errors.${err.reason}`;
    return CODE_KEYS[err.code] ?? "errors.generic";
  }
  if (err instanceof TypeError) return "errors.network";
  if (err instanceof FirebaseError) {
    return CODE_KEYS[err.code] ?? "errors.generic";
  }
  return "errors.generic";
}
