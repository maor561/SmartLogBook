import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
let db;
let dbAvailable = true;

export async function getDb() {
  if (!db) {
    try {
      await client.connect();
      db = client.db('smartlogbook');
      dbAvailable = true;
    } catch (err) {
      console.error('[DB] MongoDB connection failed:', err.message);
      dbAvailable = false;
      return null;
    }
  }
  return db;
}

export function isDbAvailable() {
  return dbAvailable && db;
}

export default getDb;
