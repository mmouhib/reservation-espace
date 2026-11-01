/** MongoDB collection names, shared by the web app, the Cloud Functions and the seed script. */
export const COL = {
  users: "users",
  devices: "devices", // users/{uid}/devices
  notifications: "notifications", // users/{uid}/notifications
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
  locks: "_locks", // one document per booking day of a space or a user, see functions/src/lib/locks.ts
  visits: "visits",
} as const;
