// Every endpoint and scheduled job of the server. Each export is registered by its `name` (see index.ts).
// Users
export { bootstrapProfile } from "./auth/bootstrapProfile";
export { setUserRole } from "./auth/setUserRole";
export { directorySyncScheduled, runDirectorySyncNow } from "./auth/directorySync";
export { updateUserOrg } from "./users/updateUserOrg";
export { anonymizeUser, deleteMyAccount, exportMyData } from "./users/account";

// Bookings
export { searchSpaces } from "./bookings/searchSpaces";
export { createBooking } from "./bookings/createBooking";
export { updateBooking } from "./bookings/updateBooking";
export { cancelBooking } from "./bookings/cancelBooking";
export { checkInToSpace } from "./bookings/checkIn";
export { declareAbsence, removeAbsence } from "./bookings/absences";
export { teamBookings } from "./bookings/teamBookings";

// Notifications
export { sendBookingReminders, sendWeeklyDigests } from "./bookings/reminders";

// Credits and subscriptions
export { adjustCredits, cancelSubscription, renewSubscriptions } from "./credits/credits";
export { confirmPayment, createPayment } from "./credits/payments";
export { createPlan, deletePlan, listAllPlans, listPlans, updatePlan } from "./credits/plans";
export { getMyCreditHistory, getMySubscription, getMyWallet } from "./credits/queries";

// Incidents and equipment
export { createIncident, listAllIncidents, listMyIncidents, updateIncidentStatus } from "./support/incidents";
export {
  createEquipmentRequest,
  listAllEquipmentRequests,
  listMyEquipmentRequests,
  updateEquipmentRequestStatus,
} from "./support/equipment";

// Visitors
export { cancelVisit, checkInVisit, checkOutVisit, createVisit, getMyVisits, listVisitsForDay } from "./visitors/visits";

// Read and admin API used by the web app
export { getMyProfile, updateMyProfile, registerDevice } from "./api/profile";
export {
  listSites,
  listSpaces,
  listDepartments,
  listMyTeams,
  listTeams,
  createSite,
  updateSite,
  deleteSite,
  createSpace,
  updateSpace,
  deleteSpace,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createTeam,
  updateTeam,
  deleteTeam,
} from "./api/reference";
export { listMyBookings, listMyBookingsInRange, listMyUpcomingBookings, listBookingsInRange } from "./api/bookings-read";

// Calendar
export { createEvent, deleteEvent, listMyEvents, updateEvent } from "./calendar/events";
export { getMyCalendarFeed, resetMyCalendarFeed } from "./calendar/feed";
export { listMyAbsences } from "./api/absences";
export { listMyNotifications, markNotificationRead, markAllNotificationsRead } from "./api/notifications";
export { listUsers } from "./api/admin-users";
export { listAuditLogs } from "./api/audit";
export { getBookingTotals, getBookingsPerDay, getHoursPerCategory, getTopSpaces } from "./api/stats";
export { getOccupancyHeatmap } from "./api/occupancy";

// AI assistant
export { chatWithAssistant } from "./ai/chatWithAssistant";
export { generatePlanDescription } from "./ai/generatePlanDescription";
