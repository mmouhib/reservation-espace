import { z } from "zod";
import { ROLES } from "./roles";

/** Input schemas for callable Cloud Functions. Validated on the server, reused for client forms. */

export const setUserRoleInput = z.object({
  uid: z.string().min(1).max(128),
  role: z.enum(ROLES),
});
export type SetUserRoleInput = z.infer<typeof setUserRoleInput>;

export const bootstrapProfileInput = z.object({}).strict();
export type BootstrapProfileInput = z.infer<typeof bootstrapProfileInput>;

export interface BootstrapProfileResult {
  created: boolean;
  /** True when custom claims were changed and the client must refresh its ID token. */
  claimsChanged: boolean;
}
