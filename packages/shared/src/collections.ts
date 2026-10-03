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
  rateLimits: "_rateLimits",
} as const;
