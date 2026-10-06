import { MongoClient } from "mongodb";

let client;
let database;

export async function connectToDatabase() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI is required. Add your MongoDB connection string to backend/.env.");
  }

  client = new MongoClient(uri);
  await client.connect();
  database = client.db(process.env.MONGODB_DATABASE || "studymate");

  await Promise.all([
    database.collection("users").createIndex({ email: 1 }, { unique: true }),
    database.collection("conversations").createIndex(
      { userId: 1, id: 1 },
      { unique: true }
    ),
    database.collection("conversations").createIndex({ userId: 1, updatedAt: -1 })
  ]);

  console.log(`[StudyMate AI Backend] Connected to MongoDB database "${database.databaseName}".`);
  return database;
}

export function getDatabase() {
  if (!database) {
    throw new Error("MongoDB has not connected yet.");
  }
  return database;
}

export async function closeDatabase() {
  if (client) {
    await client.close();
    client = undefined;
    database = undefined;
  }
}
