"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  adjustCredits: () => adjustCredits,
  anonymizeUser: () => anonymizeUser,
  bootstrapProfile: () => bootstrapProfile,
  cancelBooking: () => cancelBooking,
  cancelSubscription: () => cancelSubscription,
  cancelVisit: () => cancelVisit,
  chatWithAssistant: () => chatWithAssistant,
  checkInVisit: () => checkInVisit,
  checkOutVisit: () => checkOutVisit,
  createBooking: () => createBooking,
  createDepartment: () => createDepartment,
  createEquipmentRequest: () => createEquipmentRequest,
  createIncident: () => createIncident,
  createPlan: () => createPlan2,
  createSite: () => createSite,
  createSpace: () => createSpace,
  createTeam: () => createTeam,
  createVisit: () => createVisit,
  declareAbsence: () => declareAbsence,
  deleteDepartment: () => deleteDepartment,
  deleteMyAccount: () => deleteMyAccount,
  deletePlan: () => deletePlan2,
  deleteSite: () => deleteSite,
  deleteSpace: () => deleteSpace,
  deleteTeam: () => deleteTeam,
  directorySyncScheduled: () => directorySyncScheduled,
  exportMyData: () => exportMyData,
  generatePlanDescription: () => generatePlanDescription,
  getBookingTotals: () => getBookingTotals,
  getBookingsPerDay: () => getBookingsPerDay,
  getHoursPerCategory: () => getHoursPerCategory,
  getMyCreditHistory: () => getMyCreditHistory,
  getMyProfile: () => getMyProfile,
  getMySubscription: () => getMySubscription,
  getMyVisits: () => getMyVisits,
  getMyWallet: () => getMyWallet,
  getTopSpaces: () => getTopSpaces,
  listAllEquipmentRequests: () => listAllEquipmentRequests,
  listAllIncidents: () => listAllIncidents,
  listAllPlans: () => listAllPlans,
  listAuditLogs: () => listAuditLogs,
  listBookingsInRange: () => listBookingsInRange,
  listDepartments: () => listDepartments,
  listMyAbsences: () => listMyAbsences,
  listMyBookings: () => listMyBookings,
  listMyEquipmentRequests: () => listMyEquipmentRequests,
  listMyIncidents: () => listMyIncidents,
  listMyNotifications: () => listMyNotifications,
  listMyTeams: () => listMyTeams,
  listMyUpcomingBookings: () => listMyUpcomingBookings,
  listPlans: () => listPlans2,
  listSites: () => listSites,
  listSpaces: () => listSpaces,
  listTeams: () => listTeams,
  listUsers: () => listUsers,
  listVisitsForDay: () => listVisitsForDay,
  markAllNotificationsRead: () => markAllNotificationsRead,
  markNotificationRead: () => markNotificationRead,
  purchasePlan: () => purchasePlan,
  registerDevice: () => registerDevice,
  removeAbsence: () => removeAbsence,
  renewSubscriptions: () => renewSubscriptions,
  runDirectorySyncNow: () => runDirectorySyncNow,
  searchSpaces: () => searchSpaces,
  sendBookingReminders: () => sendBookingReminders,
  sendWeeklyDigests: () => sendWeeklyDigests,
  setUserRole: () => setUserRole,
  teamBookings: () => teamBookings,
  updateBooking: () => updateBooking,
  updateDepartment: () => updateDepartment,
  updateEquipmentRequestStatus: () => updateEquipmentRequestStatus,
  updateIncidentStatus: () => updateIncidentStatus,
  updateMyProfile: () => updateMyProfile,
  updatePlan: () => updatePlan2,
  updateSite: () => updateSite,
  updateSpace: () => updateSpace,
  updateTeam: () => updateTeam,
  updateUserOrg: () => updateUserOrg
});
module.exports = __toCommonJS(index_exports);

// src/lib/globalOptions.ts
var import_v2 = require("firebase-functions/v2");

// src/lib/config.ts
var import_params = require("firebase-functions/params");
var REGION = "europe-west1";
var MONGODB_URI = (0, import_params.defineSecret)("MONGODB_URI");
var BOOTSTRAP_ADMIN_EMAILS = (0, import_params.defineString)("BOOTSTRAP_ADMIN_EMAILS", { default: "" });
var ALLOWED_EMAIL_DOMAINS = (0, import_params.defineString)("ALLOWED_EMAIL_DOMAINS", { default: "" });
var WELCOME_CREDITS = (0, import_params.defineInt)("WELCOME_CREDITS", { default: 0 });
var ENFORCE_APP_CHECK = (0, import_params.defineBoolean)("ENFORCE_APP_CHECK", { default: false });
var GOOGLE_GENERATIVE_AI_API_KEY = (0, import_params.defineSecret)("GOOGLE_GENERATIVE_AI_API_KEY");
var RESEND_API_KEY = (0, import_params.defineSecret)("RESEND_API_KEY");
var RESEND_FROM = (0, import_params.defineString)("RESEND_FROM", { default: "R\xE9servation <no-reply@example.com>" });
function csv(value) {
  return value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}

// src/lib/globalOptions.ts
(0, import_v2.setGlobalOptions)({ region: REGION, maxInstances: 10, secrets: [MONGODB_URI, RESEND_API_KEY] });

// ../packages/shared/src/time.ts
var DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
var WEEKDAYS_FROM_SUNDAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
function isDateString(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  return (/* @__PURE__ */ new Date(`${value}T00:00:00Z`)).toISOString().startsWith(value);
}
function addDays(date, days) {
  const d = /* @__PURE__ */ new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function daysBetween(from, to) {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 864e5);
}
function weekdayOf(date) {
  return WEEKDAYS_FROM_SUNDAY[(/* @__PURE__ */ new Date(`${date}T00:00:00Z`)).getUTCDay()];
}
function formatMinutes(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}
function zonedParts(instant, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(instant);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}
function nowIn(timeZone, now = /* @__PURE__ */ new Date()) {
  const p = zonedParts(now, timeZone);
  const date = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return { date, minute: p.hour * 60 + p.minute };
}
function offsetMs(instant, timeZone) {
  const p = zonedParts(instant, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallAsUtc - Math.floor(instant.getTime() / 1e3) * 1e3;
}
function zonedTimeToUtc(date, minute, timeZone) {
  const [year, month, day] = date.split("-").map(Number);
  const wall = Date.UTC(year, month - 1, day, 0, minute);
  const first = wall - offsetMs(new Date(wall), timeZone);
  return new Date(wall - offsetMs(new Date(first), timeZone));
}

// ../packages/shared/src/booking.ts
var SLOT_MINUTES = 30;
var MIN_DURATION = 30;
var MAX_DURATION = 8 * 60;
var MAX_DAYS_AHEAD = 60;
var SHARED_CATEGORIES = ["open_space", "coworking"];
function isSharedCategory(category) {
  return SHARED_CATEGORIES.includes(category);
}
function overlaps(a, b) {
  return a.from < b.to && b.from < a.to;
}
function bookingCost(creditsPerHour, slot) {
  return Math.ceil(creditsPerHour * (slot.to - slot.from) / 60);
}
function fitsOpeningHours(hours, date, slot) {
  return hours[weekdayOf(date)].some((range) => range.from <= slot.from && slot.to <= range.to);
}
function isClosedOn(closures, date) {
  return closures.some((c) => c.from <= date && date <= c.to);
}
function hasCapacity(existing, request, space) {
  if (request.attendees > space.capacity) return false;
  const clashing = existing.filter((b) => overlaps(b, request));
  if (!isSharedCategory(space.category)) return clashing.length === 0;
  const moments = [request.from, ...clashing.map((b) => b.from).filter((t) => t > request.from)];
  return moments.every((t) => {
    const inUse = clashing.filter((b) => b.from <= t && t < b.to).reduce((sum, b) => sum + b.attendees, 0);
    return inUse + request.attendees <= space.capacity;
  });
}
function findBookingProblem({ space, date, slot, attendees: attendees2, existing, now }) {
  const duration = slot.to - slot.from;
  const alignedToSlots = slot.from % SLOT_MINUTES === 0 && slot.to % SLOT_MINUTES === 0;
  if (!alignedToSlots || duration < MIN_DURATION || duration > MAX_DURATION || slot.from < 0 || slot.to > 24 * 60) {
    return "invalidSlot";
  }
  if (date < now.date || date === now.date && slot.to <= now.minute) return "pastSlot";
  if (daysBetween(now.date, date) > MAX_DAYS_AHEAD) return "tooFarAhead";
  if (space.status !== "active" || isClosedOn(space.closures, date)) return "spaceClosed";
  if (!fitsOpeningHours(space.openingHours, date, slot)) return "outsideHours";
  if (attendees2 > space.capacity) return "tooManyAttendees";
  if (!hasCapacity(existing, { ...slot, attendees: attendees2 }, space)) return "slotTaken";
  return null;
}
function isWithinRanges(date, ranges) {
  return ranges.some((r) => r.from <= date && date <= r.to);
}

// ../packages/shared/src/collections.ts
var COL = {
  users: "users",
  devices: "devices",
  // users/{uid}/devices
  notifications: "notifications",
  // users/{uid}/notifications
  departments: "departments",
  teams: "teams",
  sites: "sites",
  spaces: "spaces",
  auditLogs: "auditLogs",
  bookings: "bookings",
  absences: "absences",
  wallets: "wallets",
  creditTransactions: "creditTransactions",
  plans: "plans",
  subscriptions: "subscriptions",
  incidents: "incidents",
  equipmentRequests: "equipmentRequests",
  rateLimits: "_rateLimits",
  locks: "_locks",
  // one document per booking day of a space or a user, see functions/src/lib/locks.ts
  visits: "visits"
};

// ../packages/shared/src/entities.ts
var import_zod = require("zod");

// ../packages/shared/src/models.ts
var WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
var SPACE_CATEGORIES = ["desk", "open_space", "meeting_room", "coworking", "phone_booth"];
var EQUIPMENT = ["screen", "dock", "whiteboard", "videoconference", "projector"];
var SPACE_TAGS = ["quiet_zone", "window", "standing_desk", "accessible"];
var NOTIFICATION_TYPES = [
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
  "visitorArrived"
];
var PLAN_KINDS = ["pack", "subscription"];
var CREDIT_TRANSACTION_TYPES = ["purchase", "subscription", "booking", "refund", "adjustment"];
var INCIDENT_STATUSES = ["open", "in_progress", "resolved"];
var REQUESTABLE_ITEMS = ["screen", "keyboard", "mouse", "headset", "webcam", "adapter", "chair"];
var EQUIPMENT_REQUEST_STATUSES = ["pending", "approved", "rejected"];
var VISIT_STATUSES = ["expected", "checkedIn", "checkedOut", "cancelled"];

// ../packages/shared/src/roles.ts
var ROLES = ["user", "manager", "admin"];
var RANK = { user: 0, manager: 1, admin: 2 };
function isRole(value) {
  return typeof value === "string" && ROLES.includes(value);
}
function hasRole(actual, required) {
  return RANK[actual] >= RANK[required];
}

// ../packages/shared/src/i18n/en.json
var en_default = {
  app: {
    name: "Space Booking",
    shortName: "Booking",
    description: "Book a desk, a meeting room or a coworking space in seconds."
  },
  common: {
    loading: "Loading\u2026",
    later: "Later",
    save: "Save",
    saving: "Saving\u2026",
    retry: "Try again",
    signOut: "Sign out",
    skipToContent: "Skip to main content",
    comingSoon: "This feature is coming soon <muted>(phase {phase})</muted>.",
    availableInPhase: "Coming soon (phase {phase})",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    edit: "Edit",
    delete: "Delete",
    add: "Add",
    create: "Create",
    search: "Search",
    all: "All",
    none: "None",
    name: "Name",
    description: "Description",
    status: "Status",
    date: "Date",
    from: "From",
    to: "To",
    optional: "(optional)",
    saved: "Saved.",
    deleted: "Deleted.",
    free: "Free",
    download: "Download",
    needsConnection: "This action needs a connection.",
    credits_one: "{count} credit",
    credits_other: "{count} credits",
    people_one: "{count} person",
    people_other: "{count} people"
  },
  language: {
    label: "Language",
    fr: "Fran\xE7ais",
    en: "English"
  },
  roles: {
    user: "Employee",
    manager: "Manager",
    admin: "Administrator"
  },
  userStatus: {
    active: "Active",
    disabled: "Disabled",
    anonymized: "Anonymized"
  },
  spaceCategories: {
    desk: "Desk",
    open_space: "Open space",
    meeting_room: "Meeting room",
    coworking: "Coworking space",
    phone_booth: "Phone booth"
  },
  nav: {
    label: "Main navigation",
    home: "Home",
    reserve: "Book",
    myBookings: "My bookings",
    profile: "Profile",
    admin: "Administration",
    team: "My team",
    credits: "Credits",
    support: "Support",
    notifications: "Notifications",
    myBookingsShort: "Bookings",
    visitors: "Visitors"
  },
  home: {
    greeting: "Hello",
    greetingName: "Hello {name}",
    subtitle: "What would you like to do today?",
    shortcuts: {
      reserve: "Find an available desk, room or coworking space.",
      myBookings: "View, change or cancel your bookings, even offline.",
      profile: "Your details and notification preferences.",
      admin: "Spaces, users, moderation and statistics.",
      team: "The bookings of your team members.",
      credits: "Your balance, plans and history.",
      support: "Report a problem or request equipment.",
      visitors: "Invite an external guest and track your invitations."
    },
    upcoming: "Upcoming bookings",
    noUpcoming: "No upcoming bookings.",
    nextBooking: "Next booking",
    noNextBooking: "Nothing planned",
    balance: "Credit balance",
    unread_one: "{count} unread notification",
    unread_other: "{count} unread notifications",
    allRead: "All caught up",
    seeAll: "See all"
  },
  reserve: {
    title: "Book a space",
    description: "Search by site, capacity, equipment and date.",
    site: "Site",
    date: "Date",
    start: "Start",
    end: "End",
    category: "Space type",
    anyCategory: "All types",
    minCapacity: "Minimum capacity",
    equipment: "Equipment",
    attendees: "Number of people",
    search: "Check availability",
    searching: "Searching\u2026",
    resultsCount_one: "{count} space available for this slot",
    resultsCount_other: "{count} spaces available for this slot",
    noResults: "No space matches your search.",
    noSites: "No site has been set up yet.",
    firstSearch: "Pick a time slot to see the available spaces.",
    available: "Available",
    unavailable: "Unavailable",
    showUnavailable: "Also show unavailable spaces",
    book: "Book",
    floor: "Floor {floor}",
    capacity_one: "{count} seat",
    capacity_other: "{count} seats",
    perHour: "{count} cr./h",
    cost: "Cost",
    confirmTitle: "Confirm the booking",
    balance: "Your balance: {balance} credits",
    booked: "Booking confirmed.",
    offline: "Checking availability needs a connection.",
    busy: "Already booked: {slots}"
  },
  myBookings: {
    title: "My bookings",
    description: "Your upcoming bookings and history.",
    upcoming: "Upcoming",
    past: "Past",
    emptyUpcoming: "No upcoming bookings.",
    emptyPast: "No past bookings.",
    cancelledBadge: "Cancelled",
    change: "Change",
    cancel: "Cancel",
    changeTitle: "Change the booking",
    cancelTitle: "Cancel the booking",
    cancelConfirm: "The credits of this booking will be refunded.",
    cancelled: "Booking cancelled.",
    updated: "Booking changed.",
    absences: "Absences",
    absencesHint: "During an absence, your bookings are cancelled and you can't book.",
    declareAbsence: "Declare an absence",
    absenceFrom: "First day",
    absenceTo: "Last day",
    absenceNote: "Note",
    absenceDeclared_one: "Absence saved. {count} booking cancelled.",
    absenceDeclared_other: "Absence saved. {count} bookings cancelled.",
    noAbsences: "No absences declared.",
    absenceRemoved: "Absence removed."
  },
  profile: {
    title: "My profile",
    description: "Your details and preferences.",
    identity: "Identity",
    email: "Email",
    role: "Role",
    department: "Department",
    installApp: "Install the app",
    preferences: "Preferences",
    displayName: "Display name",
    notifications: "Notifications",
    prefs: {
      email: {
        label: "Emails",
        hint: "Confirmations, cancellations and reminders."
      },
      push: {
        label: "Push notifications",
        hint: "Reminders 24 hours ahead and alerts about your spaces."
      },
      weeklyDigest: {
        label: "Weekly summary",
        hint: "Every Monday, your bookings for the week."
      }
    },
    saved: "Preferences saved.",
    savedOffline: "Saved on this device, will sync when you're back online.",
    privacy: "Personal data",
    privacyText: "Export your data or delete your account.",
    team: "Teams",
    noTeam: "None",
    push: {
      enable: "Enable on this device",
      enabled: "Push notifications are on for this device.",
      denied: "Permission was denied by the browser.",
      unavailable: "Push notifications are not available here."
    },
    export: "Export my data",
    exportHint: "Downloads a JSON file with your profile, bookings and credits.",
    deleteAccount: "Delete my account",
    deleteTitle: "Delete your account?",
    deleteConfirm: "This can't be undone: your upcoming bookings will be cancelled and your personal data erased."
  },
  admin: {
    title: "Administration",
    forbidden: "Administrators only.",
    sections: {
      users: {
        title: "Users",
        text: "Roles, teams, disabled accounts, directory sync."
      },
      spaces: {
        title: "Sites and spaces",
        text: "Sites, floors, spaces, prices, opening hours and closures."
      },
      bookings: {
        title: "Bookings",
        text: "Every booking: force release, move."
      },
      credits: {
        title: "Credits and subscriptions",
        text: "Plans, prices and balance adjustments."
      },
      organization: {
        title: "Organization",
        text: "Departments and teams."
      },
      support: {
        title: "Reports and equipment",
        text: "Incidents and equipment requests."
      },
      visitors: {
        title: "Visitors",
        text: "Reception: who's expected, check guests in or out."
      },
      statistics: {
        title: "Statistics",
        text: "Occupancy, usage and exports."
      },
      audit: {
        title: "Audit log",
        text: "Who did what, and when."
      }
    },
    users: {
      title: "Users",
      description: "Manage employee roles and accounts.",
      filterByRole: "Filter by role",
      allRoles: "All",
      syncDirectory: "Sync directory",
      tableCaption: "User list",
      name: "Name",
      email: "Email",
      status: "Status",
      role: "Role",
      roleOf: "Role of {name}",
      empty: "No users.",
      loadMore: "Load more",
      roleChanged: "{name}'s role is now {role}.",
      syncDone_one: "Sync complete: {count} account disabled.",
      syncDone_other: "Sync complete: {count} accounts disabled.",
      department: "Department",
      teams: "Teams",
      editOrg: "Edit department and teams",
      orgUpdated: "Organization updated.",
      noDepartment: "No department",
      anonymize: "Delete account",
      anonymizeTitle: "Delete this account?",
      anonymizeConfirm: "{name}'s upcoming bookings will be cancelled and their personal data erased. This can't be undone.",
      anonymized: "Account deleted.",
      actions: "Actions"
    },
    organization: {
      title: "Organization",
      description: "The departments and teams of the company.",
      departments: "Departments",
      teams: "Teams",
      newDepartment: "New department",
      editDepartment: "Edit department",
      newTeam: "New team",
      editTeam: "Edit team",
      departmentName: "Department name",
      teamName: "Team name",
      department: "Department",
      managers: "Managers",
      managersHint: "Managers see the team's bookings. Only managers and administrators are listed.",
      members_one: "{count} member",
      members_other: "{count} members",
      noDepartments: "No departments.",
      noTeams: "No teams.",
      confirmDelete: 'Delete "{name}"?'
    },
    spaces: {
      title: "Sites and spaces",
      description: "The sites, their opening hours and the bookable spaces.",
      sites: "Sites",
      spaces: "Spaces",
      newSite: "New site",
      editSite: "Edit site",
      newSpace: "New space",
      editSpace: "Edit space",
      siteName: "Site name",
      address: "Address",
      timeZone: "Time zone",
      floors: "Floors (one per line)",
      openingHours: "Opening hours",
      closedDay: "Closed",
      site: "Site",
      floor: "Floor",
      location: "Location",
      category: "Space type",
      capacity: "Capacity",
      creditsPerHour: "Credits per hour",
      equipment: "Equipment",
      tags: "Features",
      useSiteHours: "Use the site's opening hours",
      closures: "Exceptional closures",
      addClosure: "Add a closure",
      closureReason: "Reason",
      noSites: "No sites.",
      noSpaces: "No spaces.",
      allSites: "All sites",
      confirmDelete: 'Delete "{name}"? Existing bookings are kept.',
      siteInUse: "This site still has spaces: delete them first.",
      statusActive: "Active",
      statusClosed: "Closed"
    },
    bookings: {
      title: "Bookings",
      description: "Every booking of the organization.",
      user: "User",
      space: "Space",
      slot: "Time slot",
      statusConfirmed: "Confirmed",
      statusCancelled: "Cancelled",
      move: "Move",
      moveTitle: "Move the booking",
      release: "Release",
      releaseTitle: "Release the space",
      reason: "Reason (shown to the user)",
      moved: "Booking moved.",
      released: "Booking cancelled.",
      empty: "No bookings in this period."
    },
    credits: {
      title: "Credits and subscriptions",
      description: "The plans on offer and the balances of the users.",
      plans: "Plans",
      newPlan: "New plan",
      editPlan: "Edit plan",
      planName: "Name",
      generateDescription: "\u2728 Generate with AI",
      generatingDescription: "Generating\u2026",
      generateDescriptionError: "Please enter the plan name first.",
      planKind: "Type",
      planCredits: "Credits",
      planPrice: "Price (\u20AC)",
      planActive: "Offered to users",
      hidden: "Hidden",
      noPlans: "No plans.",
      adjust: "Adjust a balance",
      adjustUser: "User",
      adjustAmount: "Amount (negative to remove)",
      adjustLabel: "Reason",
      adjusted: "Balance adjusted.",
      confirmDelete: 'Delete the plan "{name}"?'
    },
    support: {
      title: "Reports and equipment",
      description: "Handle incidents and equipment requests.",
      incidents: "Incident reports",
      requests: "Equipment requests",
      from: "From {name}",
      note: "Answer to the user",
      updated: "Updated.",
      noIncidents: "No reports.",
      noRequests: "No requests."
    },
    visitors: {
      title: "Visitors",
      description: "The guests expected on the selected day.",
      host: "Invited by {name}",
      checkIn: "Check in",
      checkOut: "Check out",
      noVisits: "No guests expected that day."
    },
    statistics: {
      title: "Statistics",
      description: "Occupancy and usage of the spaces.",
      bookings: "Bookings",
      cancelled: "Cancelled",
      hours: "Hours booked",
      creditsSpent: "Credits spent",
      activeUsers: "Active users",
      byDay: "Bookings per day",
      byCategory: "Hours by space type",
      topSpaces: "Most booked spaces",
      export: "Export as CSV",
      noData: "No bookings in this period.",
      hoursShort: "{count} h"
    },
    audit: {
      title: "Audit log",
      description: "The history of important actions.",
      action: "Action",
      allActions: "All actions",
      when: "Date",
      actor: "Author",
      target: "Target",
      system: "System",
      empty: "No entries.",
      actions: {
        booking: {
          created: "Booking created",
          updated: "Booking changed",
          cancelled: "Booking cancelled"
        },
        absence: {
          declared: "Absence declared"
        },
        credits: {
          purchased: "Credits purchased",
          adjusted: "Credits adjusted"
        },
        subscription: {
          cancelled: "Subscription cancelled"
        },
        user: {
          created: "Account created",
          role_changed: "Role changed",
          disabled: "Account disabled",
          org_changed: "Organization changed",
          anonymized: "Account deleted"
        }
      }
    }
  },
  login: {
    title: "Sign in",
    withGoogle: "Sign in with Google",
    withSso: "Sign in with company SSO",
    demoAccounts: "Demo accounts (emulators)",
    feature1: "Desks, meeting rooms and coworking spaces",
    feature2: "Installable, and works even offline",
    feature3: "Real-time reminders and notifications",
    welcome: "Welcome"
  },
  pwa: {
    updateAvailable: "A new version is available.",
    reload: "Reload",
    offlineBanner: "You're offline. The data shown comes from the cache; booking is unavailable.",
    install: {
      title: "Install the app",
      text: "Get to your bookings in one tap, even offline, and receive reminders.",
      install: "Install",
      howTo: "How?",
      iosTitle: "Install on iPhone or iPad",
      iosStep1: "Tap Safari's <strong>Share</strong> button (a square with an arrow pointing up).",
      iosStep2: "Choose <strong>Add to Home Screen</strong>.",
      iosStep3: "Tap <strong>Add</strong>.",
      iosPushNote: "On iOS, push notifications are only available once the app is installed (iOS 16.4 or later).",
      gotIt: "Got it"
    }
  },
  offline: {
    title: "Offline",
    heading: "You're offline",
    text: "This page isn't available without a connection. Bookings you've already viewed are still accessible.",
    notCached: "This data hasn't been loaded with a connection yet: it will be available offline after a first visit.",
    staleSince: "Offline data from {date}."
  },
  notFound: {
    title: "Page not found",
    text: "The page you requested doesn't exist or has been moved.",
    back: "Back to home"
  },
  errors: {
    generic: "Something went wrong.",
    authRequired: "Your session has expired. Please sign in again.",
    forbidden: "You don't have permission to do this.",
    invalidInput: "Invalid data.",
    rateLimited: "Too many requests, please try again in a moment.",
    unavailable: "Service unavailable. Check your connection.",
    internal: "An internal error occurred.",
    popupClosed: "The sign-in window was closed.",
    network: "Network connection failed.",
    invalidCredential: "Invalid credentials.",
    accountDisabled: "This account has been disabled.",
    noEmail: "No email address is linked to this account.",
    notInCompany: "This account doesn't belong to the company.",
    cannotDemoteSelf: "You can't remove your own administrator role.",
    userNotFound: "User not found.",
    invalidSlot: "This time slot is not valid (30 minutes minimum, 8 hours maximum, in 30-minute steps).",
    spaceClosed: "This space is closed on that date.",
    outsideHours: "This slot is outside opening hours.",
    pastSlot: "This slot is in the past.",
    tooFarAhead: "You can't book more than 60 days ahead.",
    slotTaken: "This space is no longer available for that slot.",
    tooManyAttendees: "The number of people exceeds the space's capacity.",
    alreadyBooked: "You already have a booking at that time.",
    absent: "You are marked as absent on that date.",
    spaceNotFound: "Space not found.",
    bookingNotFound: "Booking not found.",
    bookingNotCancellable: "This booking can no longer be changed or cancelled.",
    invalidDates: "The dates are not valid.",
    notEnoughCredits: "Not enough credits.",
    planNotFound: "Plan not found.",
    alreadySubscribed: "You already have an active subscription.",
    subscriptionNotFound: "Subscription not found.",
    assistantUnavailable: "The AI assistant is temporarily unavailable.",
    visitNotFound: "Visit not found.",
    invalidVisitStatus: "This visit can no longer be changed."
  },
  incidentStatus: {
    open: "Open",
    in_progress: "In progress",
    resolved: "Resolved"
  },
  equipmentStatus: {
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected"
  },
  visitStatus: {
    expected: "Expected",
    checkedIn: "Checked in",
    checkedOut: "Checked out",
    cancelled: "Cancelled"
  },
  items: {
    screen: "Screen",
    keyboard: "Keyboard",
    mouse: "Mouse",
    headset: "Headset",
    webcam: "Webcam",
    adapter: "Adapter",
    chair: "Office chair"
  },
  notify: {
    bookingConfirmed: {
      title: "Booking confirmed",
      body: "{space} \xB7 {date} from {from} to {to}"
    },
    bookingCancelled: {
      title: "Booking cancelled",
      body: "{space} \xB7 {date} from {from} to {to}"
    },
    bookingCancelledByAdmin: {
      title: "Booking cancelled by an administrator",
      body: "{space} \xB7 {date} from {from} to {to}. Reason: {reason}"
    },
    bookingMoved: {
      title: "Booking changed",
      body: "{space} \xB7 {date} from {from} to {to}"
    },
    bookingReminder: {
      title: "Booking reminder",
      body: "{space} \xB7 {date} from {from} to {to}"
    },
    weeklyDigest: {
      title: "Your week",
      body_one: "You have {count} booking this week.",
      body_other: "You have {count} bookings this week."
    },
    creditsAdded: {
      title: "Credits added",
      body_one: "{count} credit was added to your balance ({label}).",
      body_other: "{count} credits were added to your balance ({label})."
    },
    subscriptionRenewed: {
      title: "Subscription renewed",
      body_one: "{count} credit added ({label}).",
      body_other: "{count} credits added ({label})."
    },
    incidentReceived: {
      title: "New incident report",
      body: "{title}, by {name}"
    },
    incidentUpdated: {
      title: "Incident updated",
      body: '"{title}" is now: {status}'
    },
    equipmentUpdated: {
      title: "Equipment request updated",
      body: "Your request ({item}) is now: {status}"
    },
    visitorArrived: {
      title: "Your guest has arrived",
      body: "{guest} has arrived at reception."
    }
  },
  weekdays: {
    mon: "Monday",
    tue: "Tuesday",
    wed: "Wednesday",
    thu: "Thursday",
    fri: "Friday",
    sat: "Saturday",
    sun: "Sunday"
  },
  equipment: {
    screen: "Screen",
    dock: "Docking station",
    whiteboard: "Whiteboard",
    videoconference: "Video conferencing",
    projector: "Projector"
  },
  tags: {
    quiet_zone: "Quiet zone",
    window: "Window seat",
    standing_desk: "Standing desk",
    accessible: "Accessible"
  },
  team: {
    title: "My team",
    description: "The bookings of the members of your teams.",
    noTeam: "You don't manage any team yet.",
    member: "Member",
    bookings: "Bookings",
    noBooking: "No booking that day",
    team: "Team"
  },
  credits: {
    title: "Credits",
    description: "Your balance, plans and transaction history.",
    balance: "Current balance",
    plans: "Plans",
    noPlans: "No plan is available yet.",
    buy: "Buy",
    subscribe: "Subscribe",
    kindPack: "Credit pack",
    kindSubscription: "Monthly subscription",
    perMonth: "per month",
    subscription: "Your subscription",
    renewsOn: "Next renewal: {date}",
    cancelSubscription: "Cancel subscription",
    subscriptionCancelled: "Subscription cancelled.",
    purchased_one: "Purchase complete: {count} credit added.",
    purchased_other: "Purchase complete: {count} credits added.",
    simulated: "Payment is simulated in this version of the app.",
    history: "History",
    noHistory: "No transactions yet.",
    types: {
      purchase: "Purchase",
      subscription: "Subscription",
      booking: "Booking",
      refund: "Refund",
      adjustment: "Adjustment"
    }
  },
  support: {
    title: "Support",
    description: "Report a problem or request equipment.",
    tabIncidents: "Incident reports",
    tabEquipment: "Equipment",
    newIncident: "Report a problem",
    incidentTitle: "Title",
    incidentDescription: "Description",
    incidentSpace: "Space concerned",
    noSpace: "No particular space",
    photos: "Photos (3 maximum)",
    send: "Send",
    sending: "Sending\u2026",
    incidentSent: "Report sent.",
    myIncidents: "My reports",
    noIncidents: "No reports.",
    answer: "Answer",
    newRequest: "Request equipment",
    item: "Equipment",
    quantity: "Quantity",
    neededOn: "Needed on",
    comment: "Comment",
    requestSent: "Request sent.",
    myRequests: "My requests",
    noRequests: "No requests."
  },
  visitors: {
    title: "Visitors",
    description: "Invite an external guest and track your invitations.",
    newVisit: "Invite a guest",
    site: "Site",
    guestName: "Guest name",
    guestEmail: "Guest email",
    guestCompany: "Company",
    send: "Send the invitation",
    sending: "Sending\u2026",
    sent: "Invitation sent.",
    myVisits: "My invitations",
    noVisits: "No invitations.",
    cancelled: "Invitation cancelled."
  },
  notifications: {
    title: "Notifications",
    description: "Your confirmations, reminders and alerts.",
    empty: "No notifications.",
    markAllRead: "Mark all as read"
  },
  assistant: {
    openLabel: "Open the assistant",
    closeLabel: "Close the assistant",
    title: "Booking assistant",
    greeting: "\u{1F44B} Hi! Ask me anything about booking a space.",
    placeholder: "Ask a question\u2026",
    send: "Send",
    typing: "The assistant is typing\u2026",
    error: "Sorry, something went wrong. Please try again shortly."
  }
};

// ../packages/shared/src/i18n/fr.json
var fr_default = {
  app: {
    name: "R\xE9servation d'Espace",
    shortName: "R\xE9servation",
    description: "R\xE9servez un poste, une salle de r\xE9union ou un espace de coworking en quelques secondes."
  },
  common: {
    loading: "Chargement\u2026",
    later: "Plus tard",
    save: "Enregistrer",
    saving: "Enregistrement\u2026",
    retry: "R\xE9essayer",
    signOut: "D\xE9connexion",
    skipToContent: "Aller au contenu principal",
    comingSoon: "Cette fonctionnalit\xE9 arrive bient\xF4t <muted>(phase {phase})</muted>.",
    availableInPhase: "Bient\xF4t disponible (phase {phase})",
    cancel: "Annuler",
    confirm: "Confirmer",
    close: "Fermer",
    edit: "Modifier",
    delete: "Supprimer",
    add: "Ajouter",
    create: "Cr\xE9er",
    search: "Rechercher",
    all: "Tous",
    none: "Aucun",
    name: "Nom",
    description: "Description",
    status: "Statut",
    date: "Date",
    from: "De",
    to: "\xC0",
    optional: "(facultatif)",
    saved: "Enregistr\xE9.",
    deleted: "Supprim\xE9.",
    free: "Gratuit",
    download: "T\xE9l\xE9charger",
    needsConnection: "Cette action n\xE9cessite une connexion.",
    credits_one: "{count} cr\xE9dit",
    credits_other: "{count} cr\xE9dits",
    people_one: "{count} personne",
    people_other: "{count} personnes"
  },
  language: {
    label: "Langue",
    fr: "Fran\xE7ais",
    en: "English"
  },
  roles: {
    user: "Collaborateur",
    manager: "Manager",
    admin: "Administrateur"
  },
  userStatus: {
    active: "Actif",
    disabled: "D\xE9sactiv\xE9",
    anonymized: "Anonymis\xE9"
  },
  spaceCategories: {
    desk: "Poste de travail",
    open_space: "Open space",
    meeting_room: "Salle de r\xE9union",
    coworking: "Espace coworking",
    phone_booth: "Cabine t\xE9l\xE9phonique"
  },
  nav: {
    label: "Navigation principale",
    home: "Accueil",
    reserve: "R\xE9server",
    myBookings: "Mes r\xE9servations",
    profile: "Profil",
    admin: "Administration",
    team: "Mon \xE9quipe",
    credits: "Cr\xE9dits",
    support: "Assistance",
    notifications: "Notifications",
    myBookingsShort: "R\xE9servations",
    visitors: "Visiteurs"
  },
  home: {
    greeting: "Bonjour",
    greetingName: "Bonjour {name}",
    subtitle: "Que souhaitez-vous faire aujourd'hui ?",
    shortcuts: {
      reserve: "Trouvez un poste, une salle ou un espace de coworking disponible.",
      myBookings: "Consultez, modifiez ou annulez vos r\xE9servations, m\xEAme hors ligne.",
      profile: "Vos informations et vos pr\xE9f\xE9rences de notification.",
      admin: "Espaces, utilisateurs, mod\xE9ration et statistiques.",
      team: "Les r\xE9servations des membres de votre \xE9quipe.",
      credits: "Votre solde, vos formules et l'historique.",
      support: "Signalez un probl\xE8me ou demandez du mat\xE9riel.",
      visitors: "Invitez un visiteur externe et suivez vos invitations."
    },
    upcoming: "Prochaines r\xE9servations",
    noUpcoming: "Aucune r\xE9servation \xE0 venir.",
    nextBooking: "Prochaine r\xE9servation",
    noNextBooking: "Rien de pr\xE9vu",
    balance: "Solde de cr\xE9dits",
    unread_one: "{count} notification non lue",
    unread_other: "{count} notifications non lues",
    allRead: "Tout est lu",
    seeAll: "Tout voir"
  },
  reserve: {
    title: "R\xE9server un espace",
    description: "Recherchez par site, capacit\xE9, \xE9quipement et date.",
    site: "Site",
    date: "Date",
    start: "D\xE9but",
    end: "Fin",
    category: "Type d'espace",
    anyCategory: "Tous les types",
    minCapacity: "Capacit\xE9 minimale",
    equipment: "\xC9quipement",
    attendees: "Nombre de personnes",
    search: "Voir les disponibilit\xE9s",
    searching: "Recherche\u2026",
    resultsCount_one: "{count} espace disponible sur ce cr\xE9neau",
    resultsCount_other: "{count} espaces disponibles sur ce cr\xE9neau",
    noResults: "Aucun espace ne correspond \xE0 votre recherche.",
    noSites: "Aucun site n'est encore configur\xE9.",
    firstSearch: "Choisissez un cr\xE9neau pour voir les espaces disponibles.",
    available: "Disponible",
    unavailable: "Indisponible",
    showUnavailable: "Afficher aussi les espaces indisponibles",
    book: "R\xE9server",
    floor: "\xC9tage {floor}",
    capacity_one: "{count} place",
    capacity_other: "{count} places",
    perHour: "{count} cr./h",
    cost: "Co\xFBt",
    confirmTitle: "Confirmer la r\xE9servation",
    balance: "Votre solde : {balance} cr\xE9dits",
    booked: "R\xE9servation confirm\xE9e.",
    offline: "La recherche de disponibilit\xE9s n\xE9cessite une connexion.",
    busy: "D\xE9j\xE0 r\xE9serv\xE9 : {slots}"
  },
  myBookings: {
    title: "Mes r\xE9servations",
    description: "Vos r\xE9servations \xE0 venir et votre historique.",
    upcoming: "\xC0 venir",
    past: "Pass\xE9es",
    emptyUpcoming: "Aucune r\xE9servation \xE0 venir.",
    emptyPast: "Aucune r\xE9servation pass\xE9e.",
    cancelledBadge: "Annul\xE9e",
    change: "Modifier",
    cancel: "Annuler",
    changeTitle: "Modifier la r\xE9servation",
    cancelTitle: "Annuler la r\xE9servation",
    cancelConfirm: "Les cr\xE9dits de cette r\xE9servation seront rembours\xE9s.",
    cancelled: "R\xE9servation annul\xE9e.",
    updated: "R\xE9servation modifi\xE9e.",
    absences: "Absences",
    absencesHint: "Pendant une absence, vos r\xE9servations sont annul\xE9es et vous ne pouvez plus r\xE9server.",
    declareAbsence: "D\xE9clarer une absence",
    absenceFrom: "Premier jour",
    absenceTo: "Dernier jour",
    absenceNote: "Note",
    absenceDeclared_one: "Absence enregistr\xE9e. {count} r\xE9servation annul\xE9e.",
    absenceDeclared_other: "Absence enregistr\xE9e. {count} r\xE9servations annul\xE9es.",
    noAbsences: "Aucune absence d\xE9clar\xE9e.",
    absenceRemoved: "Absence supprim\xE9e."
  },
  profile: {
    title: "Mon profil",
    description: "Vos informations et vos pr\xE9f\xE9rences.",
    identity: "Identit\xE9",
    email: "E-mail",
    role: "R\xF4le",
    department: "D\xE9partement",
    installApp: "Installer l'application",
    preferences: "Pr\xE9f\xE9rences",
    displayName: "Nom affich\xE9",
    notifications: "Notifications",
    prefs: {
      email: {
        label: "E-mails",
        hint: "Confirmations, annulations et rappels."
      },
      push: {
        label: "Notifications push",
        hint: "Rappels 24 h avant et alertes sur vos espaces."
      },
      weeklyDigest: {
        label: "R\xE9capitulatif hebdomadaire",
        hint: "Chaque lundi, vos r\xE9servations de la semaine."
      }
    },
    saved: "Pr\xE9f\xE9rences enregistr\xE9es.",
    savedOffline: "Enregistr\xE9 localement, synchronisation au retour du r\xE9seau.",
    privacy: "Donn\xE9es personnelles",
    privacyText: "Exportez vos donn\xE9es ou supprimez votre compte.",
    team: "\xC9quipes",
    noTeam: "Aucune",
    push: {
      enable: "Activer sur cet appareil",
      enabled: "Notifications push activ\xE9es sur cet appareil.",
      denied: "Permission refus\xE9e par le navigateur.",
      unavailable: "Les notifications push ne sont pas disponibles ici."
    },
    export: "Exporter mes donn\xE9es",
    exportHint: "T\xE9l\xE9charge un fichier JSON avec votre profil, vos r\xE9servations et vos cr\xE9dits.",
    deleteAccount: "Supprimer mon compte",
    deleteTitle: "Supprimer votre compte ?",
    deleteConfirm: "Cette action est d\xE9finitive : vos r\xE9servations \xE0 venir seront annul\xE9es et vos donn\xE9es personnelles effac\xE9es."
  },
  admin: {
    title: "Administration",
    forbidden: "Acc\xE8s r\xE9serv\xE9 aux administrateurs.",
    sections: {
      users: {
        title: "Utilisateurs",
        text: "R\xF4les, \xE9quipes, comptes d\xE9sactiv\xE9s, synchronisation annuaire."
      },
      spaces: {
        title: "Sites et espaces",
        text: "Sites, \xE9tages, espaces, tarifs, horaires et fermetures."
      },
      bookings: {
        title: "R\xE9servations",
        text: "Toutes les r\xE9servations : lib\xE9ration forc\xE9e, d\xE9placement."
      },
      credits: {
        title: "Cr\xE9dits et abonnements",
        text: "Formules, tarifs et ajustement des soldes."
      },
      organization: {
        title: "Organisation",
        text: "D\xE9partements et \xE9quipes."
      },
      support: {
        title: "Signalements et mat\xE9riel",
        text: "Incidents et demandes de mat\xE9riel."
      },
      visitors: {
        title: "Visiteurs",
        text: "Accueil : qui est attendu, enregistrer une arriv\xE9e ou un d\xE9part."
      },
      statistics: {
        title: "Statistiques",
        text: "Occupation, utilisation et exports."
      },
      audit: {
        title: "Journal d'audit",
        text: "Qui a fait quoi, et quand."
      }
    },
    users: {
      title: "Utilisateurs",
      description: "G\xE9rez les r\xF4les et les comptes des collaborateurs.",
      filterByRole: "Filtrer par r\xF4le",
      allRoles: "Tous",
      syncDirectory: "Synchroniser l'annuaire",
      tableCaption: "Liste des utilisateurs",
      name: "Nom",
      email: "E-mail",
      status: "Statut",
      role: "R\xF4le",
      roleOf: "R\xF4le pour {name}",
      empty: "Aucun utilisateur.",
      loadMore: "Charger plus",
      roleChanged: "R\xF4le mis \xE0 jour pour {name} : {role}.",
      syncDone_one: "Synchronisation termin\xE9e : {count} compte d\xE9sactiv\xE9.",
      syncDone_other: "Synchronisation termin\xE9e : {count} comptes d\xE9sactiv\xE9s.",
      department: "D\xE9partement",
      teams: "\xC9quipes",
      editOrg: "Modifier le d\xE9partement et les \xE9quipes",
      orgUpdated: "Organisation mise \xE0 jour.",
      noDepartment: "Aucun d\xE9partement",
      anonymize: "Supprimer le compte",
      anonymizeTitle: "Supprimer ce compte ?",
      anonymizeConfirm: "Les r\xE9servations \xE0 venir de {name} seront annul\xE9es et ses donn\xE9es personnelles effac\xE9es. Cette action est d\xE9finitive.",
      anonymized: "Compte supprim\xE9.",
      actions: "Actions"
    },
    organization: {
      title: "Organisation",
      description: "Les d\xE9partements et les \xE9quipes de l'entreprise.",
      departments: "D\xE9partements",
      teams: "\xC9quipes",
      newDepartment: "Nouveau d\xE9partement",
      editDepartment: "Modifier le d\xE9partement",
      newTeam: "Nouvelle \xE9quipe",
      editTeam: "Modifier l'\xE9quipe",
      departmentName: "Nom du d\xE9partement",
      teamName: "Nom de l'\xE9quipe",
      department: "D\xE9partement",
      managers: "Responsables",
      managersHint: "Les responsables voient les r\xE9servations de l'\xE9quipe. Seuls les managers et administrateurs sont propos\xE9s.",
      members_one: "{count} membre",
      members_other: "{count} membres",
      noDepartments: "Aucun d\xE9partement.",
      noTeams: "Aucune \xE9quipe.",
      confirmDelete: "Supprimer \xAB {name} \xBB ?"
    },
    spaces: {
      title: "Sites et espaces",
      description: "Les sites, leurs horaires et les espaces r\xE9servables.",
      sites: "Sites",
      spaces: "Espaces",
      newSite: "Nouveau site",
      editSite: "Modifier le site",
      newSpace: "Nouvel espace",
      editSpace: "Modifier l'espace",
      siteName: "Nom du site",
      address: "Adresse",
      timeZone: "Fuseau horaire",
      floors: "\xC9tages (un par ligne)",
      openingHours: "Horaires d'ouverture",
      closedDay: "Ferm\xE9",
      site: "Site",
      floor: "\xC9tage",
      location: "Emplacement",
      category: "Type d'espace",
      capacity: "Capacit\xE9",
      creditsPerHour: "Cr\xE9dits par heure",
      equipment: "\xC9quipement",
      tags: "Caract\xE9ristiques",
      useSiteHours: "Reprendre les horaires du site",
      closures: "Fermetures exceptionnelles",
      addClosure: "Ajouter une fermeture",
      closureReason: "Motif",
      noSites: "Aucun site.",
      noSpaces: "Aucun espace.",
      allSites: "Tous les sites",
      confirmDelete: "Supprimer \xAB {name} \xBB ? Les r\xE9servations existantes sont conserv\xE9es.",
      siteInUse: "Ce site contient encore des espaces : supprimez-les d'abord.",
      statusActive: "Actif",
      statusClosed: "Ferm\xE9"
    },
    bookings: {
      title: "R\xE9servations",
      description: "Toutes les r\xE9servations de l'organisation.",
      user: "Utilisateur",
      space: "Espace",
      slot: "Cr\xE9neau",
      statusConfirmed: "Confirm\xE9e",
      statusCancelled: "Annul\xE9e",
      move: "D\xE9placer",
      moveTitle: "D\xE9placer la r\xE9servation",
      release: "Lib\xE9rer",
      releaseTitle: "Lib\xE9rer l'espace",
      reason: "Motif (communiqu\xE9 \xE0 l'utilisateur)",
      moved: "R\xE9servation d\xE9plac\xE9e.",
      released: "R\xE9servation annul\xE9e.",
      empty: "Aucune r\xE9servation sur cette p\xE9riode."
    },
    credits: {
      title: "Cr\xE9dits et abonnements",
      description: "Les formules propos\xE9es et les soldes des utilisateurs.",
      plans: "Formules",
      newPlan: "Nouvelle formule",
      editPlan: "Modifier la formule",
      planName: "Nom",
      generateDescription: "\u2728 G\xE9n\xE9rer avec l'IA",
      generatingDescription: "G\xE9n\xE9ration\u2026",
      generateDescriptionError: "Veuillez d'abord saisir le nom de la formule.",
      planKind: "Type",
      planCredits: "Cr\xE9dits",
      planPrice: "Prix (\u20AC)",
      planActive: "Propos\xE9e aux utilisateurs",
      hidden: "Masqu\xE9e",
      noPlans: "Aucune formule.",
      adjust: "Ajuster un solde",
      adjustUser: "Utilisateur",
      adjustAmount: "Montant (n\xE9gatif pour retirer)",
      adjustLabel: "Motif",
      adjusted: "Solde ajust\xE9.",
      confirmDelete: "Supprimer la formule \xAB {name} \xBB ?"
    },
    support: {
      title: "Signalements et mat\xE9riel",
      description: "Traitez les incidents et les demandes de mat\xE9riel.",
      incidents: "Signalements",
      requests: "Demandes de mat\xE9riel",
      from: "De {name}",
      note: "R\xE9ponse \xE0 l'utilisateur",
      updated: "Mis \xE0 jour.",
      noIncidents: "Aucun signalement.",
      noRequests: "Aucune demande."
    },
    visitors: {
      title: "Visiteurs",
      description: "Les visiteurs attendus pour la journ\xE9e s\xE9lectionn\xE9e.",
      host: "Invit\xE9 par {name}",
      checkIn: "Enregistrer l'arriv\xE9e",
      checkOut: "Enregistrer le d\xE9part",
      noVisits: "Aucun visiteur attendu ce jour-l\xE0."
    },
    statistics: {
      title: "Statistiques",
      description: "L'occupation et l'utilisation des espaces.",
      bookings: "R\xE9servations",
      cancelled: "Annul\xE9es",
      hours: "Heures r\xE9serv\xE9es",
      creditsSpent: "Cr\xE9dits d\xE9pens\xE9s",
      activeUsers: "Utilisateurs actifs",
      byDay: "R\xE9servations par jour",
      byCategory: "Heures par type d'espace",
      topSpaces: "Espaces les plus r\xE9serv\xE9s",
      export: "Exporter en CSV",
      noData: "Aucune r\xE9servation sur cette p\xE9riode.",
      hoursShort: "{count} h"
    },
    audit: {
      title: "Journal d'audit",
      description: "L'historique des actions importantes.",
      action: "Action",
      allActions: "Toutes les actions",
      when: "Date",
      actor: "Auteur",
      target: "Cible",
      system: "Syst\xE8me",
      empty: "Aucune entr\xE9e.",
      actions: {
        booking: {
          created: "R\xE9servation cr\xE9\xE9e",
          updated: "R\xE9servation modifi\xE9e",
          cancelled: "R\xE9servation annul\xE9e"
        },
        absence: {
          declared: "Absence d\xE9clar\xE9e"
        },
        credits: {
          purchased: "Achat de cr\xE9dits",
          adjusted: "Cr\xE9dits ajust\xE9s"
        },
        subscription: {
          cancelled: "Abonnement r\xE9sili\xE9"
        },
        user: {
          created: "Compte cr\xE9\xE9",
          role_changed: "R\xF4le modifi\xE9",
          disabled: "Compte d\xE9sactiv\xE9",
          org_changed: "Organisation modifi\xE9e",
          anonymized: "Compte supprim\xE9"
        }
      }
    }
  },
  login: {
    title: "Connexion",
    withGoogle: "Se connecter avec Google",
    withSso: "Se connecter avec le SSO de l'entreprise",
    demoAccounts: "Comptes de d\xE9monstration (\xE9mulateurs)",
    feature1: "Postes, salles de r\xE9union et espaces de coworking",
    feature2: "Installable, et utilisable m\xEAme hors ligne",
    feature3: "Rappels et notifications en temps r\xE9el",
    welcome: "Bienvenue"
  },
  pwa: {
    updateAvailable: "Nouvelle version disponible.",
    reload: "Recharger",
    offlineBanner: "Vous \xEAtes hors ligne. Les donn\xE9es affich\xE9es proviennent du cache ; les r\xE9servations sont indisponibles.",
    install: {
      title: "Installer l'application",
      text: "Acc\xE9dez \xE0 vos r\xE9servations en un geste, m\xEAme hors connexion, et recevez les rappels.",
      install: "Installer",
      howTo: "Comment faire ?",
      iosTitle: "Installer sur iPhone ou iPad",
      iosStep1: "Touchez le bouton <strong>Partager</strong> de Safari (carr\xE9 avec une fl\xE8che vers le haut).",
      iosStep2: "Choisissez <strong>Sur l'\xE9cran d'accueil</strong>.",
      iosStep3: "Touchez <strong>Ajouter</strong>.",
      iosPushNote: "Les notifications push ne sont disponibles sur iOS qu'une fois l'application install\xE9e (iOS 16.4 ou ult\xE9rieur).",
      gotIt: "J'ai compris"
    }
  },
  offline: {
    title: "Hors ligne",
    heading: "Vous \xEAtes hors ligne",
    text: "Cette page n'est pas disponible sans connexion. Vos r\xE9servations d\xE9j\xE0 consult\xE9es restent accessibles.",
    notCached: "Ces donn\xE9es n'ont pas encore \xE9t\xE9 consult\xE9es avec une connexion : elles seront disponibles hors ligne apr\xE8s une premi\xE8re visite.",
    staleSince: "Donn\xE9es hors ligne du {date}."
  },
  notFound: {
    title: "Page introuvable",
    text: "La page demand\xE9e n'existe pas ou a \xE9t\xE9 d\xE9plac\xE9e.",
    back: "Retour \xE0 l'accueil"
  },
  errors: {
    generic: "Une erreur est survenue.",
    authRequired: "Votre session a expir\xE9. Veuillez vous reconnecter.",
    forbidden: "Vous n'avez pas les droits n\xE9cessaires.",
    invalidInput: "Donn\xE9es invalides.",
    rateLimited: "Trop de requ\xEAtes, r\xE9essayez dans quelques instants.",
    unavailable: "Service indisponible. V\xE9rifiez votre connexion.",
    internal: "Une erreur interne est survenue.",
    popupClosed: "La fen\xEAtre de connexion a \xE9t\xE9 ferm\xE9e.",
    network: "Connexion r\xE9seau impossible.",
    invalidCredential: "Identifiants invalides.",
    accountDisabled: "Ce compte a \xE9t\xE9 d\xE9sactiv\xE9.",
    noEmail: "Aucune adresse e-mail associ\xE9e au compte.",
    notInCompany: "Ce compte n'appartient pas \xE0 l'entreprise.",
    cannotDemoteSelf: "Vous ne pouvez pas retirer votre propre r\xF4le d'administrateur.",
    userNotFound: "Utilisateur introuvable.",
    invalidSlot: "Ce cr\xE9neau n'est pas valide (30 min minimum, 8 h maximum, par tranches de 30 min).",
    spaceClosed: "Cet espace est ferm\xE9 \xE0 cette date.",
    outsideHours: "Ce cr\xE9neau est en dehors des horaires d'ouverture.",
    pastSlot: "Ce cr\xE9neau est d\xE9j\xE0 pass\xE9.",
    tooFarAhead: "Vous ne pouvez pas r\xE9server plus de 60 jours \xE0 l'avance.",
    slotTaken: "Cet espace n'est plus disponible sur ce cr\xE9neau.",
    tooManyAttendees: "Le nombre de personnes d\xE9passe la capacit\xE9 de l'espace.",
    alreadyBooked: "Vous avez d\xE9j\xE0 une r\xE9servation sur ce cr\xE9neau.",
    absent: "Vous \xEAtes d\xE9clar\xE9 absent \xE0 cette date.",
    spaceNotFound: "Espace introuvable.",
    bookingNotFound: "R\xE9servation introuvable.",
    bookingNotCancellable: "Cette r\xE9servation ne peut plus \xEAtre modifi\xE9e ou annul\xE9e.",
    invalidDates: "Les dates ne sont pas valides.",
    notEnoughCredits: "Cr\xE9dits insuffisants.",
    planNotFound: "Formule introuvable.",
    alreadySubscribed: "Vous avez d\xE9j\xE0 un abonnement actif.",
    subscriptionNotFound: "Abonnement introuvable.",
    assistantUnavailable: "L'assistant IA est momentan\xE9ment indisponible.",
    visitNotFound: "Visite introuvable.",
    invalidVisitStatus: "Cette visite ne peut plus \xEAtre modifi\xE9e."
  },
  incidentStatus: {
    open: "Ouvert",
    in_progress: "En cours",
    resolved: "R\xE9solu"
  },
  equipmentStatus: {
    pending: "En attente",
    approved: "Approuv\xE9e",
    rejected: "Refus\xE9e"
  },
  visitStatus: {
    expected: "Attendu",
    checkedIn: "Arriv\xE9",
    checkedOut: "Parti",
    cancelled: "Annul\xE9"
  },
  items: {
    screen: "\xC9cran",
    keyboard: "Clavier",
    mouse: "Souris",
    headset: "Casque audio",
    webcam: "Webcam",
    adapter: "Adaptateur",
    chair: "Chaise de bureau"
  },
  notify: {
    bookingConfirmed: {
      title: "R\xE9servation confirm\xE9e",
      body: "{space} \xB7 {date} de {from} \xE0 {to}"
    },
    bookingCancelled: {
      title: "R\xE9servation annul\xE9e",
      body: "{space} \xB7 {date} de {from} \xE0 {to}"
    },
    bookingCancelledByAdmin: {
      title: "R\xE9servation annul\xE9e par un administrateur",
      body: "{space} \xB7 {date} de {from} \xE0 {to}. Motif : {reason}"
    },
    bookingMoved: {
      title: "R\xE9servation modifi\xE9e",
      body: "{space} \xB7 {date} de {from} \xE0 {to}"
    },
    bookingReminder: {
      title: "Rappel de r\xE9servation",
      body: "{space} \xB7 {date} de {from} \xE0 {to}"
    },
    weeklyDigest: {
      title: "Votre semaine",
      body_one: "Vous avez {count} r\xE9servation cette semaine.",
      body_other: "Vous avez {count} r\xE9servations cette semaine."
    },
    creditsAdded: {
      title: "Cr\xE9dits ajout\xE9s",
      body_one: "{count} cr\xE9dit a \xE9t\xE9 ajout\xE9 \xE0 votre solde ({label}).",
      body_other: "{count} cr\xE9dits ont \xE9t\xE9 ajout\xE9s \xE0 votre solde ({label})."
    },
    subscriptionRenewed: {
      title: "Abonnement renouvel\xE9",
      body_one: "{count} cr\xE9dit ajout\xE9 ({label}).",
      body_other: "{count} cr\xE9dits ajout\xE9s ({label})."
    },
    incidentReceived: {
      title: "Nouveau signalement",
      body: "{title}, par {name}"
    },
    incidentUpdated: {
      title: "Signalement mis \xE0 jour",
      body: "\xAB {title} \xBB est maintenant : {status}"
    },
    equipmentUpdated: {
      title: "Demande de mat\xE9riel mise \xE0 jour",
      body: "Votre demande ({item}) est maintenant : {status}"
    },
    visitorArrived: {
      title: "Votre invit\xE9 est arriv\xE9",
      body: "{guest} est arriv\xE9(e) \xE0 l'accueil."
    }
  },
  weekdays: {
    mon: "Lundi",
    tue: "Mardi",
    wed: "Mercredi",
    thu: "Jeudi",
    fri: "Vendredi",
    sat: "Samedi",
    sun: "Dimanche"
  },
  equipment: {
    screen: "\xC9cran",
    dock: "Station d'accueil",
    whiteboard: "Tableau blanc",
    videoconference: "Visioconf\xE9rence",
    projector: "Projecteur"
  },
  tags: {
    quiet_zone: "Zone calme",
    window: "Pr\xE8s d'une fen\xEAtre",
    standing_desk: "Bureau assis-debout",
    accessible: "Accessible PMR"
  },
  team: {
    title: "Mon \xE9quipe",
    description: "Les r\xE9servations des membres de vos \xE9quipes.",
    noTeam: "Vous ne g\xE9rez aucune \xE9quipe pour le moment.",
    member: "Membre",
    bookings: "R\xE9servations",
    noBooking: "Aucune r\xE9servation ce jour-l\xE0",
    team: "\xC9quipe"
  },
  credits: {
    title: "Cr\xE9dits",
    description: "Votre solde, vos formules et l'historique des mouvements.",
    balance: "Solde actuel",
    plans: "Formules",
    noPlans: "Aucune formule n'est disponible pour le moment.",
    buy: "Acheter",
    subscribe: "S'abonner",
    kindPack: "Pack de cr\xE9dits",
    kindSubscription: "Abonnement mensuel",
    perMonth: "par mois",
    subscription: "Votre abonnement",
    renewsOn: "Prochain renouvellement : {date}",
    cancelSubscription: "R\xE9silier l'abonnement",
    subscriptionCancelled: "Abonnement r\xE9sili\xE9.",
    purchased_one: "Achat effectu\xE9 : {count} cr\xE9dit ajout\xE9.",
    purchased_other: "Achat effectu\xE9 : {count} cr\xE9dits ajout\xE9s.",
    simulated: "Le paiement est simul\xE9 dans cette version de l'application.",
    history: "Historique",
    noHistory: "Aucun mouvement pour le moment.",
    types: {
      purchase: "Achat",
      subscription: "Abonnement",
      booking: "R\xE9servation",
      refund: "Remboursement",
      adjustment: "Ajustement"
    }
  },
  support: {
    title: "Assistance",
    description: "Signalez un probl\xE8me ou demandez du mat\xE9riel.",
    tabIncidents: "Signalements",
    tabEquipment: "Mat\xE9riel",
    newIncident: "Signaler un probl\xE8me",
    incidentTitle: "Titre",
    incidentDescription: "Description",
    incidentSpace: "Espace concern\xE9",
    noSpace: "Aucun espace en particulier",
    photos: "Photos (3 maximum)",
    send: "Envoyer",
    sending: "Envoi\u2026",
    incidentSent: "Signalement envoy\xE9.",
    myIncidents: "Mes signalements",
    noIncidents: "Aucun signalement.",
    answer: "R\xE9ponse",
    newRequest: "Demander du mat\xE9riel",
    item: "Mat\xE9riel",
    quantity: "Quantit\xE9",
    neededOn: "N\xE9cessaire le",
    comment: "Commentaire",
    requestSent: "Demande envoy\xE9e.",
    myRequests: "Mes demandes",
    noRequests: "Aucune demande."
  },
  visitors: {
    title: "Visiteurs",
    description: "Invitez un visiteur externe et suivez vos invitations.",
    newVisit: "Inviter un visiteur",
    site: "Site",
    guestName: "Nom du visiteur",
    guestEmail: "E-mail du visiteur",
    guestCompany: "Soci\xE9t\xE9",
    send: "Envoyer l'invitation",
    sending: "Envoi\u2026",
    sent: "Invitation envoy\xE9e.",
    myVisits: "Mes invitations",
    noVisits: "Aucune invitation.",
    cancelled: "Invitation annul\xE9e."
  },
  notifications: {
    title: "Notifications",
    description: "Vos confirmations, rappels et alertes.",
    empty: "Aucune notification.",
    markAllRead: "Tout marquer comme lu"
  },
  assistant: {
    openLabel: "Ouvrir l'assistant",
    closeLabel: "Fermer l'assistant",
    title: "Assistant de r\xE9servation",
    greeting: "\u{1F44B} Bonjour ! Posez-moi vos questions sur la r\xE9servation des espaces.",
    placeholder: "Posez une question\u2026",
    send: "Envoyer",
    typing: "L'assistant \xE9crit\u2026",
    error: "D\xE9sol\xE9, une erreur est survenue. R\xE9essayez dans un instant."
  }
};

// ../packages/shared/src/i18n/index.ts
var LOCALES = ["fr", "en"];
var DEFAULT_LOCALE = "fr";
var MESSAGES = { fr: fr_default, en: en_default };
function isLocale(value) {
  return typeof value === "string" && LOCALES.includes(value);
}
function lookup(messages, path) {
  let node = messages;
  for (const segment of path.split(".")) {
    if (typeof node !== "object" || node === null) return void 0;
    node = node[segment];
  }
  return typeof node === "string" ? node : void 0;
}
function interpolate(template, values) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => name in values ? String(values[name]) : match);
}
var TAG = /<(\w+)>(.*?)<\/\1>/g;
function splitRich(template) {
  const parts = [];
  let last = 0;
  for (const m of template.matchAll(TAG)) {
    if (m.index > last) parts.push({ tag: null, text: template.slice(last, m.index) });
    parts.push({ tag: m[1], text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < template.length) parts.push({ tag: null, text: template.slice(last) });
  return parts;
}
function createTranslator(locale) {
  const plural = new Intl.PluralRules(locale);
  function template(key, values) {
    const count = values?.count;
    for (const messages of [MESSAGES[locale], MESSAGES[DEFAULT_LOCALE]]) {
      if (typeof count === "number") {
        const form = lookup(messages, `${key}_${plural.select(count)}`) ?? lookup(messages, `${key}_other`);
        if (form !== void 0) return form;
      }
      const message = lookup(messages, key);
      if (message !== void 0) return message;
    }
    return key;
  }
  return {
    locale,
    t: (key, values) => interpolate(template(key, values), values),
    // Split before interpolating so that values can never inject tags.
    parts: (key, values) => splitRich(template(key, values)).map((p) => ({ ...p, text: interpolate(p.text, values) }))
  };
}

// ../packages/shared/src/entities.ts
var timeRangeSchema = import_zod.z.object({ from: import_zod.z.number().int().min(0).max(24 * 60), to: import_zod.z.number().int().min(0).max(24 * 60) });
var timeRangeArraySchema = import_zod.z.array(timeRangeSchema);
var openingHoursSchema = import_zod.z.object(
  Object.fromEntries(WEEKDAYS.map((day) => [day, timeRangeArraySchema]))
);
var notificationPrefsSchema = import_zod.z.object({ email: import_zod.z.boolean(), push: import_zod.z.boolean(), weeklyDigest: import_zod.z.boolean() });
var userProfileSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  // uid
  email: import_zod.z.string().email(),
  displayName: import_zod.z.string(),
  photoURL: import_zod.z.string().nullable(),
  departmentId: import_zod.z.string().nullable(),
  teamIds: import_zod.z.array(import_zod.z.string()),
  defaultSiteId: import_zod.z.string().nullable(),
  role: import_zod.z.enum(ROLES),
  status: import_zod.z.enum(["active", "disabled", "anonymized"]),
  notificationPrefs: notificationPrefsSchema,
  locale: import_zod.z.enum(LOCALES),
  claimsUpdatedAt: import_zod.z.date().nullable(),
  lastLoginAt: import_zod.z.date().nullable(),
  disabledAt: import_zod.z.date().nullable().optional(),
  createdAt: import_zod.z.date()
});
var departmentSchema = import_zod.z.object({ _id: import_zod.z.string().min(1), name: import_zod.z.string() });
var teamSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  name: import_zod.z.string(),
  departmentId: import_zod.z.string(),
  managerIds: import_zod.z.array(import_zod.z.string()),
  memberIds: import_zod.z.array(import_zod.z.string())
});
var floorSchema = import_zod.z.object({ id: import_zod.z.string(), label: import_zod.z.string() });
var siteSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  name: import_zod.z.string(),
  address: import_zod.z.string(),
  timeZone: import_zod.z.string(),
  floors: import_zod.z.array(floorSchema),
  defaultOpeningHours: openingHoursSchema
});
var closureSchema = import_zod.z.object({ from: import_zod.z.string(), to: import_zod.z.string(), reason: import_zod.z.string() });
var spaceSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  siteId: import_zod.z.string(),
  floor: import_zod.z.string(),
  location: import_zod.z.string(),
  name: import_zod.z.string(),
  category: import_zod.z.enum(SPACE_CATEGORIES),
  capacity: import_zod.z.number().int().min(0),
  creditsPerHour: import_zod.z.number().min(0),
  equipment: import_zod.z.array(import_zod.z.string()),
  tags: import_zod.z.array(import_zod.z.string()),
  openingHours: openingHoursSchema,
  status: import_zod.z.enum(["active", "closed"]),
  closures: import_zod.z.array(closureSchema),
  createdAt: import_zod.z.date(),
  updatedAt: import_zod.z.date()
});
var auditLogSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  actorId: import_zod.z.string(),
  actorRole: import_zod.z.union([import_zod.z.enum(ROLES), import_zod.z.literal("system")]),
  action: import_zod.z.string(),
  targetType: import_zod.z.string(),
  targetId: import_zod.z.string(),
  details: import_zod.z.record(import_zod.z.string(), import_zod.z.unknown()).nullable(),
  createdAt: import_zod.z.date()
});
var bookingSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  userId: import_zod.z.string(),
  userName: import_zod.z.string(),
  teamIds: import_zod.z.array(import_zod.z.string()),
  spaceId: import_zod.z.string(),
  spaceName: import_zod.z.string(),
  siteId: import_zod.z.string(),
  date: import_zod.z.string(),
  from: import_zod.z.number().int().min(0).max(24 * 60),
  to: import_zod.z.number().int().min(0).max(24 * 60),
  attendees: import_zod.z.number().int().min(1),
  startsAt: import_zod.z.date(),
  status: import_zod.z.enum(["confirmed", "cancelled"]),
  credits: import_zod.z.number().min(0),
  cancelledBy: import_zod.z.string().nullable(),
  cancelReason: import_zod.z.string().nullable(),
  reminderSent: import_zod.z.boolean(),
  createdAt: import_zod.z.date(),
  updatedAt: import_zod.z.date()
});
var absenceSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  userId: import_zod.z.string(),
  userName: import_zod.z.string(),
  from: import_zod.z.string(),
  to: import_zod.z.string(),
  note: import_zod.z.string(),
  createdAt: import_zod.z.date()
});
var appNotificationSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  userId: import_zod.z.string(),
  type: import_zod.z.enum(NOTIFICATION_TYPES),
  title: import_zod.z.string(),
  body: import_zod.z.string(),
  link: import_zod.z.string(),
  readAt: import_zod.z.date().nullable(),
  createdAt: import_zod.z.date()
});
var deviceSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  userId: import_zod.z.string(),
  fcmToken: import_zod.z.string().max(4096),
  platform: import_zod.z.string(),
  userAgent: import_zod.z.string(),
  lastSeenAt: import_zod.z.date()
});
var walletSchema = import_zod.z.object({ _id: import_zod.z.string().min(1), balance: import_zod.z.number(), updatedAt: import_zod.z.date() });
var planSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  name: import_zod.z.string(),
  description: import_zod.z.string(),
  kind: import_zod.z.enum(PLAN_KINDS),
  credits: import_zod.z.number().int().min(0),
  priceCents: import_zod.z.number().int().min(0),
  active: import_zod.z.boolean()
});
var subscriptionSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  userId: import_zod.z.string(),
  planId: import_zod.z.string(),
  planName: import_zod.z.string(),
  credits: import_zod.z.number().int().min(0),
  status: import_zod.z.enum(["active", "cancelled"]),
  nextRenewalAt: import_zod.z.date(),
  createdAt: import_zod.z.date(),
  cancelledAt: import_zod.z.date().nullable()
});
var creditTransactionSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  userId: import_zod.z.string(),
  type: import_zod.z.enum(CREDIT_TRANSACTION_TYPES),
  amount: import_zod.z.number(),
  balanceAfter: import_zod.z.number(),
  label: import_zod.z.string(),
  bookingId: import_zod.z.string().nullable(),
  createdAt: import_zod.z.date()
});
var incidentSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  reporterId: import_zod.z.string(),
  reporterName: import_zod.z.string(),
  spaceId: import_zod.z.string().nullable(),
  spaceName: import_zod.z.string().nullable(),
  title: import_zod.z.string(),
  description: import_zod.z.string(),
  photoPaths: import_zod.z.array(import_zod.z.string()),
  status: import_zod.z.enum(INCIDENT_STATUSES),
  adminNote: import_zod.z.string(),
  createdAt: import_zod.z.date(),
  updatedAt: import_zod.z.date()
});
var equipmentRequestSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  requesterId: import_zod.z.string(),
  requesterName: import_zod.z.string(),
  item: import_zod.z.enum(REQUESTABLE_ITEMS),
  quantity: import_zod.z.number().int().min(1),
  neededOn: import_zod.z.string(),
  comment: import_zod.z.string(),
  status: import_zod.z.enum(EQUIPMENT_REQUEST_STATUSES),
  adminNote: import_zod.z.string(),
  createdAt: import_zod.z.date(),
  updatedAt: import_zod.z.date()
});
var visitSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  siteId: import_zod.z.string().min(1),
  siteName: import_zod.z.string().min(1),
  hostUserId: import_zod.z.string().min(1),
  hostName: import_zod.z.string().min(1),
  guestName: import_zod.z.string().min(1),
  guestEmail: import_zod.z.string().email().nullable(),
  guestCompany: import_zod.z.string().min(1).nullable(),
  visitDate: import_zod.z.string(),
  // YYYY-MM-DD
  status: import_zod.z.enum(VISIT_STATUSES),
  checkedInAt: import_zod.z.date().nullable(),
  checkedOutAt: import_zod.z.date().nullable(),
  createdAt: import_zod.z.date(),
  updatedAt: import_zod.z.date()
});
var rateLimitStateSchema = import_zod.z.object({
  _id: import_zod.z.string().min(1),
  windowStart: import_zod.z.number(),
  count: import_zod.z.number().int().min(0)
});

// ../packages/shared/src/schemas.ts
var import_zod2 = require("zod");
var setUserRoleInput = import_zod2.z.object({
  uid: import_zod2.z.string().min(1).max(128),
  role: import_zod2.z.enum(ROLES)
});
var bootstrapProfileInput = import_zod2.z.object({
  /** The client's current language, stored on profile creation. */
  locale: import_zod2.z.enum(LOCALES).optional()
}).strict();
var updateUserOrgInput = import_zod2.z.object({
  uid: import_zod2.z.string().min(1).max(128),
  departmentId: import_zod2.z.string().min(1).max(64).nullable(),
  teamIds: import_zod2.z.array(import_zod2.z.string().min(1).max(64)).max(20)
});
var anonymizeUserInput = import_zod2.z.object({ uid: import_zod2.z.string().min(1).max(128) });
var dateString = import_zod2.z.string().refine(isDateString, "YYYY-MM-DD expected");
var minuteOfDay = import_zod2.z.number().int().min(0).max(24 * 60);
var attendees = import_zod2.z.number().int().min(1).max(500);
var searchSpacesInput = import_zod2.z.object({
  siteId: import_zod2.z.string().min(1).max(64),
  date: dateString,
  from: minuteOfDay,
  to: minuteOfDay,
  attendees: attendees.optional()
});
var createBookingInput = import_zod2.z.object({
  spaceId: import_zod2.z.string().min(1).max(64),
  date: dateString,
  from: minuteOfDay,
  to: minuteOfDay,
  attendees: attendees.default(1)
});
var updateBookingInput = import_zod2.z.object({
  bookingId: import_zod2.z.string().min(1).max(64),
  /** Only administrators can move a booking to another space. */
  spaceId: import_zod2.z.string().min(1).max(64).optional(),
  date: dateString,
  from: minuteOfDay,
  to: minuteOfDay,
  attendees: attendees.optional()
});
var cancelBookingInput = import_zod2.z.object({
  bookingId: import_zod2.z.string().min(1).max(64),
  reason: import_zod2.z.string().max(200).optional()
});
var declareAbsenceInput = import_zod2.z.object({
  from: dateString,
  to: dateString,
  note: import_zod2.z.string().max(200).default("")
});
var removeAbsenceInput = import_zod2.z.object({ absenceId: import_zod2.z.string().min(1).max(64) });
var teamBookingsInput = import_zod2.z.object({ date: dateString });
var purchasePlanInput = import_zod2.z.object({ planId: import_zod2.z.string().min(1).max(64) });
var cancelSubscriptionInput = import_zod2.z.object({ subscriptionId: import_zod2.z.string().min(1).max(64) });
var adjustCreditsInput = import_zod2.z.object({
  uid: import_zod2.z.string().min(1).max(128),
  amount: import_zod2.z.number().int().min(-1e4).max(1e4).refine((n) => n !== 0, "amount must not be 0"),
  label: import_zod2.z.string().max(120).default("")
});
var planFields = {
  name: import_zod2.z.string().min(1).max(80),
  description: import_zod2.z.string().max(300).default(""),
  kind: import_zod2.z.enum(PLAN_KINDS),
  credits: import_zod2.z.number().int().min(1),
  priceCents: import_zod2.z.number().int().min(0),
  active: import_zod2.z.boolean().default(true)
};
var createPlanInput = import_zod2.z.object(planFields).strict();
var updatePlanInput = import_zod2.z.object({ planId: import_zod2.z.string().min(1).max(64), ...planFields }).strict();
var deletePlanInput = import_zod2.z.object({ planId: import_zod2.z.string().min(1).max(64) }).strict();
var createVisitInput = import_zod2.z.object({
  siteId: import_zod2.z.string().min(1).max(64),
  guestName: import_zod2.z.string().min(2).max(120),
  guestEmail: import_zod2.z.string().email().optional(),
  guestCompany: import_zod2.z.string().min(1).max(120).optional(),
  visitDate: dateString
}).strict();
var visitIdInput = import_zod2.z.object({ visitId: import_zod2.z.string().min(1).max(64) }).strict();
var listVisitsForDayInput = import_zod2.z.object({ date: dateString }).strict();
var generatePlanDescriptionInput = import_zod2.z.object({
  name: import_zod2.z.string().min(2).max(80),
  /** Language to write the description in (the admin's UI language). */
  locale: import_zod2.z.enum(LOCALES).optional()
}).strict();
var chatMessageInput = import_zod2.z.object({
  role: import_zod2.z.enum(["user", "assistant"]),
  content: import_zod2.z.string().min(1).max(2e3)
});
var chatWithAssistantInput = import_zod2.z.object({ messages: import_zod2.z.array(chatMessageInput).min(1).max(30) }).strict();
var createIncidentInput = import_zod2.z.object({
  title: import_zod2.z.string().trim().min(1).max(120),
  description: import_zod2.z.string().trim().max(2e3),
  spaceId: import_zod2.z.string().min(1).max(64).nullable().optional(),
  /** Storage paths of photos the client uploaded first, under incidents/{uid}/ (checked by the handler). */
  photoPaths: import_zod2.z.array(import_zod2.z.string().min(1).max(512)).max(3)
}).strict();
var updateIncidentStatusInput = import_zod2.z.object({
  incidentId: import_zod2.z.string().min(1).max(64),
  status: import_zod2.z.enum(INCIDENT_STATUSES),
  adminNote: import_zod2.z.string().trim().max(1e3)
}).strict();
var createEquipmentRequestInput = import_zod2.z.object({
  item: import_zod2.z.enum(REQUESTABLE_ITEMS),
  quantity: import_zod2.z.number().int().min(1).max(20),
  neededOn: dateString,
  comment: import_zod2.z.string().trim().max(500)
}).strict();
var updateEquipmentRequestStatusInput = import_zod2.z.object({
  requestId: import_zod2.z.string().min(1).max(64),
  status: import_zod2.z.enum(EQUIPMENT_REQUEST_STATUSES),
  adminNote: import_zod2.z.string().trim().max(1e3)
}).strict();
var emptyInput = import_zod2.z.object({}).strict();
var entityId = import_zod2.z.string().min(1).max(64);
var timeRange = import_zod2.z.object({ from: minuteOfDay, to: minuteOfDay }).strict();
var dayHours = import_zod2.z.array(timeRange).max(10);
var openingHoursInput = import_zod2.z.object({ mon: dayHours, tue: dayHours, wed: dayHours, thu: dayHours, fri: dayHours, sat: dayHours, sun: dayHours }).strict();
var updateMyProfileInput = import_zod2.z.object({
  displayName: import_zod2.z.string().trim().min(1).max(80).optional(),
  notificationPrefs: import_zod2.z.object({ email: import_zod2.z.boolean(), push: import_zod2.z.boolean(), weeklyDigest: import_zod2.z.boolean() }).strict().optional(),
  locale: import_zod2.z.enum(LOCALES).optional()
}).strict().refine((input) => Object.keys(input).length > 0, "at least one field is required");
var registerDeviceInput = import_zod2.z.object({
  fcmToken: import_zod2.z.string().min(1).max(4096),
  platform: import_zod2.z.string().max(100),
  userAgent: import_zod2.z.string().max(200)
}).strict();
var floorInput = import_zod2.z.object({ id: import_zod2.z.string().min(1).max(32), label: import_zod2.z.string().trim().min(1).max(80) }).strict();
var siteFields = {
  name: import_zod2.z.string().trim().min(1).max(120),
  address: import_zod2.z.string().trim().max(300),
  timeZone: import_zod2.z.string().min(1).max(64),
  floors: import_zod2.z.array(floorInput).max(50),
  defaultOpeningHours: openingHoursInput
};
var createSiteInput = import_zod2.z.object(siteFields).strict();
var updateSiteInput = import_zod2.z.object({ siteId: entityId, ...siteFields }).strict();
var deleteSiteInput = import_zod2.z.object({ siteId: entityId }).strict();
var closureInput = import_zod2.z.object({ from: dateString, to: dateString, reason: import_zod2.z.string().trim().max(200) }).strict();
var spaceFields = {
  siteId: entityId,
  floor: import_zod2.z.string().max(32),
  location: import_zod2.z.string().trim().max(120),
  name: import_zod2.z.string().trim().min(1).max(120),
  category: import_zod2.z.enum(SPACE_CATEGORIES),
  capacity: import_zod2.z.number().int().min(0).max(1e4),
  creditsPerHour: import_zod2.z.number().min(0).max(1e4),
  equipment: import_zod2.z.array(import_zod2.z.enum(EQUIPMENT)).max(20),
  tags: import_zod2.z.array(import_zod2.z.enum(SPACE_TAGS)).max(10),
  status: import_zod2.z.enum(["active", "closed"]),
  openingHours: openingHoursInput,
  closures: import_zod2.z.array(closureInput).max(100)
};
var createSpaceInput = import_zod2.z.object(spaceFields).strict();
var updateSpaceInput = import_zod2.z.object({ spaceId: entityId, ...spaceFields }).strict();
var deleteSpaceInput = import_zod2.z.object({ spaceId: entityId }).strict();
var listSpacesInput = import_zod2.z.object({ siteId: entityId.optional() }).strict();
var createDepartmentInput = import_zod2.z.object({ name: import_zod2.z.string().trim().min(1).max(120) }).strict();
var updateDepartmentInput = import_zod2.z.object({ departmentId: entityId, name: import_zod2.z.string().trim().min(1).max(120) }).strict();
var deleteDepartmentInput = import_zod2.z.object({ departmentId: entityId }).strict();
var teamFields = {
  name: import_zod2.z.string().trim().min(1).max(120),
  departmentId: entityId,
  managerIds: import_zod2.z.array(entityId).max(50)
};
var createTeamInput = import_zod2.z.object(teamFields).strict();
var updateTeamInput = import_zod2.z.object({ teamId: entityId, ...teamFields }).strict();
var deleteTeamInput = import_zod2.z.object({ teamId: entityId }).strict();
var dateRangeFields = { from: dateString, to: dateString };
var notReversed = (range) => range.from <= range.to;
var dateRangeInput = import_zod2.z.object(dateRangeFields).strict().refine(notReversed, "from must not be after to");
var listMyBookingsInput = import_zod2.z.object({ limit: import_zod2.z.number().int().min(1).max(100).default(100) }).strict();
var listMyUpcomingBookingsInput = import_zod2.z.object({ fromDate: dateString }).strict();
var listBookingsInRangeInput = import_zod2.z.object({ ...dateRangeFields, limit: import_zod2.z.number().int().min(1).max(5e3).default(1e3) }).strict().refine(notReversed, "from must not be after to");
var listMyNotificationsInput = import_zod2.z.object({ unreadOnly: import_zod2.z.boolean().default(false), limit: import_zod2.z.number().int().min(1).max(100).default(50) }).strict();
var markNotificationReadInput = import_zod2.z.object({ notificationId: entityId }).strict();
var listUsersInput = import_zod2.z.object({
  roles: import_zod2.z.array(import_zod2.z.enum(ROLES)).max(3).optional(),
  limit: import_zod2.z.number().int().min(1).max(300).default(20),
  /** Position of the last user of the previous page (displayName, then id). */
  after: import_zod2.z.object({ displayName: import_zod2.z.string(), id: entityId }).strict().nullable().optional()
}).strict();
var listAuditLogsInput = import_zod2.z.object({ action: import_zod2.z.string().min(1).max(60).optional(), limit: import_zod2.z.number().int().min(1).max(500).default(50) }).strict();

// src/lib/admin.ts
var import_app = require("firebase-admin/app");
var import_auth = require("firebase-admin/auth");
if ((0, import_app.getApps)().length === 0) (0, import_app.initializeApp)();
var auth = (0, import_auth.getAuth)();

// src/lib/audit.ts
var import_mongodb2 = require("mongodb");

// src/lib/mongo.ts
var import_mongodb = require("mongodb");
var clientPromise = null;
function connect() {
  if (!clientPromise) {
    const uri = process.env.MONGODB_URI || MONGODB_URI.value();
    if (!uri) throw new Error("MONGODB_URI is not set");
    clientPromise = new import_mongodb.MongoClient(uri, { maxPoolSize: 10 }).connect();
  }
  return clientPromise;
}
function getMongoClient() {
  return connect();
}
async function getDb() {
  const client = await connect();
  return client.db(process.env.MONGODB_DB_NAME || void 0);
}

// src/lib/audit.ts
async function writeAudit(entry, session) {
  const db = await getDb();
  const doc = {
    _id: new import_mongodb2.ObjectId().toHexString(),
    ...entry,
    details: entry.details ?? null,
    createdAt: /* @__PURE__ */ new Date()
  };
  await db.collection(COL.auditLogs).insertOne(doc, { session });
}

// src/lib/errors.ts
var import_https = require("firebase-functions/v2/https");
function appError(code, reason, message, extra) {
  return new import_https.HttpsError(code, message, { reason, ...extra });
}

// src/lib/callable.ts
var import_https2 = require("firebase-functions/v2/https");
var import_v22 = require("firebase-functions/v2");

// src/lib/rateLimit.ts
async function enforceRateLimit(uid, fnName, policy) {
  const col2 = (await getDb()).collection(COL.rateLimits);
  const _id = `${uid}_${fnName}`;
  const now = Date.now();
  const windowMs = policy.windowSec * 1e3;
  const windowOver = { $or: [{ $not: [{ $isNumber: "$windowStart" }] }, { $lte: [{ $add: ["$windowStart", windowMs] }, now] }] };
  const raise = () => col2.findOneAndUpdate(
    { _id },
    [
      // Both stages decide from the same old windowStart: only the second one changes it.
      { $set: { count: { $cond: [windowOver, 1, { $add: [{ $ifNull: ["$count", 0] }, 1] }] } } },
      { $set: { windowStart: { $cond: [windowOver, now, "$windowStart"] } } }
    ],
    { upsert: true, returnDocument: "after" }
  );
  let doc;
  try {
    doc = await raise();
  } catch (err) {
    if (err.code !== 11e3) throw err;
    doc = await raise();
  }
  if (doc && doc.count > policy.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((doc.windowStart + windowMs - now) / 1e3));
    throw appError("resource-exhausted", "rateLimited", "Rate limit exceeded.", { retryAfterSec });
  }
}

// src/lib/callable.ts
var DEFAULT_RATE_LIMIT = { limit: 30, windowSec: 60 };
async function authorize(request, opts) {
  const token = request.auth?.token;
  if (!request.auth || !token) throw appError("unauthenticated", "authRequired", "Authentication required.");
  const uid = request.auth.uid;
  const role = isRole(token.role) ? token.role : null;
  const required = opts.role === void 0 ? "user" : opts.role;
  if (required && (!role || !hasRole(role, required))) {
    import_v22.logger.warn("Permission denied", { fn: opts.name, uid, role, required });
    throw appError("permission-denied", "forbidden", "Missing required role.");
  }
  await enforceRateLimit(uid, opts.name, opts.rateLimit ?? DEFAULT_RATE_LIMIT);
  const parsed = opts.schema.safeParse(request.data ?? {});
  if (!parsed.success) {
    throw appError("invalid-argument", "invalidInput", "Invalid input.", { issues: parsed.error.issues });
  }
  return { uid, role, email: token.email ?? null, data: parsed.data };
}
function secureCall(opts, handler) {
  const callableOptions = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK };
  if (opts.secrets) callableOptions.secrets = opts.secrets;
  return (0, import_https2.onCall)(callableOptions, async (request) => {
    const ctx = await authorize(request, opts);
    return handler({ ...ctx, request });
  });
}

// src/lib/credits.ts
var import_mongodb3 = require("mongodb");

// src/lib/transaction.ts
var MAX_LOCK_RACE_RETRIES = 5;
function isLockCreationRace(err) {
  const e = err;
  return e?.code === 11e3 && typeof e.message === "string" && e.message.includes(`.${COL.locks} `);
}
async function withTransaction(fn) {
  const client = await getMongoClient();
  for (let attempt = 1; ; attempt += 1) {
    const session = client.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } catch (err) {
      if (attempt < MAX_LOCK_RACE_RETRIES && isLockCreationRace(err)) continue;
      throw err;
    } finally {
      await session.endSession();
    }
  }
}

// src/lib/credits.ts
async function walletsCol() {
  return (await getDb()).collection(COL.wallets);
}
async function transactionsCol() {
  return (await getDb()).collection(COL.creditTransactions);
}
async function plansCol() {
  return (await getDb()).collection(COL.plans);
}
async function subscriptionsCol() {
  return (await getDb()).collection(COL.subscriptions);
}
async function applyCredit(uid, entry, session) {
  const wallets = await walletsCol();
  const transactions = await transactionsCol();
  const run = async (s) => {
    const current = await wallets.findOne({ _id: uid }, { session: s });
    const balanceAfter = (current?.balance ?? 0) + entry.amount;
    if (balanceAfter < 0) throw appError("failed-precondition", "notEnoughCredits", "Not enough credits.");
    const now = /* @__PURE__ */ new Date();
    await wallets.updateOne({ _id: uid }, { $set: { balance: balanceAfter, updatedAt: now } }, { session: s, upsert: true });
    await transactions.insertOne(
      {
        _id: new import_mongodb3.ObjectId().toHexString(),
        userId: uid,
        type: entry.type,
        amount: entry.amount,
        balanceAfter,
        label: entry.label,
        bookingId: entry.bookingId ?? null,
        createdAt: now
      },
      { session: s }
    );
    return balanceAfter;
  };
  return session ? run(session) : withTransaction(run);
}
async function getBalance(uid, session) {
  const wallet = await (await walletsCol()).findOne({ _id: uid }, { session });
  return wallet?.balance ?? 0;
}
async function getWallet(uid) {
  return (await walletsCol()).findOne({ _id: uid });
}
async function listCreditTransactions(uid, max = 50) {
  return (await transactionsCol()).find({ userId: uid }).sort({ createdAt: -1 }).limit(max).toArray();
}
async function getPlan(planId) {
  return (await plansCol()).findOne({ _id: planId });
}
async function listPlans(activeOnly) {
  const filter = activeOnly ? { active: true } : {};
  return (await plansCol()).find(filter).sort({ priceCents: 1 }).toArray();
}
async function createPlan(plan) {
  const _id = new import_mongodb3.ObjectId().toHexString();
  await (await plansCol()).insertOne({ _id, ...plan });
  return _id;
}
async function updatePlan(planId, plan) {
  const res = await (await plansCol()).replaceOne({ _id: planId }, plan);
  if (res.matchedCount === 0) throw appError("not-found", "planNotFound", "Plan not found.");
}
async function deletePlan(planId) {
  await (await plansCol()).deleteOne({ _id: planId });
}
async function getActiveSubscription(uid) {
  return (await subscriptionsCol()).findOne({ userId: uid, status: "active" });
}
async function listSubscriptionsForUser(uid) {
  return (await subscriptionsCol()).find({ userId: uid }).toArray();
}
async function createSubscription(sub, session) {
  const _id = new import_mongodb3.ObjectId().toHexString();
  await (await subscriptionsCol()).insertOne({ _id, ...sub }, { session });
  return _id;
}
async function cancelSubscriptionById(subscriptionId, uid, isAdmin) {
  const subscriptions = await subscriptionsCol();
  const sub = await subscriptions.findOne({ _id: subscriptionId });
  if (!sub || sub.status !== "active") throw appError("not-found", "subscriptionNotFound", "Subscription not found.");
  if (sub.userId !== uid && !isAdmin) throw appError("permission-denied", "forbidden", "Not your subscription.");
  await subscriptions.updateOne({ _id: subscriptionId }, { $set: { status: "cancelled", cancelledAt: /* @__PURE__ */ new Date() } });
}
async function cancelActiveSubscriptionsForUser(uid) {
  await (await subscriptionsCol()).updateMany({ userId: uid, status: "active" }, { $set: { status: "cancelled", cancelledAt: /* @__PURE__ */ new Date() } });
}
async function listDueSubscriptions(now) {
  return (await subscriptionsCol()).find({ status: "active", nextRenewalAt: { $lte: now } }).toArray();
}
async function setNextRenewal(subscriptionId, nextRenewalAt, session) {
  await (await subscriptionsCol()).updateOne({ _id: subscriptionId }, { $set: { nextRenewalAt } }, { session });
}

// src/auth/bootstrapProfile.ts
function isEmailAllowed(email, allowedDomains) {
  if (allowedDomains.length === 0) return true;
  const domain = email.split("@")[1]?.toLowerCase();
  return !!domain && allowedDomains.includes(domain);
}
async function giveWelcomeCredits(uid) {
  const amount = WELCOME_CREDITS.value();
  if (amount <= 0) return;
  await applyCredit(uid, { amount, type: "adjustment", label: "Welcome" });
}
var bootstrapProfile = secureCall(
  // The only function open to an account without a role: it is the one that gives the role.
  { name: "bootstrapProfile", schema: bootstrapProfileInput, role: null, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, data }) => {
    const user = await auth.getUser(uid);
    const email = user.email?.toLowerCase();
    if (!email) throw appError("failed-precondition", "noEmail", "Account has no email address.");
    if (!isEmailAllowed(email, csv(ALLOWED_EMAIL_DOMAINS.value()))) {
      throw appError("permission-denied", "notInCompany", "Email domain is not allowed.");
    }
    const users2 = (await getDb()).collection(COL.users);
    const existing = await users2.findOne({ _id: uid });
    const existingRole = user.customClaims?.role;
    const locale = data.locale ?? DEFAULT_LOCALE;
    const now = /* @__PURE__ */ new Date();
    let claimsChanged = false;
    let role = existingRole ?? "user";
    if (!existingRole) {
      role = csv(BOOTSTRAP_ADMIN_EMAILS.value()).includes(email) ? "admin" : "user";
      await auth.setCustomUserClaims(uid, { ...user.customClaims, role });
      claimsChanged = true;
    }
    if (existing) {
      await users2.updateOne(
        { _id: uid },
        {
          $set: {
            lastLoginAt: now,
            ...existing.locale ? {} : { locale },
            ...claimsChanged ? { role, claimsUpdatedAt: now } : {}
          }
        }
      );
    } else {
      const profile = {
        _id: uid,
        email,
        displayName: user.displayName ?? email.split("@")[0],
        photoURL: user.photoURL ?? null,
        departmentId: null,
        teamIds: [],
        defaultSiteId: null,
        role,
        status: "active",
        notificationPrefs: { email: true, push: false, weeklyDigest: false },
        locale,
        claimsUpdatedAt: now,
        lastLoginAt: now,
        createdAt: now
      };
      await users2.insertOne(profile);
      await giveWelcomeCredits(uid);
      await writeAudit({ actorId: uid, actorRole: role, action: "user.created", targetType: "user", targetId: uid });
    }
    return { created: !existing, claimsChanged };
  }
);

// src/auth/setUserRole.ts
var setUserRole = secureCall(
  { name: "setUserRole", schema: setUserRoleInput, role: "admin" },
  async ({ uid: actorId, data }) => {
    if (data.uid === actorId && data.role !== "admin") {
      throw appError("failed-precondition", "cannotDemoteSelf", "Admins cannot remove their own admin role.");
    }
    const target = await auth.getUser(data.uid).catch(() => {
      throw appError("not-found", "userNotFound", "User not found.");
    });
    const previousRole = target.customClaims?.role ?? null;
    if (previousRole === data.role) return { changed: false };
    await auth.setCustomUserClaims(data.uid, { ...target.customClaims, role: data.role });
    const db = await getDb();
    await withTransaction(async (session) => {
      const res = await db.collection(COL.users).updateOne({ _id: data.uid }, { $set: { role: data.role, claimsUpdatedAt: /* @__PURE__ */ new Date() } }, { session });
      if (res.matchedCount === 0) throw appError("not-found", "userNotFound", "User not found.");
      await writeAudit(
        {
          actorId,
          actorRole: "admin",
          action: "user.role_changed",
          targetType: "user",
          targetId: data.uid,
          details: { from: previousRole, to: data.role }
        },
        session
      );
    });
    return { changed: true };
  }
);

// src/auth/directorySync.ts
var import_v24 = require("firebase-functions/v2");
var import_scheduler = require("firebase-functions/v2/scheduler");
var import_zod3 = require("zod");

// src/lib/notify.ts
var import_mongodb4 = require("mongodb");
var import_messaging = require("firebase-admin/messaging");
var import_v23 = require("firebase-functions/v2");
function localizeDate(date, locale) {
  return new Intl.DateTimeFormat(locale, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(
    /* @__PURE__ */ new Date(`${date}T00:00:00Z`)
  );
}
async function notifyUser(uid, { type, values = {}, link = "/" }) {
  try {
    const db = await getDb();
    const user = await db.collection(COL.users).findOne({ _id: uid });
    if (!user || user.status !== "active") return;
    const locale = isLocale(user.locale) ? user.locale : DEFAULT_LOCALE;
    const { t } = createTranslator(locale);
    const localized = typeof values.date === "string" && isDateString(values.date) ? { ...values, date: localizeDate(values.date, locale) } : values;
    const title = t(`notify.${type}.title`);
    const body = t(`notify.${type}.body`, localized);
    const notification = {
      _id: new import_mongodb4.ObjectId().toHexString(),
      userId: uid,
      type,
      title,
      body,
      link,
      readAt: null,
      createdAt: /* @__PURE__ */ new Date()
    };
    await db.collection(COL.notifications).insertOne(notification);
    if (user.notificationPrefs?.email) await sendEmail(user.email, title, `${body}
`);
    if (user.notificationPrefs?.push) await sendPush(uid, { title, body, link });
  } catch (err) {
    import_v23.logger.error("Could not notify user", { uid, type, err });
  }
}
async function sendEmail(to, subject, text) {
  const apiKey = RESEND_API_KEY.value();
  if (!apiKey) {
    import_v23.logger.warn("RESEND_API_KEY is not set, email skipped", { subject });
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM.value(), to: [to], subject, text })
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
}
async function sendPush(uid, data) {
  const db = await getDb();
  const devices = db.collection(COL.devices);
  for (const device of await devices.find({ userId: uid }).toArray()) {
    if (!device.fcmToken) continue;
    try {
      await (0, import_messaging.getMessaging)().send({ token: device.fcmToken, data });
    } catch (err) {
      import_v23.logger.warn("Push failed, removing the device", { uid, err });
      await devices.deleteOne({ _id: device._id });
    }
  }
}

// src/bookings/common.ts
async function bookings() {
  return (await getDb()).collection(COL.bookings);
}
async function absences() {
  return (await getDb()).collection(COL.absences);
}
async function spaces() {
  return (await getDb()).collection(COL.spaces);
}
async function sites() {
  return (await getDb()).collection(COL.sites);
}
async function users() {
  return (await getDb()).collection(COL.users);
}
var spaceDayFilter = (spaceId, date) => ({ spaceId, date, status: "confirmed" });
var userDayFilter = (userId, date) => ({ userId, date, status: "confirmed" });
var userAbsencesFilter = (userId) => ({ userId });
function toBookedSlot(booking) {
  const { from, to, attendees: attendees2 } = booking;
  return { from, to, attendees: attendees2 };
}
async function loadSpace(session, spaceId) {
  const space = await (await spaces()).findOne({ _id: spaceId }, { session });
  if (!space) throw appError("not-found", "spaceNotFound", "Space not found.");
  const site = await (await sites()).findOne({ _id: space.siteId }, { session });
  if (!site) throw appError("not-found", "spaceNotFound", "Site not found.");
  return { space, site };
}
function startsInThePast(booking) {
  return booking.startsAt.getTime() <= Date.now();
}

// src/bookings/cancelBooking.ts
async function cancelBookingById(bookingId, actor, reason) {
  const booking = await withTransaction(async (session) => {
    const col2 = await bookings();
    const booking2 = await col2.findOne({ _id: bookingId }, { session });
    if (!booking2) throw appError("not-found", "bookingNotFound", "Booking not found.");
    const privileged = actor.role === "admin" || actor.role === "system";
    if (booking2.userId !== actor.uid && !privileged) throw appError("permission-denied", "forbidden", "Not your booking.");
    if (booking2.status !== "confirmed" || !privileged && startsInThePast(booking2)) {
      throw appError("failed-precondition", "bookingNotCancellable", "Booking can no longer be cancelled.");
    }
    await col2.updateOne(
      { _id: bookingId },
      { $set: { status: "cancelled", cancelledBy: actor.uid, cancelReason: reason ?? null, updatedAt: /* @__PURE__ */ new Date() } },
      { session }
    );
    if (booking2.credits > 0) {
      await applyCredit(booking2.userId, { amount: booking2.credits, type: "refund", label: booking2.spaceName, bookingId }, session);
    }
    return booking2;
  });
  await writeAudit({
    actorId: actor.uid,
    actorRole: actor.role,
    action: "booking.cancelled",
    targetType: "booking",
    targetId: bookingId,
    details: { reason: reason ?? null }
  });
  const byAdmin = actor.role === "admin" && actor.uid !== booking.userId;
  await notifyUser(booking.userId, {
    type: byAdmin ? "bookingCancelledByAdmin" : "bookingCancelled",
    values: {
      space: booking.spaceName,
      date: booking.date,
      from: formatMinutes(booking.from),
      to: formatMinutes(booking.to),
      reason: reason || "-"
    },
    link: "/mes-reservations"
  });
  return booking;
}
async function cancelUpcomingBookings(userId, actor, reason, range) {
  const filter = { userId, status: "confirmed" };
  if (range) filter.date = { $gte: range.from, $lte: range.to };
  const docs = await (await bookings()).find(filter).toArray();
  let cancelled = 0;
  for (const doc of docs) {
    if (startsInThePast(doc)) continue;
    await cancelBookingById(doc._id, actor, reason);
    cancelled += 1;
  }
  return cancelled;
}
var cancelBooking = secureCall(
  { name: "cancelBooking", schema: cancelBookingInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }) => {
    await cancelBookingById(data.bookingId, { uid, role: role ?? "user" }, data.reason);
    return { cancelled: true };
  }
);

// src/auth/directory.ts
var StubDirectoryProvider = class {
  async listDepartedEmails() {
    const db = await getDb();
    const doc = await db.collection("config").findOne({ _id: "directoryStub" });
    const emails = doc?.departedEmails ?? [];
    return emails.map((e) => e.toLowerCase());
  }
};
function getDirectoryProvider() {
  return new StubDirectoryProvider();
}

// src/auth/directorySync.ts
async function runDirectorySync(actorId = "system") {
  const departed = await getDirectoryProvider().listDepartedEmails();
  const disabled = [];
  for (const email of departed) {
    const user = await auth.getUserByEmail(email).catch(() => null);
    if (!user || user.disabled) continue;
    await auth.updateUser(user.uid, { disabled: true });
    await auth.revokeRefreshTokens(user.uid);
    await cancelUpcomingBookings(user.uid, { uid: actorId, role: "system" }, "left_company");
    const db = await getDb();
    await db.collection(COL.users).updateOne({ _id: user.uid }, { $set: { status: "disabled", disabledAt: /* @__PURE__ */ new Date() } }, { upsert: true });
    await writeAudit({
      actorId,
      actorRole: actorId === "system" ? "system" : "admin",
      action: "user.disabled",
      targetType: "user",
      targetId: user.uid,
      details: { reason: "directory_sync" }
    });
    disabled.push(user.uid);
  }
  import_v24.logger.info("Directory sync done", { checked: departed.length, disabled: disabled.length });
  return { checked: departed.length, disabled };
}
var directorySyncScheduled = (0, import_scheduler.onSchedule)(
  { schedule: "every day 02:00", timeZone: "Europe/Paris", region: REGION },
  async () => {
    await runDirectorySync();
  }
);
var runDirectorySyncNow = secureCall(
  { name: "runDirectorySyncNow", schema: import_zod3.z.object({}).strict(), role: "admin", rateLimit: { limit: 5, windowSec: 60 } },
  async ({ uid }) => runDirectorySync(uid)
);

// src/lib/bulk.ts
function updateOneOp(filter, update) {
  return { updateOne: { filter, update } };
}
async function bulkUpdate(collection, ops, session) {
  if (ops.length === 0) return;
  await collection.bulkWrite(ops, { ordered: false, session });
}

// src/users/updateUserOrg.ts
var updateUserOrg = secureCall(
  { name: "updateUserOrg", schema: updateUserOrgInput, role: "admin", rateLimit: { limit: 30, windowSec: 60 } },
  async ({ uid: actorId, data }) => {
    const db = await getDb();
    const users2 = db.collection(COL.users);
    const teams = db.collection(COL.teams);
    const user = await users2.findOne({ _id: data.uid });
    if (!user) throw appError("not-found", "userNotFound", "User not found.");
    const previous = new Set(user.teamIds ?? []);
    const next = new Set(data.teamIds);
    const teamOps = [
      ...[...next].filter((teamId) => !previous.has(teamId)).map((teamId) => updateOneOp({ _id: teamId }, { $addToSet: { memberIds: data.uid } })),
      ...[...previous].filter((teamId) => !next.has(teamId)).map((teamId) => updateOneOp({ _id: teamId }, { $pull: { memberIds: data.uid } }))
    ];
    await withTransaction(async (session) => {
      await users2.updateOne({ _id: data.uid }, { $set: { departmentId: data.departmentId, teamIds: [...next] } }, { session });
      await bulkUpdate(teams, teamOps, session);
    });
    await writeAudit({
      actorId,
      actorRole: "admin",
      action: "user.org_changed",
      targetType: "user",
      targetId: data.uid,
      details: { departmentId: data.departmentId, teamIds: data.teamIds }
    });
    return { updated: true };
  }
);

// src/users/account.ts
var ANONYMOUS_NAME = "[deleted user]";
function toPlain(data) {
  const { _id, ...rest } = data;
  return { id: _id, ...JSON.parse(JSON.stringify(rest)) };
}
async function documents(db, collection, filter) {
  return (await db.collection(collection).find(filter).toArray()).map(toPlain);
}
var exportMyData = secureCall(
  { name: "exportMyData", schema: emptyInput, rateLimit: { limit: 5, windowSec: 60 } },
  async ({ uid }) => {
    const db = await getDb();
    const [profile, wallet, bookings2, absences2, transactions, subscriptions, incidents2, equipmentRequests, notifications] = await Promise.all([
      db.collection(COL.users).findOne({ _id: uid }),
      getWallet(uid),
      documents(db, COL.bookings, { userId: uid }),
      documents(db, COL.absences, { userId: uid }),
      listCreditTransactions(uid, Number.MAX_SAFE_INTEGER),
      listSubscriptionsForUser(uid),
      documents(db, COL.incidents, { reporterId: uid }),
      documents(db, COL.equipmentRequests, { requesterId: uid }),
      documents(db, COL.notifications, { userId: uid })
    ]);
    return {
      exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
      profile: JSON.parse(JSON.stringify(profile ?? {})),
      wallet: JSON.parse(JSON.stringify(wallet ?? {})),
      bookings: bookings2,
      absences: absences2,
      creditTransactions: JSON.parse(JSON.stringify(transactions)),
      subscriptions: JSON.parse(JSON.stringify(subscriptions)),
      incidents: incidents2,
      equipmentRequests,
      notifications
    };
  }
);
async function anonymizeNames(db, collection, userField, nameField, uid) {
  await db.collection(collection).updateMany({ [userField]: uid }, { $set: { [nameField]: ANONYMOUS_NAME } });
}
async function anonymizeAccount(uid, actor) {
  const db = await getDb();
  const users2 = db.collection(COL.users);
  if (!await users2.findOne({ _id: uid })) throw appError("not-found", "userNotFound", "User not found.");
  await cancelUpcomingBookings(uid, { uid: actor.uid, role: "system" }, "account_deleted");
  await cancelActiveSubscriptionsForUser(uid);
  await db.collection(COL.notifications).deleteMany({ userId: uid });
  await db.collection(COL.devices).deleteMany({ userId: uid });
  await db.collection(COL.teams).updateMany({ memberIds: uid }, { $pull: { memberIds: uid, managerIds: uid } });
  await users2.updateOne(
    { _id: uid },
    {
      $set: {
        email: `${uid}@anonymized.invalid`,
        displayName: ANONYMOUS_NAME,
        photoURL: null,
        departmentId: null,
        teamIds: [],
        defaultSiteId: null,
        status: "anonymized",
        notificationPrefs: { email: false, push: false, weeklyDigest: false }
      }
    }
  );
  await anonymizeNames(db, COL.bookings, "userId", "userName", uid);
  await anonymizeNames(db, COL.absences, "userId", "userName", uid);
  await anonymizeNames(db, COL.incidents, "reporterId", "reporterName", uid);
  await anonymizeNames(db, COL.equipmentRequests, "requesterId", "requesterName", uid);
  await auth.deleteUser(uid).catch(() => void 0);
  await writeAudit({ actorId: actor.uid, actorRole: actor.role, action: "user.anonymized", targetType: "user", targetId: uid });
}
var deleteMyAccount = secureCall(
  { name: "deleteMyAccount", schema: emptyInput, rateLimit: { limit: 3, windowSec: 60 } },
  async ({ uid, role }) => {
    await anonymizeAccount(uid, { uid, role: role ?? "user" });
    return { deleted: true };
  }
);
var anonymizeUser = secureCall(
  { name: "anonymizeUser", schema: anonymizeUserInput, role: "admin", rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid: actorId, data }) => {
    if (data.uid === actorId) throw appError("failed-precondition", "cannotDemoteSelf", "Admins cannot remove themselves.");
    await anonymizeAccount(data.uid, { uid: actorId, role: "admin" });
    return { deleted: true };
  }
);

// src/bookings/searchSpaces.ts
var searchSpaces = secureCall(
  { name: "searchSpaces", schema: searchSpacesInput, rateLimit: { limit: 40, windowSec: 60 } },
  async ({ uid, data }) => {
    const site = await (await sites()).findOne({ _id: data.siteId });
    if (!site) throw appError("not-found", "spaceNotFound", "Site not found.");
    const [siteSpaces, dayBookings, myBookings, myAbsences] = await Promise.all([
      (await spaces()).find({ siteId: data.siteId }).toArray(),
      (await bookings()).find({ siteId: data.siteId, date: data.date, status: "confirmed" }).toArray(),
      (await bookings()).find(userDayFilter(uid, data.date)).toArray(),
      (await absences()).find(userAbsencesFilter(uid)).toArray()
    ]);
    const slot = { from: data.from, to: data.to };
    const now = nowIn(site.timeZone);
    const absent = isWithinRanges(data.date, myAbsences);
    const alreadyBooked = myBookings.some((b) => overlaps(b, slot));
    return siteSpaces.map((space) => {
      const existing = dayBookings.filter((b) => b.spaceId === space._id);
      const problem = findBookingProblem({ space, date: data.date, slot, attendees: data.attendees ?? 1, existing, now }) ?? (absent ? "absent" : alreadyBooked ? "alreadyBooked" : null);
      return {
        spaceId: space._id,
        available: problem === null,
        reason: problem,
        cost: bookingCost(space.creditsPerHour ?? 0, slot),
        busy: existing.map(({ from, to, attendees: attendees2 }) => ({ from, to, attendees: attendees2 }))
      };
    });
  }
);

// src/bookings/createBooking.ts
var import_mongodb5 = require("mongodb");

// src/lib/locks.ts
async function lockForUpdate(session, ...keys) {
  const locks = (await getDb()).collection(COL.locks);
  for (const key of [...new Set(keys)].sort()) {
    await locks.updateOne({ _id: key }, { $inc: { n: 1 } }, { upsert: true, session });
  }
}
var spaceDayLock = (spaceId, date) => `space:${spaceId}:${date}`;
var userDayLock = (userId, date) => `user:${userId}:${date}`;

// src/bookings/createBooking.ts
var createBooking = secureCall(
  { name: "createBooking", schema: createBookingInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const slot = { from: data.from, to: data.to };
    const bookingId = new import_mongodb5.ObjectId().toHexString();
    const space = await withTransaction(async (session) => {
      await lockForUpdate(session, spaceDayLock(data.spaceId, data.date), userDayLock(uid, data.date));
      const { space: space2, site } = await loadSpace(session, data.spaceId);
      const user = await (await users()).findOne({ _id: uid }, { session });
      const sameSpace = await (await bookings()).find(spaceDayFilter(data.spaceId, data.date), { session }).toArray();
      const mine = await (await bookings()).find(userDayFilter(uid, data.date), { session }).toArray();
      const myAbsences = await (await absences()).find(userAbsencesFilter(uid), { session }).toArray();
      if (!user || user.status !== "active") throw appError("permission-denied", "forbidden", "Account is not active.");
      const problem = findBookingProblem({
        space: space2,
        date: data.date,
        slot,
        attendees: data.attendees,
        existing: sameSpace.map(toBookedSlot),
        now: nowIn(site.timeZone)
      });
      if (problem) throw appError("failed-precondition", problem, `Booking refused: ${problem}`);
      if (isWithinRanges(data.date, myAbsences)) throw appError("failed-precondition", "absent", "User is absent.");
      if (mine.some((b) => overlaps(b, slot))) {
        throw appError("failed-precondition", "alreadyBooked", "User already has a booking at that time.");
      }
      const cost = bookingCost(space2.creditsPerHour ?? 0, slot);
      const now = /* @__PURE__ */ new Date();
      const booking = {
        _id: bookingId,
        userId: uid,
        userName: user.displayName,
        teamIds: user.teamIds ?? [],
        spaceId: data.spaceId,
        spaceName: space2.name,
        siteId: space2.siteId,
        date: data.date,
        from: data.from,
        to: data.to,
        attendees: data.attendees,
        startsAt: zonedTimeToUtc(data.date, data.from, site.timeZone),
        status: "confirmed",
        credits: cost,
        cancelledBy: null,
        cancelReason: null,
        reminderSent: false,
        createdAt: now,
        updatedAt: now
      };
      await (await bookings()).insertOne(booking, { session });
      if (cost > 0) await applyCredit(uid, { amount: -cost, type: "booking", label: space2.name, bookingId }, session);
      return space2;
    });
    await writeAudit({
      actorId: uid,
      actorRole: role ?? "user",
      action: "booking.created",
      targetType: "booking",
      targetId: bookingId,
      details: { spaceId: data.spaceId, date: data.date }
    });
    await notifyUser(uid, {
      type: "bookingConfirmed",
      values: { space: space.name, date: data.date, from: formatMinutes(data.from), to: formatMinutes(data.to) },
      link: "/mes-reservations"
    });
    return { bookingId };
  }
);

// src/bookings/updateBooking.ts
var updateBooking = secureCall(
  { name: "updateBooking", schema: updateBookingInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const isAdmin = role === "admin";
    const slot = { from: data.from, to: data.to };
    const { before, spaceName } = await withTransaction(async (session) => {
      const col2 = await bookings();
      const before2 = await col2.findOne({ _id: data.bookingId }, { session });
      if (!before2) throw appError("not-found", "bookingNotFound", "Booking not found.");
      if (before2.userId !== uid && !isAdmin) throw appError("permission-denied", "forbidden", "Not your booking.");
      if (before2.status !== "confirmed" || startsInThePast(before2)) {
        throw appError("failed-precondition", "bookingNotCancellable", "Booking can no longer be changed.");
      }
      const spaceId = isAdmin && data.spaceId ? data.spaceId : before2.spaceId;
      const attendees2 = data.attendees ?? before2.attendees;
      await lockForUpdate(session, spaceDayLock(spaceId, data.date), userDayLock(before2.userId, data.date));
      const { space, site } = await loadSpace(session, spaceId);
      const sameSpace = await col2.find(spaceDayFilter(spaceId, data.date), { session }).toArray();
      const owners = await col2.find(userDayFilter(before2.userId, data.date), { session }).toArray();
      const myAbsences = await (await absences()).find(userAbsencesFilter(before2.userId), { session }).toArray();
      const others = sameSpace.filter((b) => b._id !== data.bookingId);
      const problem = findBookingProblem({ space, date: data.date, slot, attendees: attendees2, existing: others.map(toBookedSlot), now: nowIn(site.timeZone) });
      if (problem) throw appError("failed-precondition", problem, `Change refused: ${problem}`);
      if (isWithinRanges(data.date, myAbsences)) throw appError("failed-precondition", "absent", "User is absent.");
      if (owners.some((b) => b._id !== data.bookingId && overlaps(b, slot))) {
        throw appError("failed-precondition", "alreadyBooked", "User already has a booking at that time.");
      }
      const cost = bookingCost(space.creditsPerHour ?? 0, slot);
      await col2.updateOne(
        { _id: data.bookingId },
        {
          $set: {
            spaceId,
            spaceName: space.name,
            siteId: space.siteId,
            date: data.date,
            from: data.from,
            to: data.to,
            attendees: attendees2,
            credits: cost,
            startsAt: zonedTimeToUtc(data.date, data.from, site.timeZone),
            reminderSent: false,
            updatedAt: /* @__PURE__ */ new Date()
          }
        },
        { session }
      );
      const difference = cost - before2.credits;
      if (difference !== 0) {
        await applyCredit(
          before2.userId,
          { amount: -difference, type: difference > 0 ? "booking" : "refund", label: space.name, bookingId: data.bookingId },
          session
        );
      }
      return { before: before2, spaceName: space.name };
    });
    await writeAudit({
      actorId: uid,
      actorRole: role ?? "user",
      action: "booking.updated",
      targetType: "booking",
      targetId: data.bookingId,
      details: { from: { date: before.date, from: before.from, to: before.to }, to: { date: data.date, from: data.from, to: data.to } }
    });
    if (before.userId !== uid) {
      await notifyUser(before.userId, {
        type: "bookingMoved",
        values: { space: spaceName, date: data.date, from: formatMinutes(data.from), to: formatMinutes(data.to) },
        link: "/mes-reservations"
      });
    }
    return { updated: true };
  }
);

// src/bookings/absences.ts
var import_mongodb6 = require("mongodb");
var declareAbsence = secureCall(
  { name: "declareAbsence", schema: declareAbsenceInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, role, data }) => {
    if (data.from > data.to) throw appError("invalid-argument", "invalidDates", "The start date is after the end date.");
    const user = await (await users()).findOne({ _id: uid });
    const absenceId = new import_mongodb6.ObjectId().toHexString();
    const absence = {
      _id: absenceId,
      userId: uid,
      userName: user?.displayName ?? "",
      from: data.from,
      to: data.to,
      note: data.note,
      createdAt: /* @__PURE__ */ new Date()
    };
    await (await absences()).insertOne(absence);
    const cancelled = await cancelUpcomingBookings(uid, { uid, role: "system" }, "absence", { from: data.from, to: data.to });
    await writeAudit({
      actorId: uid,
      actorRole: role ?? "user",
      action: "absence.declared",
      targetType: "absence",
      targetId: absenceId,
      details: { from: data.from, to: data.to, cancelledBookings: cancelled }
    });
    return { absenceId, cancelled };
  }
);
var removeAbsence = secureCall(
  { name: "removeAbsence", schema: removeAbsenceInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const col2 = await absences();
    const absence = await col2.findOne({ _id: data.absenceId });
    if (!absence) throw appError("not-found", "bookingNotFound", "Absence not found.");
    if (absence.userId !== uid && role !== "admin") {
      throw appError("permission-denied", "forbidden", "Not your absence.");
    }
    await col2.deleteOne({ _id: data.absenceId });
    return { removed: true };
  }
);

// src/bookings/teamBookings.ts
var teamBookings = secureCall(
  { name: "teamBookings", schema: teamBookingsInput, role: "manager", rateLimit: { limit: 30, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const teamsCol2 = (await getDb()).collection(COL.teams);
    const teams = await teamsCol2.find(role === "admin" ? {} : { managerIds: uid }).toArray();
    const teamNameOf = /* @__PURE__ */ new Map();
    for (const team of teams) for (const memberId of team.memberIds) teamNameOf.set(memberId, team.name);
    const memberIds = [...teamNameOf.keys()];
    if (memberIds.length === 0) return { members: [], bookings: [] };
    const [profiles, dayBookings] = await Promise.all([
      (await users()).find({ _id: { $in: memberIds } }).toArray(),
      (await bookings()).find({ date: data.date, status: "confirmed" }).toArray()
    ]);
    const members = profiles.map((p) => ({ uid: p._id, name: p.displayName, teamName: teamNameOf.get(p._id) ?? "" })).sort((a, b) => a.name.localeCompare(b.name));
    const rows = dayBookings.filter((b) => teamNameOf.has(b.userId)).map((b) => ({ id: b._id, userId: b.userId, spaceName: b.spaceName, from: b.from, to: b.to })).sort((a, b) => a.from - b.from);
    return { members, bookings: rows };
  }
);

// src/bookings/reminders.ts
var import_scheduler2 = require("firebase-functions/v2/scheduler");
var import_v25 = require("firebase-functions/v2");
var HOUR_MS = 60 * 60 * 1e3;
var sendBookingReminders = (0, import_scheduler2.onSchedule)({ schedule: "every 1 hours", region: REGION }, async () => {
  const now = /* @__PURE__ */ new Date();
  const in24Hours = new Date(now.getTime() + 24 * HOUR_MS);
  const col2 = await bookings();
  const due = await col2.find({ status: "confirmed", reminderSent: false, startsAt: { $gt: now, $lte: in24Hours } }).toArray();
  for (const booking of due) {
    await col2.updateOne({ _id: booking._id }, { $set: { reminderSent: true } });
    await notifyUser(booking.userId, {
      type: "bookingReminder",
      values: { space: booking.spaceName, date: booking.date, from: formatMinutes(booking.from), to: formatMinutes(booking.to) },
      link: "/mes-reservations"
    });
  }
  import_v25.logger.info("Booking reminders sent", { count: due.length });
});
var sendWeeklyDigests = (0, import_scheduler2.onSchedule)({ schedule: "every monday 07:00", timeZone: "Europe/Paris", region: REGION }, async () => {
  const from = nowIn("Europe/Paris").date;
  const to = addDays(from, 6);
  const subscribers = await (await users()).find({ "notificationPrefs.weeklyDigest": true }).toArray();
  for (const user of subscribers) {
    if (user.status !== "active") continue;
    const week = await (await bookings()).find({ userId: user._id, status: "confirmed", date: { $gte: from, $lte: to } }).toArray();
    if (week.length === 0) continue;
    await notifyUser(user._id, { type: "weeklyDigest", values: { count: week.length }, link: "/mes-reservations" });
  }
});

// src/credits/credits.ts
var import_scheduler3 = require("firebase-functions/v2/scheduler");
function inOneMonth(from = /* @__PURE__ */ new Date()) {
  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}
var purchasePlan = secureCall(
  { name: "purchasePlan", schema: purchasePlanInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const plan = await getPlan(data.planId);
    if (!plan || !plan.active) throw appError("not-found", "planNotFound", "Plan not found.");
    const isSubscription = plan.kind === "subscription";
    if (isSubscription && await getActiveSubscription(uid)) {
      throw appError("failed-precondition", "alreadySubscribed", "User already has a subscription.");
    }
    await withTransaction(async (session) => {
      await applyCredit(uid, { amount: plan.credits, type: isSubscription ? "subscription" : "purchase", label: plan.name }, session);
      if (isSubscription) {
        await createSubscription(
          {
            userId: uid,
            planId: data.planId,
            planName: plan.name,
            credits: plan.credits,
            status: "active",
            nextRenewalAt: inOneMonth(),
            createdAt: /* @__PURE__ */ new Date(),
            cancelledAt: null
          },
          session
        );
      }
    });
    await writeAudit({ actorId: uid, actorRole: role ?? "user", action: "credits.purchased", targetType: "plan", targetId: data.planId });
    await notifyUser(uid, { type: "creditsAdded", values: { count: plan.credits, label: plan.name }, link: "/credits" });
    return { credits: plan.credits };
  }
);
var cancelSubscription = secureCall(
  { name: "cancelSubscription", schema: cancelSubscriptionInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, role, data }) => {
    await cancelSubscriptionById(data.subscriptionId, uid, role === "admin");
    await writeAudit({ actorId: uid, actorRole: role ?? "user", action: "subscription.cancelled", targetType: "subscription", targetId: data.subscriptionId });
    return { cancelled: true };
  }
);
var adjustCredits = secureCall(
  { name: "adjustCredits", schema: adjustCreditsInput, role: "admin", rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid: actorId, data }) => {
    await applyCredit(data.uid, { amount: data.amount, type: "adjustment", label: data.label });
    await writeAudit({
      actorId,
      actorRole: "admin",
      action: "credits.adjusted",
      targetType: "user",
      targetId: data.uid,
      details: { amount: data.amount, label: data.label }
    });
    if (data.amount > 0) {
      await notifyUser(data.uid, { type: "creditsAdded", values: { count: data.amount, label: data.label || "-" }, link: "/credits" });
    }
    return { adjusted: true };
  }
);
var renewSubscriptions = (0, import_scheduler3.onSchedule)({ schedule: "every day 03:00", timeZone: "Europe/Paris", region: REGION }, async () => {
  const due = await listDueSubscriptions(/* @__PURE__ */ new Date());
  for (const subscription of due) {
    await withTransaction(async (session) => {
      await applyCredit(subscription.userId, { amount: subscription.credits, type: "subscription", label: subscription.planName }, session);
      await setNextRenewal(subscription._id, inOneMonth(subscription.nextRenewalAt), session);
    });
    await notifyUser(subscription.userId, {
      type: "subscriptionRenewed",
      values: { count: subscription.credits, label: subscription.planName },
      link: "/credits"
    });
  }
});

// src/credits/plans.ts
function toSummary(plan) {
  return {
    id: plan._id,
    name: plan.name,
    description: plan.description,
    kind: plan.kind,
    credits: plan.credits,
    priceCents: plan.priceCents,
    active: plan.active
  };
}
var listPlans2 = secureCall({ name: "listPlans", schema: emptyInput }, async () => {
  const plans = await listPlans(true);
  return plans.map(toSummary);
});
var listAllPlans = secureCall({ name: "listAllPlans", schema: emptyInput, role: "admin" }, async () => {
  const plans = await listPlans(false);
  return plans.map(toSummary);
});
var createPlan2 = secureCall({ name: "createPlan", schema: createPlanInput, role: "admin" }, async ({ uid, data }) => {
  const plan = { name: data.name, description: data.description, kind: data.kind, credits: data.credits, priceCents: data.priceCents, active: data.active };
  const planId = await createPlan(plan);
  await writeAudit({ actorId: uid, actorRole: "admin", action: "plan.created", targetType: "plan", targetId: planId });
  return { planId };
});
var updatePlan2 = secureCall({ name: "updatePlan", schema: updatePlanInput, role: "admin" }, async ({ uid, data }) => {
  const plan = { name: data.name, description: data.description, kind: data.kind, credits: data.credits, priceCents: data.priceCents, active: data.active };
  await updatePlan(data.planId, plan);
  await writeAudit({ actorId: uid, actorRole: "admin", action: "plan.updated", targetType: "plan", targetId: data.planId });
  return { updated: true };
});
var deletePlan2 = secureCall({ name: "deletePlan", schema: deletePlanInput, role: "admin" }, async ({ uid, data }) => {
  await deletePlan(data.planId);
  await writeAudit({ actorId: uid, actorRole: "admin", action: "plan.deleted", targetType: "plan", targetId: data.planId });
  return { deleted: true };
});

// src/credits/queries.ts
function toSummary2(tx) {
  return { id: tx._id, type: tx.type, amount: tx.amount, balanceAfter: tx.balanceAfter, label: tx.label, bookingId: tx.bookingId, createdAt: tx.createdAt.toISOString() };
}
function toSubscriptionSummary(sub) {
  return {
    id: sub._id,
    planId: sub.planId,
    planName: sub.planName,
    credits: sub.credits,
    status: sub.status,
    nextRenewalAt: sub.nextRenewalAt.toISOString(),
    createdAt: sub.createdAt.toISOString(),
    cancelledAt: sub.cancelledAt ? sub.cancelledAt.toISOString() : null
  };
}
var getMyWallet = secureCall({ name: "getMyWallet", schema: emptyInput }, async ({ uid }) => {
  return { balance: await getBalance(uid) };
});
var getMyCreditHistory = secureCall({ name: "getMyCreditHistory", schema: emptyInput }, async ({ uid }) => {
  const history = await listCreditTransactions(uid);
  return history.map(toSummary2);
});
var getMySubscription = secureCall({ name: "getMySubscription", schema: emptyInput }, async ({ uid }) => {
  const sub = await getActiveSubscription(uid);
  return sub ? toSubscriptionSummary(sub) : null;
});

// src/support/incidents.ts
var import_mongodb7 = require("mongodb");

// src/support/common.ts
async function usersCol() {
  return (await getDb()).collection(COL.users);
}
async function requireActiveProfile(uid) {
  const user = await (await usersCol()).findOne({ _id: uid });
  if (!user || user.status !== "active") throw appError("permission-denied", "forbidden", "Account is not active.");
  return user;
}
async function translatorFor(uid) {
  const user = await (await usersCol()).findOne({ _id: uid });
  return createTranslator(user && isLocale(user.locale) ? user.locale : DEFAULT_LOCALE);
}

// src/support/incidents.ts
async function incidents() {
  return (await getDb()).collection(COL.incidents);
}
function toSummary3(incident) {
  return {
    id: incident._id,
    reporterId: incident.reporterId,
    reporterName: incident.reporterName,
    spaceId: incident.spaceId,
    spaceName: incident.spaceName,
    title: incident.title,
    description: incident.description,
    photoPaths: incident.photoPaths,
    status: incident.status,
    adminNote: incident.adminNote,
    createdAt: incident.createdAt.toISOString(),
    updatedAt: incident.updatedAt.toISOString()
  };
}
var createIncident = secureCall(
  { name: "createIncident", schema: createIncidentInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, data }) => {
    const reporter = await requireActiveProfile(uid);
    const ownPrefix = `${COL.incidents}/${uid}/`;
    if (data.photoPaths.some((path) => !path.startsWith(ownPrefix) || path.includes(".."))) {
      throw appError("invalid-argument", "invalidInput", "Photos must belong to the reporter.");
    }
    let space = null;
    if (data.spaceId) {
      space = await (await getDb()).collection(COL.spaces).findOne({ _id: data.spaceId });
      if (!space) throw appError("not-found", "spaceNotFound", "Space not found.");
    }
    const now = /* @__PURE__ */ new Date();
    const incident = {
      _id: new import_mongodb7.ObjectId().toHexString(),
      reporterId: uid,
      reporterName: reporter.displayName,
      spaceId: space?._id ?? null,
      spaceName: space?.name ?? null,
      title: data.title,
      description: data.description,
      photoPaths: data.photoPaths,
      status: "open",
      adminNote: "",
      createdAt: now,
      updatedAt: now
    };
    await (await incidents()).insertOne(incident);
    const admins = await (await usersCol()).find({ role: "admin", status: "active" }).toArray();
    for (const admin of admins) {
      await notifyUser(admin._id, {
        type: "incidentReceived",
        values: { title: incident.title, name: incident.reporterName },
        link: "/admin/support"
      });
    }
    return { incidentId: incident._id };
  }
);
var listMyIncidents = secureCall({ name: "listMyIncidents", schema: emptyInput }, async ({ uid }) => {
  const docs = await (await incidents()).find({ reporterId: uid }).sort({ createdAt: -1 }).limit(50).toArray();
  return docs.map(toSummary3);
});
var listAllIncidents = secureCall({ name: "listAllIncidents", schema: emptyInput, role: "admin" }, async () => {
  const docs = await (await incidents()).find({}).sort({ createdAt: -1 }).limit(100).toArray();
  return docs.map(toSummary3);
});
var updateIncidentStatus = secureCall(
  { name: "updateIncidentStatus", schema: updateIncidentStatusInput, role: "admin", rateLimit: { limit: 60, windowSec: 60 } },
  async ({ data }) => {
    const col2 = await incidents();
    const before = await col2.findOneAndUpdate(
      { _id: data.incidentId },
      { $set: { status: data.status, adminNote: data.adminNote, updatedAt: /* @__PURE__ */ new Date() } },
      { returnDocument: "before" }
    );
    if (!before) throw appError("not-found", "invalidInput", "Incident not found.");
    if (before.status !== data.status) {
      const { t } = await translatorFor(before.reporterId);
      await notifyUser(before.reporterId, {
        type: "incidentUpdated",
        values: { title: before.title, status: t(`incidentStatus.${data.status}`) },
        link: "/support"
      });
    }
    return { updated: true };
  }
);

// src/support/equipment.ts
var import_mongodb8 = require("mongodb");
async function requests() {
  return (await getDb()).collection(COL.equipmentRequests);
}
function toSummary4(request) {
  return {
    id: request._id,
    requesterId: request.requesterId,
    requesterName: request.requesterName,
    item: request.item,
    quantity: request.quantity,
    neededOn: request.neededOn,
    comment: request.comment,
    status: request.status,
    adminNote: request.adminNote,
    createdAt: request.createdAt.toISOString(),
    updatedAt: request.updatedAt.toISOString()
  };
}
var createEquipmentRequest = secureCall(
  { name: "createEquipmentRequest", schema: createEquipmentRequestInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, data }) => {
    const requester = await requireActiveProfile(uid);
    const now = /* @__PURE__ */ new Date();
    const request = {
      _id: new import_mongodb8.ObjectId().toHexString(),
      requesterId: uid,
      requesterName: requester.displayName,
      item: data.item,
      quantity: data.quantity,
      neededOn: data.neededOn,
      comment: data.comment,
      status: "pending",
      adminNote: "",
      createdAt: now,
      updatedAt: now
    };
    await (await requests()).insertOne(request);
    return { requestId: request._id };
  }
);
var listMyEquipmentRequests = secureCall({ name: "listMyEquipmentRequests", schema: emptyInput }, async ({ uid }) => {
  const docs = await (await requests()).find({ requesterId: uid }).sort({ createdAt: -1 }).limit(50).toArray();
  return docs.map(toSummary4);
});
var listAllEquipmentRequests = secureCall({ name: "listAllEquipmentRequests", schema: emptyInput, role: "admin" }, async () => {
  const docs = await (await requests()).find({}).sort({ createdAt: -1 }).limit(100).toArray();
  return docs.map(toSummary4);
});
var updateEquipmentRequestStatus = secureCall(
  { name: "updateEquipmentRequestStatus", schema: updateEquipmentRequestStatusInput, role: "admin", rateLimit: { limit: 60, windowSec: 60 } },
  async ({ data }) => {
    const before = await (await requests()).findOneAndUpdate(
      { _id: data.requestId },
      { $set: { status: data.status, adminNote: data.adminNote, updatedAt: /* @__PURE__ */ new Date() } },
      { returnDocument: "before" }
    );
    if (!before) throw appError("not-found", "invalidInput", "Equipment request not found.");
    if (before.status !== data.status) {
      const { t } = await translatorFor(before.requesterId);
      await notifyUser(before.requesterId, {
        type: "equipmentUpdated",
        values: { item: t(`items.${before.item}`), status: t(`equipmentStatus.${data.status}`) },
        link: "/support"
      });
    }
    return { updated: true };
  }
);

// src/visitors/visits.ts
var import_mongodb9 = require("mongodb");
function toSummary5(visit) {
  return {
    id: visit._id,
    siteId: visit.siteId,
    siteName: visit.siteName,
    hostUserId: visit.hostUserId,
    hostName: visit.hostName,
    guestName: visit.guestName,
    guestEmail: visit.guestEmail,
    guestCompany: visit.guestCompany,
    visitDate: visit.visitDate,
    status: visit.status,
    checkedInAt: visit.checkedInAt ? visit.checkedInAt.toISOString() : null,
    checkedOutAt: visit.checkedOutAt ? visit.checkedOutAt.toISOString() : null
  };
}
async function visits() {
  const mongo = await getDb();
  return mongo.collection(COL.visits);
}
var createVisit = secureCall(
  { name: "createVisit", schema: createVisitInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, data }) => {
    const mongo = await getDb();
    const [user, site] = await Promise.all([
      mongo.collection(COL.users).findOne({ _id: uid }),
      mongo.collection(COL.sites).findOne({ _id: data.siteId })
    ]);
    if (!user || user.status !== "active") throw appError("permission-denied", "forbidden", "Account is not active.");
    if (!site) throw appError("not-found", "spaceNotFound", "Site not found.");
    const now = /* @__PURE__ */ new Date();
    const visit = {
      _id: new import_mongodb9.ObjectId().toHexString(),
      siteId: data.siteId,
      siteName: site.name,
      hostUserId: uid,
      hostName: user.displayName,
      guestName: data.guestName.trim(),
      guestEmail: data.guestEmail ?? null,
      guestCompany: data.guestCompany ?? null,
      visitDate: data.visitDate,
      status: "expected",
      checkedInAt: null,
      checkedOutAt: null,
      createdAt: now,
      updatedAt: now
    };
    await (await visits()).insertOne(visit);
    return { visitId: visit._id };
  }
);
var getMyVisits = secureCall({ name: "getMyVisits", schema: emptyInput }, async ({ uid }) => {
  const docs = await (await visits()).find({ hostUserId: uid }).sort({ visitDate: -1 }).limit(100).toArray();
  return docs.map(toSummary5);
});
var cancelVisit = secureCall(
  { name: "cancelVisit", schema: visitIdInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const col2 = await visits();
    const visit = await col2.findOne({ _id: data.visitId });
    if (!visit) throw appError("not-found", "visitNotFound", "Visit not found.");
    if (visit.hostUserId !== uid && role !== "admin") throw appError("permission-denied", "forbidden", "Not your invite.");
    if (visit.status !== "expected") throw appError("failed-precondition", "invalidVisitStatus", "Visit can no longer be cancelled.");
    await col2.updateOne({ _id: data.visitId }, { $set: { status: "cancelled", updatedAt: /* @__PURE__ */ new Date() } });
    return { cancelled: true };
  }
);
var listVisitsForDay = secureCall({ name: "listVisitsForDay", schema: listVisitsForDayInput, role: "admin" }, async ({ data }) => {
  const docs = await (await visits()).find({ visitDate: data.date, status: { $ne: "cancelled" } }).sort({ guestName: 1 }).limit(200).toArray();
  return docs.map(toSummary5);
});
var checkInVisit = secureCall({ name: "checkInVisit", schema: visitIdInput, role: "admin" }, async ({ uid, data }) => {
  const col2 = await visits();
  const visit = await col2.findOne({ _id: data.visitId });
  if (!visit) throw appError("not-found", "visitNotFound", "Visit not found.");
  if (visit.status !== "expected") throw appError("failed-precondition", "invalidVisitStatus", "Visit is not expected.");
  const checkedInAt = /* @__PURE__ */ new Date();
  await col2.updateOne({ _id: data.visitId }, { $set: { status: "checkedIn", checkedInAt, updatedAt: checkedInAt } });
  await writeAudit({ actorId: uid, actorRole: "admin", action: "visit.checkedIn", targetType: "visit", targetId: data.visitId });
  await notifyUser(visit.hostUserId, { type: "visitorArrived", values: { guest: visit.guestName }, link: "/visiteurs" });
  return { checkedIn: true };
});
var checkOutVisit = secureCall({ name: "checkOutVisit", schema: visitIdInput, role: "admin" }, async ({ uid, data }) => {
  const col2 = await visits();
  const visit = await col2.findOne({ _id: data.visitId });
  if (!visit) throw appError("not-found", "visitNotFound", "Visit not found.");
  if (visit.status !== "checkedIn") throw appError("failed-precondition", "invalidVisitStatus", "Visit is not checked in.");
  const checkedOutAt = /* @__PURE__ */ new Date();
  await col2.updateOne({ _id: data.visitId }, { $set: { status: "checkedOut", checkedOutAt, updatedAt: checkedOutAt } });
  await writeAudit({ actorId: uid, actorRole: "admin", action: "visit.checkedOut", targetType: "visit", targetId: data.visitId });
  return { checkedOut: true };
});

// src/api/common.ts
async function col(name) {
  return (await getDb()).collection(name);
}
var usersCol2 = () => col(COL.users);
var teamsCol = () => col(COL.teams);
var departmentsCol = () => col(COL.departments);
var sitesCol = () => col(COL.sites);
var spacesCol = () => col(COL.spaces);
var notificationsCol = () => col(COL.notifications);
var isoOrNull = (date) => date ? date.toISOString() : null;
function toUserSummary(user) {
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
    createdAt: user.createdAt.toISOString()
  };
}
function toSiteSummary(site) {
  return {
    id: site._id,
    name: site.name,
    address: site.address,
    timeZone: site.timeZone,
    floors: site.floors,
    defaultOpeningHours: site.defaultOpeningHours
  };
}
function toSpaceSummary(space) {
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
    createdAt: space.createdAt.toISOString(),
    updatedAt: space.updatedAt.toISOString()
  };
}
function toTeamSummary(team) {
  return {
    id: team._id,
    name: team.name,
    departmentId: team.departmentId,
    managerIds: team.managerIds,
    memberIds: team.memberIds
  };
}
function toBookingSummary(booking) {
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
    createdAt: booking.createdAt.toISOString(),
    updatedAt: booking.updatedAt.toISOString()
  };
}
function toAbsenceSummary(absence) {
  return {
    id: absence._id,
    userId: absence.userId,
    userName: absence.userName,
    from: absence.from,
    to: absence.to,
    note: absence.note,
    createdAt: absence.createdAt.toISOString()
  };
}
function toNotificationSummary(notification) {
  return {
    id: notification._id,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    link: notification.link,
    readAt: isoOrNull(notification.readAt),
    createdAt: notification.createdAt.toISOString()
  };
}

// src/api/profile.ts
var getMyProfile = secureCall({ name: "getMyProfile", schema: emptyInput }, async ({ uid }) => {
  const user = await (await usersCol2()).findOne({ _id: uid });
  return user ? toUserSummary(user) : null;
});
var updateMyProfile = secureCall(
  { name: "updateMyProfile", schema: updateMyProfileInput, rateLimit: { limit: 30, windowSec: 60 } },
  async ({ uid, data }) => {
    await requireActiveProfile(uid);
    const set = {};
    if (data.displayName !== void 0) set.displayName = data.displayName;
    if (data.notificationPrefs !== void 0) set.notificationPrefs = data.notificationPrefs;
    if (data.locale !== void 0) set.locale = data.locale;
    const result = await (await usersCol2()).updateOne({ _id: uid }, { $set: set });
    if (result.matchedCount === 0) throw appError("not-found", "userNotFound", "User not found.");
    return { updated: true };
  }
);
var registerDevice = secureCall(
  { name: "registerDevice", schema: registerDeviceInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, data }) => {
    await requireActiveProfile(uid);
    const devices = await col(COL.devices);
    await devices.updateOne(
      { _id: data.fcmToken },
      {
        $set: {
          userId: uid,
          fcmToken: data.fcmToken,
          platform: data.platform,
          userAgent: data.userAgent,
          lastSeenAt: /* @__PURE__ */ new Date()
        }
      },
      { upsert: true }
    );
    return { registered: true };
  }
);

// src/api/reference.ts
var import_mongodb10 = require("mongodb");
var ADMIN_WRITE = { rateLimit: { limit: 60, windowSec: 60 } };
var notFoundSite = () => appError("not-found", "spaceNotFound", "Site not found.");
var notFoundSpace = () => appError("not-found", "spaceNotFound", "Space not found.");
var notFoundTeam = () => appError("not-found", "invalidInput", "Team not found.");
var notFoundDepartment = () => appError("not-found", "invalidInput", "Department not found.");
var listSites = secureCall({ name: "listSites", schema: emptyInput }, async () => {
  const docs = await (await sitesCol()).find({}).sort({ name: 1 }).toArray();
  return docs.map(toSiteSummary);
});
var listSpaces = secureCall({ name: "listSpaces", schema: listSpacesInput }, async ({ data }) => {
  const docs = await (await spacesCol()).find(data.siteId ? { siteId: data.siteId } : {}).sort({ name: 1 }).toArray();
  return docs.map(toSpaceSummary);
});
var createSite = secureCall({ name: "createSite", schema: createSiteInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const siteId = new import_mongodb10.ObjectId().toHexString();
  await (await sitesCol()).insertOne({ _id: siteId, ...data });
  return { siteId };
});
var updateSite = secureCall({ name: "updateSite", schema: updateSiteInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const { siteId, ...fields } = data;
  const result = await (await sitesCol()).updateOne({ _id: siteId }, { $set: fields });
  if (result.matchedCount === 0) throw notFoundSite();
  return { updated: true };
});
var deleteSite = secureCall({ name: "deleteSite", schema: deleteSiteInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const hasSpaces = await (await spacesCol()).countDocuments({ siteId: data.siteId }, { limit: 1 });
  if (hasSpaces > 0) throw appError("failed-precondition", "invalidInput", "This site still has spaces: delete them first.");
  const result = await (await sitesCol()).deleteOne({ _id: data.siteId });
  if (result.deletedCount === 0) throw notFoundSite();
  return { deleted: true };
});
var createSpace = secureCall({ name: "createSpace", schema: createSpaceInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  if (!await (await sitesCol()).findOne({ _id: data.siteId }, { projection: { _id: 1 } })) throw notFoundSite();
  const now = /* @__PURE__ */ new Date();
  const spaceId = new import_mongodb10.ObjectId().toHexString();
  await (await spacesCol()).insertOne({ _id: spaceId, ...data, createdAt: now, updatedAt: now });
  return { spaceId };
});
var updateSpace = secureCall({ name: "updateSpace", schema: updateSpaceInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const { spaceId, ...fields } = data;
  if (!await (await sitesCol()).findOne({ _id: fields.siteId }, { projection: { _id: 1 } })) throw notFoundSite();
  const result = await (await spacesCol()).updateOne({ _id: spaceId }, { $set: { ...fields, updatedAt: /* @__PURE__ */ new Date() } });
  if (result.matchedCount === 0) throw notFoundSpace();
  return { updated: true };
});
var deleteSpace = secureCall({ name: "deleteSpace", schema: deleteSpaceInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const result = await (await spacesCol()).deleteOne({ _id: data.spaceId });
  if (result.deletedCount === 0) throw notFoundSpace();
  return { deleted: true };
});
var listDepartments = secureCall({ name: "listDepartments", schema: emptyInput }, async () => {
  const docs = await (await departmentsCol()).find({}).sort({ name: 1 }).toArray();
  return docs.map((d) => ({ id: d._id, name: d.name }));
});
var listMyTeams = secureCall({ name: "listMyTeams", schema: emptyInput }, async ({ uid }) => {
  const docs = await (await teamsCol()).find({ memberIds: uid }).sort({ name: 1 }).toArray();
  return docs.map(toTeamSummary);
});
var listTeams = secureCall({ name: "listTeams", schema: emptyInput, role: "admin" }, async () => {
  const docs = await (await teamsCol()).find({}).sort({ name: 1 }).toArray();
  return docs.map(toTeamSummary);
});
var createDepartment = secureCall({ name: "createDepartment", schema: createDepartmentInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const departmentId = new import_mongodb10.ObjectId().toHexString();
  await (await departmentsCol()).insertOne({ _id: departmentId, name: data.name });
  return { departmentId };
});
var updateDepartment = secureCall({ name: "updateDepartment", schema: updateDepartmentInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const result = await (await departmentsCol()).updateOne({ _id: data.departmentId }, { $set: { name: data.name } });
  if (result.matchedCount === 0) throw notFoundDepartment();
  return { updated: true };
});
var deleteDepartment = secureCall({ name: "deleteDepartment", schema: deleteDepartmentInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const result = await (await departmentsCol()).deleteOne({ _id: data.departmentId });
  if (result.deletedCount === 0) throw notFoundDepartment();
  return { deleted: true };
});
var createTeam = secureCall({ name: "createTeam", schema: createTeamInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const teamId = new import_mongodb10.ObjectId().toHexString();
  await (await teamsCol()).insertOne({ _id: teamId, ...data, memberIds: [] });
  return { teamId };
});
var updateTeam = secureCall({ name: "updateTeam", schema: updateTeamInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const { teamId, ...fields } = data;
  const result = await (await teamsCol()).updateOne({ _id: teamId }, { $set: fields });
  if (result.matchedCount === 0) throw notFoundTeam();
  return { updated: true };
});
var deleteTeam = secureCall({ name: "deleteTeam", schema: deleteTeamInput, role: "admin", ...ADMIN_WRITE }, async ({ data }) => {
  const result = await (await teamsCol()).deleteOne({ _id: data.teamId });
  if (result.deletedCount === 0) throw notFoundTeam();
  return { deleted: true };
});

// src/api/bookings-read.ts
var listMyBookings = secureCall(
  { name: "listMyBookings", schema: listMyBookingsInput },
  async ({ uid, data }) => {
    const docs = await (await bookings()).find({ userId: uid }).sort({ date: -1, from: -1 }).limit(data.limit).toArray();
    return docs.map(toBookingSummary);
  }
);
var listMyUpcomingBookings = secureCall(
  { name: "listMyUpcomingBookings", schema: listMyUpcomingBookingsInput },
  async ({ uid, data }) => {
    const docs = await (await bookings()).find({ userId: uid, status: "confirmed", date: { $gte: data.fromDate } }).sort({ date: 1, from: 1 }).limit(10).toArray();
    return docs.map(toBookingSummary);
  }
);
var listBookingsInRange = secureCall(
  { name: "listBookingsInRange", schema: listBookingsInRangeInput, role: "admin", rateLimit: { limit: 30, windowSec: 60 } },
  async ({ data }) => {
    const docs = await (await bookings()).find({ date: { $gte: data.from, $lte: data.to } }).sort({ date: 1, from: 1 }).limit(data.limit).toArray();
    return docs.map(toBookingSummary);
  }
);

// src/api/absences.ts
var listMyAbsences = secureCall({ name: "listMyAbsences", schema: emptyInput }, async ({ uid }) => {
  const docs = await (await absences()).find(userAbsencesFilter(uid)).sort({ from: -1 }).limit(200).toArray();
  return docs.map(toAbsenceSummary);
});

// src/api/notifications.ts
var listMyNotifications = secureCall(
  { name: "listMyNotifications", schema: listMyNotificationsInput },
  async ({ uid, data }) => {
    const filter = data.unreadOnly ? { userId: uid, readAt: null } : { userId: uid };
    const docs = await (await notificationsCol()).find(filter).sort({ createdAt: -1 }).limit(data.limit).toArray();
    return docs.map(toNotificationSummary);
  }
);
var markNotificationRead = secureCall(
  { name: "markNotificationRead", schema: markNotificationReadInput, rateLimit: { limit: 120, windowSec: 60 } },
  async ({ uid, data }) => {
    const result = await (await notificationsCol()).updateOne(
      { _id: data.notificationId, userId: uid, readAt: null },
      { $set: { readAt: /* @__PURE__ */ new Date() } }
    );
    return { marked: result.modifiedCount === 1 };
  }
);
var markAllNotificationsRead = secureCall(
  { name: "markAllNotificationsRead", schema: emptyInput, rateLimit: { limit: 30, windowSec: 60 } },
  async ({ uid }) => {
    const result = await (await notificationsCol()).updateMany({ userId: uid, readAt: null }, { $set: { readAt: /* @__PURE__ */ new Date() } });
    return { marked: result.modifiedCount };
  }
);

// src/api/admin-users.ts
var listUsers = secureCall(
  { name: "listUsers", schema: listUsersInput, role: "admin", rateLimit: { limit: 60, windowSec: 60 } },
  async ({ data }) => {
    const filters = [];
    if (data.roles && data.roles.length > 0) filters.push({ role: { $in: data.roles } });
    if (data.after) {
      const { displayName, id } = data.after;
      filters.push({ $or: [{ displayName: { $gt: displayName } }, { displayName, _id: { $gt: id } }] });
    }
    const docs = await (await usersCol2()).find(filters.length > 0 ? { $and: filters } : {}).sort({ displayName: 1, _id: 1 }).limit(data.limit).toArray();
    const last = docs.at(-1);
    return {
      users: docs.map(toUserSummary),
      next: docs.length === data.limit && last ? { displayName: last.displayName, id: last._id } : null
    };
  }
);

// src/api/audit.ts
var listAuditLogs = secureCall(
  { name: "listAuditLogs", schema: listAuditLogsInput, role: "admin", rateLimit: { limit: 60, windowSec: 60 } },
  async ({ data }) => {
    const auditLogs = await col(COL.auditLogs);
    const docs = await auditLogs.find(data.action ? { action: data.action } : {}).sort({ createdAt: -1 }).limit(data.limit).toArray();
    const userIds = /* @__PURE__ */ new Set();
    for (const doc of docs) {
      if (doc.actorId !== "system") userIds.add(doc.actorId);
      if (doc.targetType === "user") userIds.add(doc.targetId);
    }
    const names = /* @__PURE__ */ new Map();
    if (userIds.size > 0) {
      const users2 = await col(COL.users);
      for (const user of await users2.find({ _id: { $in: [...userIds] } }, { projection: { displayName: 1 } }).toArray()) {
        names.set(user._id, user.displayName);
      }
    }
    return docs.map((doc) => ({
      id: doc._id,
      actorId: doc.actorId,
      actorName: doc.actorId === "system" ? "system" : names.get(doc.actorId) ?? doc.actorId,
      actorRole: doc.actorRole,
      action: doc.action,
      targetType: doc.targetType,
      targetId: doc.targetId,
      targetName: doc.targetType === "user" ? names.get(doc.targetId) ?? doc.targetId : null,
      details: doc.details,
      createdAt: doc.createdAt.toISOString()
    }));
  }
);

// src/api/stats.ts
var confirmedInRange = (from, to) => ({ status: "confirmed", date: { $gte: from, $lte: to } });
var STATS_POLICY = { rateLimit: { limit: 30, windowSec: 60 } };
var getBookingTotals = secureCall({ name: "getBookingTotals", schema: dateRangeInput, role: "admin", ...STATS_POLICY }, async ({ data }) => {
  const rows = await (await bookings()).aggregate([
    { $match: { date: { $gte: data.from, $lte: data.to } } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        minutes: { $sum: { $subtract: ["$to", "$from"] } },
        credits: { $sum: "$credits" },
        users: { $addToSet: "$userId" }
      }
    }
  ]).toArray();
  const confirmed = rows.find((r) => r._id === "confirmed");
  const cancelled = rows.find((r) => r._id === "cancelled");
  return {
    confirmed: confirmed?.count ?? 0,
    cancelled: cancelled?.count ?? 0,
    hours: (confirmed?.minutes ?? 0) / 60,
    credits: confirmed?.credits ?? 0,
    users: confirmed?.users.length ?? 0
  };
});
var getBookingsPerDay = secureCall({ name: "getBookingsPerDay", schema: dateRangeInput, role: "admin", ...STATS_POLICY }, async ({ data }) => {
  const rows = await (await bookings()).aggregate([
    { $match: confirmedInRange(data.from, data.to) },
    { $group: { _id: "$date", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]).toArray();
  return rows.map((r) => ({ date: r._id, count: r.count }));
});
var getHoursPerCategory = secureCall({ name: "getHoursPerCategory", schema: dateRangeInput, role: "admin", ...STATS_POLICY }, async ({ data }) => {
  const perSpace = await (await bookings()).aggregate([
    { $match: confirmedInRange(data.from, data.to) },
    { $group: { _id: "$spaceId", minutes: { $sum: { $subtract: ["$to", "$from"] } } } }
  ]).toArray();
  const categoryOf = /* @__PURE__ */ new Map();
  const spaceDocs = await (await spaces()).find({ _id: { $in: perSpace.map((r) => r._id) } }, { projection: { category: 1 } }).toArray();
  for (const space of spaceDocs) categoryOf.set(space._id, space.category);
  const minutesByCategory = /* @__PURE__ */ new Map();
  for (const row of perSpace) {
    const category = categoryOf.get(row._id);
    if (category) minutesByCategory.set(category, (minutesByCategory.get(category) ?? 0) + row.minutes);
  }
  return SPACE_CATEGORIES.filter((c) => minutesByCategory.has(c)).map((c) => ({ category: c, hours: (minutesByCategory.get(c) ?? 0) / 60 }));
});
var getTopSpaces = secureCall({ name: "getTopSpaces", schema: dateRangeInput, role: "admin", ...STATS_POLICY }, async ({ data }) => {
  const rows = await (await bookings()).aggregate([
    { $match: confirmedInRange(data.from, data.to) },
    { $group: { _id: "$spaceName", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: 5 }
  ]).toArray();
  return rows.map((r) => ({ name: r._id, count: r.count }));
});

// src/ai/chatWithAssistant.ts
var import_ai = require("ai");
var import_https3 = require("firebase-functions/v2/https");
var import_v26 = require("firebase-functions/v2");

// src/ai/gemini.ts
var import_google = require("@ai-sdk/google");
var MODEL_ID = "gemini-3.5-flash-lite";
function geminiModel() {
  const google = (0, import_google.createGoogleGenerativeAI)({ apiKey: GOOGLE_GENERATIVE_AI_API_KEY.value() });
  return google(MODEL_ID);
}

// src/ai/chatWithAssistant.ts
var SYSTEM_PROMPT = `You are the in-app assistant of a workspace-booking PWA (desks, meeting rooms and
coworking spaces, paid with credits bought as packs or monthly subscriptions). Help users find and
book a space, explain credits, plans, equipment requests and incident reports, and answer general
questions about using the app. You cannot look up a user's real bookings or balance or perform any
action yourself: point them to the relevant screen (R\xE9server, Mes r\xE9servations, Cr\xE9dits, Support).
Reply in the same language the user writes in (French or English), concisely (a few sentences).`;
var chatWithAssistant = (0, import_https3.onCall)(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [GOOGLE_GENERATIVE_AI_API_KEY, MONGODB_URI] },
  async (request, response) => {
    const { data } = await authorize(request, {
      name: "chatWithAssistant",
      schema: chatWithAssistantInput,
      rateLimit: { limit: 15, windowSec: 60 }
    });
    try {
      const result = (0, import_ai.streamText)({
        model: geminiModel(),
        system: SYSTEM_PROMPT,
        messages: data.messages
      });
      for await (const delta of result.textStream) {
        await response?.sendChunk(delta);
      }
      return { reply: await result.text };
    } catch (err) {
      import_v26.logger.error("chatWithAssistant failed", { err });
      throw appError("internal", "assistantUnavailable", "Gemini request failed.");
    }
  }
);

// src/ai/generatePlanDescription.ts
var import_ai2 = require("ai");
var import_v27 = require("firebase-functions/v2");
var LANGUAGE_NAMES = { fr: "French", en: "English" };
var generatePlanDescription = secureCall(
  {
    name: "generatePlanDescription",
    schema: generatePlanDescriptionInput,
    role: "admin",
    rateLimit: { limit: 20, windowSec: 60 },
    secrets: [GOOGLE_GENERATIVE_AI_API_KEY, MONGODB_URI]
  },
  async ({ data }) => {
    try {
      const { text } = await (0, import_ai2.generateText)({
        model: geminiModel(),
        prompt: `Generate a short, catchy description (1-2 sentences max) for a workspace-booking credit plan named "${data.name.trim()}". Highlight the value for an employee booking desks and meeting rooms. Write it in ${LANGUAGE_NAMES[data.locale ?? DEFAULT_LOCALE]}. Return only the plain description text, no quotes or markdown.`
      });
      return { description: text.trim() };
    } catch (err) {
      import_v27.logger.error("generatePlanDescription failed", { err });
      throw appError("internal", "assistantUnavailable", "Gemini request failed.");
    }
  }
);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  adjustCredits,
  anonymizeUser,
  bootstrapProfile,
  cancelBooking,
  cancelSubscription,
  cancelVisit,
  chatWithAssistant,
  checkInVisit,
  checkOutVisit,
  createBooking,
  createDepartment,
  createEquipmentRequest,
  createIncident,
  createPlan,
  createSite,
  createSpace,
  createTeam,
  createVisit,
  declareAbsence,
  deleteDepartment,
  deleteMyAccount,
  deletePlan,
  deleteSite,
  deleteSpace,
  deleteTeam,
  directorySyncScheduled,
  exportMyData,
  generatePlanDescription,
  getBookingTotals,
  getBookingsPerDay,
  getHoursPerCategory,
  getMyCreditHistory,
  getMyProfile,
  getMySubscription,
  getMyVisits,
  getMyWallet,
  getTopSpaces,
  listAllEquipmentRequests,
  listAllIncidents,
  listAllPlans,
  listAuditLogs,
  listBookingsInRange,
  listDepartments,
  listMyAbsences,
  listMyBookings,
  listMyEquipmentRequests,
  listMyIncidents,
  listMyNotifications,
  listMyTeams,
  listMyUpcomingBookings,
  listPlans,
  listSites,
  listSpaces,
  listTeams,
  listUsers,
  listVisitsForDay,
  markAllNotificationsRead,
  markNotificationRead,
  purchasePlan,
  registerDevice,
  removeAbsence,
  renewSubscriptions,
  runDirectorySyncNow,
  searchSpaces,
  sendBookingReminders,
  sendWeeklyDigests,
  setUserRole,
  teamBookings,
  updateBooking,
  updateDepartment,
  updateEquipmentRequestStatus,
  updateIncidentStatus,
  updateMyProfile,
  updatePlan,
  updateSite,
  updateSpace,
  updateTeam,
  updateUserOrg
});
//# sourceMappingURL=index.js.map