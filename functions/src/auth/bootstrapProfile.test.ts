import { describe, expect, it, vi } from "vitest";

// Avoid initialising the Admin SDK when importing the module under test.
vi.mock("../lib/admin", () => ({ auth: {}, db: {} }));

const { isEmailAllowed } = await import("./bootstrapProfile");

describe("isEmailAllowed", () => {
  it("allows any email when no domain is configured", () => {
    expect(isEmailAllowed("someone@gmail.com", [])).toBe(true);
  });

  it("only allows configured domains, case-insensitively", () => {
    expect(isEmailAllowed("Alice@Exemple.fr", ["exemple.fr"])).toBe(true);
    expect(isEmailAllowed("mallory@evil.com", ["exemple.fr"])).toBe(false);
    expect(isEmailAllowed("not-an-email", ["exemple.fr"])).toBe(false);
  });
});
