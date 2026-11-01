/**
 * Creates MongoDB compound indexes for the collections that have been migrated
 * off Firestore so far. Idempotent: safe to re-run (matching index specs are a
 * no-op). Run once per environment (local Docker, then once against Atlas).
 *
 *   npm run mongo:init-indexes
 *
 * Collections are added here as each migration phase ports them — see
 * firebase/firestore.indexes.json for the Firestore-era equivalents being
 * ported, and the migration plan for the full target list (some indexes are
 * net-new: Firestore auto-indexes simple composite queries, Mongo does not).
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient, type IndexDescription } from "mongodb";
import { COL } from "../packages/shared/src/index";

const envFile = resolve(import.meta.dirname, "../functions/.env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Set MONGODB_URI in functions/.env.local");

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
