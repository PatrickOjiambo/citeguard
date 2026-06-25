import mongoose from "mongoose";

import { env } from "./env.js";

let connecting: Promise<typeof mongoose> | null = null;

export async function connectDb(): Promise<typeof mongoose> {
  if (mongoose.connection.readyState === 1)
    return mongoose;
  if (!connecting) {
    mongoose.set("strictQuery", true);
    connecting = mongoose.connect(env.MONGODB_URI);
  }
  return connecting;
}

export function dbReady(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDb(): Promise<void> {
  connecting = null;
  await mongoose.disconnect();
}
