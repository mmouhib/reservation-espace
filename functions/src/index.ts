import { setGlobalOptions } from "firebase-functions/v2";
import { REGION } from "./lib/config";

setGlobalOptions({ region: REGION, maxInstances: 10 });

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
export { declareAbsence, removeAbsence } from "./bookings/absences";
export { teamBookings } from "./bookings/teamBookings";

// Notifications
export { sendBookingReminders, sendWeeklyDigests } from "./bookings/reminders";

// Credits and subscriptions
export { adjustCredits, cancelSubscription, purchasePlan, renewSubscriptions } from "./credits/credits";

// Incidents and equipment
export { onEquipmentRequestUpdated, onIncidentCreated, onIncidentUpdated } from "./support/triggers";
