/**
 * Checks the configuration before a production deployment: a web build made for the emulators, the demo
 * Firebase project, a server that lets anyone sign in, or one pointed at the development database.
 * It only reads files and environment variables, so it needs no network and no account.
 *
 *   npm run build
 *   node --env-file=server/.env.production.local scripts/production-check.mjs [project-root]
 *
 * The server's settings are read from the environment (the values you give your host), and from
 * server/.env.production.local when it exists (git-ignored: a convenient place to keep them while checking).
 * The check cannot see the host, Atlas or the Firebase console: those are listed at the end.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2] ?? join(import.meta.dirname, ".."));

/** KEY=VALUE lines of a .env file (comments and surrounding quotes removed). null when the file does not exist. */
function readEnvFile(path) {
  if (!existsSync(path)) return null;
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !line.trim().startsWith("#")) values[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return values;
}

/** The value of each key from the first file that defines it, like Next.js does. Files listed first win. */
function loadEnv(dir, fileNames) {
  const env = {};
  for (const name of fileNames) {
    for (const [key, value] of Object.entries(readEnvFile(join(root, dir, name)) ?? {})) {
      if (!(key in env)) env[key] = { value, file: `${dir}/${name}` };
    }
  }
  return env;
}

function builtFilesContain(dir, text) {
  if (!existsSync(dir)) return false;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (builtFilesContain(path, text)) return true;
    } else if (name.endsWith(".js") && readFileSync(path, "utf8").includes(text)) {
      return true;
    }
  }
  return false;
}

const failures = [];
const warnings = [];
const passes = [];
const check = (ok, passMessage, failMessage) => (ok ? passes.push(passMessage) : failures.push(failMessage));

// ---------- Web app (read the way Next.js does for a production build) ----------
const web = loadEnv("apps/web", [".env.production.local", ".env.local", ".env.production", ".env"]);
const webValue = (key) => (process.env[key] !== undefined ? process.env[key] : (web[key]?.value ?? ""));
const webSource = (key) => web[key]?.file ?? "the environment";
const projectId = webValue("NEXT_PUBLIC_FIREBASE_PROJECT_ID");

check(
  webValue("NEXT_PUBLIC_USE_EMULATORS") !== "true",
  "Web app: not built for the emulators",
  `The web app would be built for the Auth emulator (NEXT_PUBLIC_USE_EMULATORS=true, from ${webSource("NEXT_PUBLIC_USE_EMULATORS")}). ` +
    "Copy apps/web/.env.production.example to apps/web/.env.production.local, fill it in, and run npm run build again.",
);
check(
  projectId !== "" && !projectId.startsWith("demo-"),
  `Web app: Firebase project ${projectId}`,
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID is "${projectId}": a demo project cannot sign anyone in. Use your real Firebase project id.`,
);
check(
  webValue("NEXT_PUBLIC_FIREBASE_API_KEY") !== "" && !webValue("NEXT_PUBLIC_FIREBASE_API_KEY").startsWith("demo"),
  "Web app: Firebase API key set",
  "NEXT_PUBLIC_FIREBASE_API_KEY is empty or a demo value (Firebase console > Project settings > Your apps).",
);
check(webValue("NEXT_PUBLIC_FIREBASE_APP_ID") !== "", "Web app: Firebase app id set", "NEXT_PUBLIC_FIREBASE_APP_ID is empty.");
if (webValue("NEXT_PUBLIC_API_URL") !== "") {
  warnings.push(
    `NEXT_PUBLIC_API_URL is "${webValue("NEXT_PUBLIC_API_URL")}". Leave it empty when the server serves the web app (the usual case): the app then calls the server on its own address.`,
  );
}

// ---------- The build itself (the values above are baked in at build time) ----------
const out = join(root, "apps/web/out");
if (!existsSync(out)) {
  failures.push("apps/web/out does not exist. Run npm run build first.");
} else if (projectId !== "" && !projectId.startsWith("demo-")) {
  const chunks = join(out, "_next/static");
  check(
    builtFilesContain(chunks, `"${projectId}"`),
    "Build: contains this project's id",
    `The build in apps/web/out was not made for "${projectId}" (it does not contain the project id). Run npm run build again after changing the web environment.`,
  );
  check(
    !builtFilesContain(chunks, "demo-reservation-espace"),
    "Build: no demo project id",
    "The build in apps/web/out still contains the demo project id. Run npm run build again.",
  );
}

// ---------- Server (its settings come from the host's environment) ----------
const serverFile = readEnvFile(join(root, "server/.env.production.local")) ?? {};
const server = (key) => process.env[key] ?? serverFile[key] ?? "";

check(
  server("FIREBASE_PROJECT_ID") === projectId && projectId !== "",
  "Server: same Firebase project as the web app",
  `FIREBASE_PROJECT_ID is "${server("FIREBASE_PROJECT_ID")}" but the web app uses "${projectId}": every sign-in would be refused.`,
);
check(
  server("FIREBASE_AUTH_EMULATOR_HOST") === "",
  "Server: not using the Auth emulator",
  "FIREBASE_AUTH_EMULATOR_HOST is set: the server would trust the emulator instead of Firebase. Remove it from the host's settings.",
);
check(
  server("FIREBASE_SERVICE_ACCOUNT") !== "" || server("GOOGLE_APPLICATION_CREDENTIALS") !== "",
  "Server: Firebase service account set",
  "Set FIREBASE_SERVICE_ACCOUNT (the service account key JSON on one line, or GOOGLE_APPLICATION_CREDENTIALS): without it the server cannot give people their role.",
);
const domains = server("ALLOWED_EMAIL_DOMAINS");
check(
  domains !== "" && !domains.includes("exemple"),
  `Server: sign-in limited to ${domains}`,
  "ALLOWED_EMAIL_DOMAINS is empty or the example domain. Set your company domain(s): empty means anyone with a Google account is let in.",
);
const admins = server("BOOTSTRAP_ADMIN_EMAILS");
check(
  admins !== "" && !admins.includes("@exemple."),
  "Server: first administrator set",
  "BOOTSTRAP_ADMIN_EMAILS is empty or the example address, so nobody could become administrator. Set the email of the first admin.",
);
const uri = server("MONGODB_URI");
check(
  uri !== "" && !/(127\.0\.0\.1|localhost)/.test(uri),
  "Server: MongoDB is not the local one",
  "MONGODB_URI is empty or points at this machine. Use your Atlas connection string.",
);
check(
  !/_(dev|test)$/.test(server("MONGODB_DB_NAME")),
  "Server: not pointed at a dev or test database",
  `MONGODB_DB_NAME is "${server("MONGODB_DB_NAME")}": a deployed app must use the real database.`,
);
if (server("RESEND_API_KEY") === "") warnings.push("RESEND_API_KEY is not set: notification emails are skipped.");
if (server("GOOGLE_GENERATIVE_AI_API_KEY") === "") warnings.push("GOOGLE_GENERATIVE_AI_API_KEY is not set: the AI assistant answers with an error.");
if (server("VAPID_PUBLIC_KEY") === "" || server("VAPID_PRIVATE_KEY") === "") {
  warnings.push("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not set: push notifications are skipped (npx web-push generate-vapid-keys).");
} else if (webValue("NEXT_PUBLIC_VAPID_PUBLIC_KEY") !== server("VAPID_PUBLIC_KEY")) {
  failures.push("NEXT_PUBLIC_VAPID_PUBLIC_KEY (web) and VAPID_PUBLIC_KEY (server) differ: push notifications would never arrive.");
}

// ---------- Report ----------
console.log(`\nProduction check for "${projectId || "(no project)"}"\n`);
for (const message of passes) console.log(`  ✓ ${message}`);
for (const message of warnings) console.log(`  ! ${message}`);
for (const message of failures) console.log(`  ✗ ${message}`);
console.log(`
Not checked here (do these by hand):
  - the host serves the app over HTTPS (needed for sign-in and for installing the app on a phone)
  - MongoDB Atlas > Network Access lets the host connect, and the indexes exist (npm run mongo:init-indexes)
  - Firebase console: Authentication has Google sign-in enabled, and the host's domain is under Authorized domains
`);
if (failures.length > 0) {
  console.error(`${failures.length} problem(s) to fix before deploying.`);
  process.exit(1);
}
