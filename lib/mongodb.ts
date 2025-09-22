import { MongoClient, MongoClientOptions } from "mongodb";

const uri = process.env.MONGODB_URI;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

export default function getClientPromise(): Promise<MongoClient> {
  if (!uri) throw new Error("MONGODB_URI is not set");
  const existing = global._mongoClientPromise;
  if (existing) return existing;
  const options: MongoClientOptions = {};
  const client = new MongoClient(uri, options);
  const promise = client.connect();
  global._mongoClientPromise = promise;
  return promise;
}

export async function getDb(dbName = process.env.MONGODB_DB || "tiptap_app") {
  const cli = await getClientPromise();
  return cli.db(dbName);
}
