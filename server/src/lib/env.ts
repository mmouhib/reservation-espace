import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Local development: server/.env.local (git-ignored), then server/.env. The npm scripts start the
// server from the server/ folder. Variables already set in the environment (a host's settings) win.
for (const file of [".env.local", ".env"]) {
  const path = resolve(process.cwd(), file);
  if (existsSync(path)) process.loadEnvFile(path);
}
