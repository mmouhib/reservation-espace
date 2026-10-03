export const ROLES = ["user", "manager", "admin"] as const;
export type Role = (typeof ROLES)[number];

/** Default role for any authenticated user without a `role` custom claim. */
export const DEFAULT_ROLE: Role = "user";

const RANK: Record<Role, number> = { user: 0, manager: 1, admin: 2 };

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

/** Reads the role from decoded token claims, falling back to the default role. */
export function roleFromClaims(claims: Record<string, unknown> | null | undefined): Role {
  const role = claims?.role;
  return isRole(role) ? role : DEFAULT_ROLE;
}

/** Roles are hierarchical: admin ⊇ manager ⊇ user. */
export function hasRole(actual: Role, required: Role): boolean {
  return RANK[actual] >= RANK[required];
}
