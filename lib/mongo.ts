// lib/mongo.ts
import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME;

if (!uri) throw new Error("MONGO_URL is not set");
if (!dbName) throw new Error("DB_NAME is not set");

// Cache across hot reloads (dev) and serverless invocations (Vercel)
let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function getClient(): Promise<MongoClient> {
  if (cachedClient) return cachedClient;
  const client = new MongoClient(uri, {
    maxPoolSize: 10,
    retryWrites: true,
  });
  await client.connect();
  cachedClient = client;
  return client;
}

export async function getDb(): Promise<Db> {
  if (cachedDb) return cachedDb;
  const client = await getClient();
  cachedDb = client.db(dbName);
  return cachedDb;
}

// (Optional) default export for backwards-compatibility
export default getDb;
