import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";

/**
 * Starts the built server (`npm run build -w server`) for the API tests, on its own port so it can run
 * next to `npm run dev`. The Auth emulator and the database come from the environment (see `npm run test:api`).
 */
const PORT = process.env.API_TEST_PORT ?? "8099";
let server: ChildProcess | null = null;

export async function setup() {
  server = spawn(process.execPath, ["dist/index.js"], {
    cwd: resolve(import.meta.dirname, "../../server"),
    env: {
      ...process.env,
      PORT,
      // Scheduled jobs must not run during the tests: they are called directly when needed.
      DISABLE_JOBS: "true",
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ?? "demo-reservation-espace",
      FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099",
    },
    stdio: ["ignore", "inherit", "inherit"],
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`The server stopped at startup (exit code ${server.exitCode})`);
    try {
      if ((await fetch(`http://127.0.0.1:${PORT}/api/health`)).ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((done) => setTimeout(done, 250));
  }
  throw new Error("The server did not answer /api/health within 30 seconds");
}

export function teardown() {
  server?.kill();
}
