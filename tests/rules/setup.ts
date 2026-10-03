import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import type { Role } from "@reservation/shared";

export const PROJECT_ID = "demo-reservation-rules";

export async function createTestEnv(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: readFileSync(resolve(__dirname, "../../firebase/firestore.rules"), "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });
}

/** Authenticated Firestore client with a role claim (or none, for a non-bootstrapped account). */
export function dbAs(env: RulesTestEnvironment, uid: string, role?: Role) {
  return env.authenticatedContext(uid, role ? { role, email: `${uid}@exemple.fr` } : { email: `${uid}@gmail.com` }).firestore();
}
