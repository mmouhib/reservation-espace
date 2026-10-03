import { db } from "../lib/admin";

/**
 * Source of truth for employment status (LDAP, SCIM, HR system…).
 * Only a stub is implemented; plug a real provider in `getDirectoryProvider`.
 */
export interface DirectoryProvider {
  /** Lower-cased emails of people who no longer work for the company. */
  listDepartedEmails(): Promise<string[]>;
}

/**
 * Stub for development and demos: reads `config/directoryStub.departedEmails`.
 * The seed script populates it with one departed employee.
 */
export class StubDirectoryProvider implements DirectoryProvider {
  async listDepartedEmails(): Promise<string[]> {
    const snap = await db.collection("config").doc("directoryStub").get();
    const emails = (snap.get("departedEmails") as string[] | undefined) ?? [];
    return emails.map((e) => e.toLowerCase());
  }
}

// Placeholder for the real implementation (e.g. ldapts against the corporate directory).
// export class LdapDirectoryProvider implements DirectoryProvider { ... }

export function getDirectoryProvider(): DirectoryProvider {
  return new StubDirectoryProvider();
}
