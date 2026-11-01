/**
 * One-off copy of the Firestore data into MongoDB (the app now reads Mongo only).
 *
 *   Local, from the saved emulator data (.emulator-data): start a Firestore emulator on the
 *   export without --export-on-exit, so the export stays untouched, and run this script in it.
 *   firebase.json no longer has a firestore entry, so pass a small config that adds one:
 *     firebase emulators:exec --config <config with "firestore" + a free port> --only firestore \
 *       --import=./.emulator-data "npx tsx scripts/migrate-firestore-to-mongo.ts --dry-run"
 *   Production: run with GOOGLE_APPLICATION_CREDENTIALS + GCLOUD_PROJECT set and
 *   MONGODB_URI pointing at Atlas, without FIRESTORE_EMULATOR_HOST.
 *
 * Flags:
 *   --dry-run   only list what would be copied
 *   --replace   empty each target collection first, so it ends up equal to Firestore
 *               (otherwise documents are upserted by id and extra Mongo documents stay)
 *
 * Every document keeps its Firestore id as `_id`. Timestamps become Dates.
 * `users/{uid}/notifications` and `users/{uid}/devices` become top-level collections
 * with a `userId` field. Collections that already live in Mongo are not copied.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp } from "firebase-admin/app";
import { DocumentReference, GeoPoint, getFirestore, Timestamp } from "firebase-admin/firestore";
import { MongoClient, type AnyBulkWriteOperation, type Document } from "mongodb";
import { COL } from "../packages/shared/src/index";

const envFile = resolve(import.meta.dirname, "../functions/.env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const DRY_RUN = process.argv.includes("--dry-run");
const REPLACE = process.argv.includes("--replace");

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Set MONGODB_URI in functions/.env.local");
const projectId = process.env.GCLOUD_PROJECT ?? "demo-reservation-espace";

/** Already owned by Mongo (or obsolete): never overwritten from Firestore. */
const SKIP = new Set<string>([
  COL.wallets,
  COL.creditTransactions,
  COL.plans,
  COL.subscriptions,
  COL.rateLimits,
  COL.visits,
  "rateLimits",
  "mail", // queue of the old "Trigger Email" extension; emails now go through Resend
]);
/** Subcollections of users/{uid} that become top-level collections with a userId field. */
const USER_SUBCOLLECTIONS = new Set<string>([COL.notifications, COL.devices]);

function convert(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof DocumentReference) return value.path;
  if (value instanceof GeoPoint) return { latitude: value.latitude, longitude: value.longitude };
  if (Array.isArray(value)) return value.map(convert);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, convert(v)]));
  }
  return value;
}

async function main() {
  initializeApp({ projectId });
  const firestore = getFirestore();
  const mongo = new MongoClient(uri!);
  await mongo.connect();
  const db = mongo.db(process.env.MONGODB_DB_NAME || undefined);

  console.log(
    `${DRY_RUN ? "[dry run] " : ""}Firestore ${process.env.FIRESTORE_EMULATOR_HOST ? `emulator ${process.env.FIRESTORE_EMULATOR_HOST}` : `project ${projectId}`} -> Mongo ${db.databaseName}${REPLACE ? " (replace)" : ""}`,
  );

  const batches = new Map<string, Document[]>();
  const add = (collection: string, doc: Document) => {
    if (!batches.has(collection)) batches.set(collection, []);
    batches.get(collection)!.push(doc);
  };
  const skipped: string[] = [];

  for (const ref of await firestore.listCollections()) {
    if (SKIP.has(ref.id)) {
      skipped.push(ref.id);
      continue;
    }
    for (const snap of (await ref.get()).docs) {
      add(ref.id, { ...(convert(snap.data()) as Document), _id: snap.id });
      if (ref.id !== COL.users) continue;
      for (const sub of await snap.ref.listCollections()) {
        if (!USER_SUBCOLLECTIONS.has(sub.id)) {
          skipped.push(`users/*/${sub.id}`);
          continue;
        }
        for (const child of (await sub.get()).docs) {
          add(sub.id, { ...(convert(child.data()) as Document), _id: child.id, userId: snap.id });
        }
      }
    }
  }

  for (const [collection, docs] of [...batches].sort(([a], [b]) => a.localeCompare(b))) {
    if (!DRY_RUN) {
      const target = db.collection<Document>(collection);
      if (REPLACE) await target.deleteMany({});
      const ops: AnyBulkWriteOperation<Document>[] = docs.map((doc) => ({
        replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
      }));
      await target.bulkWrite(ops, { ordered: false });
    }
    console.log(`${collection.padEnd(20)} ${docs.length}`);
  }
  if (skipped.length) console.log(`skipped: ${[...new Set(skipped)].join(", ")}`);

  await mongo.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
