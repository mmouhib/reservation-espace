import { MongoClient, type Db } from "mongodb";
import { MONGODB_URI } from "./config";

let clientPromise: Promise<MongoClient> | null = null;

function connect(): Promise<MongoClient> {
  if (!clientPromise) {
    // The emulators read it from functions/.env.local; a deployed function gets the secret bound to it.
    const uri = process.env.MONGODB_URI || MONGODB_URI.value();
    if (!uri) throw new Error("MONGODB_URI is not set");
    clientPromise = new MongoClient(uri, { maxPoolSize: 10 }).connect();
  }
  return clientPromise;
}

/** The Mongo client, connected lazily once per warm Cloud Functions instance. */
export function getMongoClient(): Promise<MongoClient> {
  return connect();
}

/** The database named by MONGODB_DB_NAME (used by `npm run test:api`), else the one in the connection string's path. */
export async function getDb(): Promise<Db> {
  const client = await connect();
  return client.db(process.env.MONGODB_DB_NAME || undefined);
}
