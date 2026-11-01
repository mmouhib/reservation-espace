import { MongoClient, type Db } from "mongodb";
import { MONGODB_DB_NAME, MONGODB_URI } from "./config";

let clientPromise: Promise<MongoClient> | null = null;

function connect(): Promise<MongoClient> {
  if (!clientPromise) {
    const uri = MONGODB_URI();
    if (!uri) throw new Error("MONGODB_URI is not set");
    // A few connections stay open, so a request does not pay for a new handshake with a distant database.
    const pending = new MongoClient(uri, { maxPoolSize: 10, minPoolSize: 2, serverSelectionTimeoutMS: 15_000 }).connect();
    clientPromise = pending;
    // A failed first connection must not be remembered: the next request tries again. (Once connected, the
    // driver reconnects by itself after a network drop.)
    pending.catch(() => {
      if (clientPromise === pending) clientPromise = null;
    });
  }
  return clientPromise;
}

/** The Mongo client, connected lazily once per process. */
export function getMongoClient(): Promise<MongoClient> {
  return connect();
}

/** The database named by MONGODB_DB_NAME, else the one in the connection string's path. */
export async function getDb(): Promise<Db> {
  const client = await connect();
  return client.db(MONGODB_DB_NAME() || undefined);
}
