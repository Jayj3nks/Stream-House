import { MongoClient } from 'mongodb'

const uri = process.env.MONGO_URL
const options = {}

let client
let clientPromise

if (process.env.NODE_ENV === 'development') {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Reloading).
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options)
    global._mongoClientPromise = client.connect()
  }
  clientPromise = global._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  client = new MongoClient(uri, options)
  clientPromise = client.connect()
}

export default clientPromise

export async function getDb() {
  const client = await clientPromise
  return client.db(process.env.DB_NAME || 'stream_house')
}

export async function connectDB() {
  try {
    const client = await clientPromise
    console.log('MongoDB connected successfully')
    return client
  } catch (error) {
    console.error('MongoDB connection error:', error)
    throw error
  }
}