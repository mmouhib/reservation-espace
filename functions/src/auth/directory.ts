import { getDb } from "../lib/mongo";

/**
 * Source of truth for employment status (LDAP, SCIM, HR system).
 * Only a stub is implemented; plug a real provider in `getDirectoryProvider`.
 */
export interface DirectoryProvider {
  /** Lower-cased emails of people who no longer work for the company. */
  listDepartedEmails(): Promise<string[]>;
}

type DirectoryStubDoc = { _id: string; departedEmails?: string[] };

/**
 * Stub for development and demos: reads the `config` document `directoryStub`
 * (field `departedEmails`). The seed script populates it with one departed employee.
 */
export class StubDirectoryProvider implements DirectoryProvider {
  async listDepartedEmails(): Promise<string[]> {
    const db = await getDb();
    const doc = await db.collection<DirectoryStubDoc>("config").findOne({ _id: "directoryStub" });
    const emails = doc?.departedEmails ?? [];
    return emails.map((e) => e.toLowerCase());
  }
}

// Placeholder for the real implementation (e.g. ldapts against the corporate directory).
// export class LdapDirectoryProvider implements DirectoryProvider { ... }

export function getDirectoryProvider(): DirectoryProvider {
  return new StubDirectoryProvider();
}
