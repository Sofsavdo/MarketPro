import type { Config } from "drizzle-kit";
import { config } from 'dotenv';

// Load environment variables
config();

export default {
  schema: "./shared/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgresql://postgres:password@helium/heliumdb?sslmode=disable",
  },
  verbose: true,
  strict: true,
} satisfies Config;
