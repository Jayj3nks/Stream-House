import { MongoClient } from "mongodb";

declare global { var _mongoClientPromise: Promise<MongoClient> | undefined; }

const uri = process.env.MONGO_URL!;
if (!uri) throw new Error("Missing MONGO_URL");

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!global._mongoClientPromise) {
  client = new MongoClient(uri);
  global._mongoClientPromise = client.connect();
}
clientPromise = global._mongoClientPromise;
export default clientPromise;
