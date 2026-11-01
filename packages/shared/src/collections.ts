/** MongoDB collection names, shared by the web app, the server and the seed script. */
export const COL = {
  users: "users",
  devices: "devices", // Web Push subscriptions
  notifications: "notifications",
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
  locks: "_locks", // one document per booking day of a space or a user, see server/src/lib/locks.ts
  visits: "visits",
  payments: "payments", // one document per Stripe payment that was turned into credits
  jobRuns: "_jobRuns", // one document per run of a scheduled job, see server/src/lib/jobs.ts
  photos: "incidentPhotos", // GridFS bucket (files and chunks): photos attached to incidents
} as const;
