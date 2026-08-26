/**
 * Supabase's own client throws a bare "supabaseUrl is required." when a
 * required env var is missing — not helpful when debugging a fresh Railway
 * deploy where it's easy to forget one. This names the exact var so the
 * fix is obvious from the server logs.
 *
 * Callers must pass `process.env.THE_LITERAL_NAME` directly (not looked up
 * dynamically by `name`) — Next.js only inlines `NEXT_PUBLIC_*` vars into
 * the browser bundle when it can statically see that exact member
 * expression at build time; a dynamic `process.env[name]` lookup defeats
 * that and silently breaks client-side Supabase initialization.
 */
export function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Set it in your deploy environment (see .env.example).`,
    );
  }
  return value;
}
