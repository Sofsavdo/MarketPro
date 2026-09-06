import { NextRequest, NextResponse } from "next/server";
import { runWeeklyMeeting } from "@/lib/ai-department/meeting";

/**
 * Triggered by a Supabase pg_cron job (via pg_net) every Monday morning —
 * see the ai_weekly_meeting_cron migration. Not reachable without the
 * shared secret, since this kicks off several real Claude calls per
 * request (one per specialist plus a synthesis call) and must never be a
 * public, unauthenticated way to run up the API bill.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "cron_secret_not_configured" }, { status: 500 });
  }
  if (request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runWeeklyMeeting();
  return NextResponse.json(result);
}
