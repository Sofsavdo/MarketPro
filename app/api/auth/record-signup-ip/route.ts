import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/** Records the requesting IP against the just-registered user — replaces asking for a postal address nobody mails anything to. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const admin = await createAdminClient();
  await admin.from("profiles").update({ signup_ip: ip }).eq("id", user.id);

  return NextResponse.json({ ok: true });
}
