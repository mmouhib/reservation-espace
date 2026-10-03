import { describe, expect, it } from "vitest";
import { hasRole, isRole, roleFromClaims } from "./roles";

describe("roles", () => {
  it("recognises valid roles only", () => {
    expect(isRole("admin")).toBe(true);
    expect(isRole("superadmin")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });

  it("defaults to 'user' when the claim is missing or invalid", () => {
    expect(roleFromClaims(null)).toBe("user");
    expect(roleFromClaims({})).toBe("user");
    expect(roleFromClaims({ role: "root" })).toBe("user");
    expect(roleFromClaims({ role: "manager" })).toBe("manager");
  });

  it("is hierarchical", () => {
    expect(hasRole("admin", "manager")).toBe(true);
    expect(hasRole("manager", "user")).toBe(true);
    expect(hasRole("manager", "admin")).toBe(false);
    expect(hasRole("user", "manager")).toBe(false);
  });
});
