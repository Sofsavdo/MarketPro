import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as schema from '@shared/schema';

const databaseUrl = process.env.DATABASE_URL;

let db: any;

if (databaseUrl && !databaseUrl.includes('sqlite')) {
  // PostgreSQL connection
  const client = postgres(databaseUrl, { 
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false 
  });
  db = drizzle(client, { schema });
} else {
  // SQLite fallback for development
  const sqlite = new Database('./dev.db');
  db = drizzleSqlite(sqlite, { schema });
}

export { db };