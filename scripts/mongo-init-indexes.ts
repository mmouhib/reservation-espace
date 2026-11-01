/**
 * Creates the MongoDB indexes that the queries rely on. Idempotent: safe to re-run
 * (matching index specs are a no-op). Run once per environment: the local Docker
 * database, then once against Atlas (with MONGODB_URI pointing at it).
 *
 *   npm run mongo:init-indexes
 *
 * MongoDB does not create indexes by itself: add an entry here when a new query needs one.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient, type IndexDescription } from "mongodb";
import { COL } from "../packages/shared/src/index";

const envFile = resolve(import.meta.dirname, "../server/.env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Set MONGODB_URI in server/.env.local");

/** Collection name -> index specs. Empty arrays are fine (no secondary index needed yet). */
const INDEXES: Record<string, IndexDescription[]> = {
  [COL.rateLimits]: [], // _id-only lookups (`${uid}_${fnName}`), no secondary index needed.
  [COL.wallets]: [], // _id-only lookups (uid), no secondary index needed.
  [COL.creditTransactions]: [{ key: { userId: 1, createdAt: -1 } }],
  [COL.plans]: [{ key: { active: 1, priceCents: 1 } }],
  [COL.subscriptions]: [{ key: { userId: 1, status: 1 } }, { key: { status: 1, nextRenewalAt: 1 } }],
  [COL.visits]: [{ key: { hostUserId: 1, visitDate: -1 } }, { key: { visitDate: 1, status: 1 } }],
  [COL.users]: [
    { key: { "notificationPrefs.weeklyDigest": 1 } },
    { key: { role: 1, status: 1 } },
    { key: { displayName: 1, _id: 1 } },
    { key: { role: 1, displayName: 1 } },
  ],
  [COL.teams]: [{ key: { managerIds: 1 } }, { key: { memberIds: 1 } }],
  [COL.spaces]: [{ key: { siteId: 1 } }],
  [COL.bookings]: [
    { key: { spaceId: 1, date: 1, status: 1 } },
    { key: { siteId: 1, date: 1, status: 1 } },
    { key: { userId: 1, date: 1, status: 1 } },
    { key: { userId: 1, status: 1, date: 1 } },
    { key: { date: 1, status: 1 } },
    { key: { status: 1, reminderSent: 1, startsAt: 1 } },
    { key: { userId: 1 } },
  ],
  [COL.absences]: [{ key: { userId: 1 } }, { key: { userId: 1, from: -1 } }],
  [COL.notifications]: [{ key: { userId: 1, createdAt: -1 } }],
  [COL.devices]: [{ key: { userId: 1 } }],
  [COL.auditLogs]: [{ key: { createdAt: -1 } }, { key: { action: 1, createdAt: -1 } }],
  [COL.incidents]: [{ key: { reporterId: 1, createdAt: -1 } }, { key: { createdAt: -1 } }, { key: { reporterId: 1 } }],
  [COL.payments]: [{ key: { userId: 1, createdAt: -1 } }],
  [COL.jobRuns]: [{ key: { startedAt: 1 }, expireAfterSeconds: 30 * 24 * 3600 }], // run records are only needed to avoid double runs
  [`${COL.photos}.files`]: [{ key: { "metadata.ownerId": 1 } }],
  [COL.equipmentRequests]: [{ key: { requesterId: 1, createdAt: -1 } }, { key: { createdAt: -1 } }, { key: { requesterId: 1 } }],
};

async function main() {
  const client = new MongoClient(uri!);
  try {
    await client.connect();
    const db = client.db(process.env.MONGODB_DB_NAME || undefined);

    for (const [name, specs] of Object.entries(INDEXES)) {
      if (specs.length === 0) continue;
      await db.collection(name).createIndexes(specs);
      console.log(`${name}: ${specs.length} index(es) ensured.`);
    }
    console.log("Done.");
  } finally {
    await client.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
