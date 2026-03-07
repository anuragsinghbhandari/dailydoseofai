import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
let connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

// Ensure SSL is used for Supabase or in production
const isSupabase = connectionString.includes('supabase.com');
const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: isSupabase ? 'require' : undefined,
  // Prepared statements can be problematic with connection poolers (Transaction mode)
  prepare: !isSupabase || !connectionString.includes(':6543')
});

export const db = drizzle(client);

