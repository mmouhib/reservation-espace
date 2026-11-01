/** Firestore collection names, shared by the web app, Cloud Functions, rules tests and the seed script. */
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
  mail: "mail", // read by the Firebase "Trigger Email" extension
  rateLimits: "_rateLimits", // MongoDB
  locks: "_locks", // MongoDB: one document per booking day of a space or a user, see functions/src/lib/locks.ts
  visits: "visits", // MongoDB (new module, never on Firestore)
} as const;
