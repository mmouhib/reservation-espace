/**
 * Creates an administrator, or makes an existing account one. Administrators never come from Google
 * sign-in (which only creates regular users): they sign in with their email and password.
 *
 *   npm run create-admin -- boss@yourcompany.com                       (a password is generated and shown once)
 *   npm run create-admin -- boss@yourcompany.com --password "..."      (at least 12 characters)
 *   npm run create-admin -- boss@yourcompany.com --production          (the real Firebase project)
 *
 * Without --production it uses server/.env.local (the Auth emulator). With it, server/.env.production.local:
 * the real project, through the service account key. The profile is created when they first sign in.
 */
import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const email = args.find((arg) => !arg.startsWith("--"))?.trim().toLowerCase();
const passwordIndex = args.indexOf("--password");
const given = passwordIndex >= 0 ? args[passwordIndex + 1] : undefined;
const production = args.includes("--production");

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  throw new Error('Usage: npm run create-admin -- <email> [--password "<12+ characters>"] [--production]');
}
if (given !== undefined && given.length < 12) throw new Error("The password must have at least 12 characters.");

const envFile = resolve(import.meta.dirname, "../server", production ? ".env.production.local" : ".env.local");
if (!existsSync(envFile)) throw new Error(`${envFile} does not exist.`);
process.loadEnvFile(envFile);

async function main() {
  // Loaded after the environment: the server's own Firebase setup (emulator or service account).
  const { auth } = await import("../server/src/lib/admin");

  const existing = await auth.getUserByEmail(email!).catch(() => null);
  let password = given;
  let uid: string;
  if (existing) {
    uid = existing.uid;
    await auth.updateUser(uid, { emailVerified: true, disabled: false, ...(given ? { password: given } : {}) });
  } else {
    password ??= randomBytes(15).toString("base64url");
    uid = (await auth.createUser({ email, password, emailVerified: true })).uid;
  }
  await auth.setCustomUserClaims(uid, { ...(existing?.customClaims ?? {}), role: "admin" });

  console.log(`${email} is an administrator (${production ? "real project" : "emulator"}).`);
  if (password && password !== given) console.log(`Password (shown once, change it after the first sign-in): ${password}`);
  else if (!existing && given) console.log("Password: the one you gave.");
  else if (existing && !given) console.log("Their existing password is unchanged.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
