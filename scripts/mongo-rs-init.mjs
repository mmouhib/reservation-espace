/**
 * Initiates the single-node replica set on the local Docker Mongo container.
 * Required for transactions: a plain standalone `mongod` doesn't support them.
 * Idempotent: does nothing if the replica set is already initiated.
 *
 *   docker compose up -d
 *   node scripts/mongo-rs-init.mjs
 */
import { MongoClient } from "mongodb";

const uri = "mongodb://127.0.0.1:27017/?directConnection=true";
const maxAttempts = 30;

async function waitForMongod(client) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await client.db("admin").command({ ping: 1 });
      return;
    } catch {
      if (attempt === maxAttempts) throw new Error("mongod did not become reachable in time");
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

const client = new MongoClient(uri);
try {
  await client.connect();
  await waitForMongod(client);

  const admin = client.db("admin");
  const status = await admin.command({ replSetGetStatus: 1 }).catch((err) => err);
  if (status?.ok === 1) {
    console.log("Replica set already initiated.");
  } else {
    await admin.command({
      replSetInitiate: {
        _id: "rs0",
        members: [{ _id: 0, host: "127.0.0.1:27017" }],
      },
    });
    console.log("Replica set initiated.");
  }
} finally {
  await client.close();
}
