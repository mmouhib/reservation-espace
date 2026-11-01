/**
 * Drops the API-test database so every `npm run test:api` starts from the seed alone
 * (MongoDB keeps its data between runs).
 * Refuses any database whose name doesn't end in `_test`, so it can't wipe dev data.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";

const envFile = resolve(import.meta.dirname, "../server/.env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const uri = process.env.MONGODB_URI;
const name = process.env.MONGODB_DB_NAME;
if (!uri) throw new Error("Set MONGODB_URI in server/.env.local");
if (!name?.endsWith("_test")) throw new Error(`Refusing to drop "${name ?? ""}": MONGODB_DB_NAME must end in _test`);

async function main() {
  const client = new MongoClient(uri!);
  try {
    await client.connect();
    await client.db(name).dropDatabase();
    console.log(`Dropped ${name}.`);
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
