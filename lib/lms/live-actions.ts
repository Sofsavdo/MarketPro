"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function postSessionQuestion(sessionId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const question = String(formData.get("question") ?? "").trim();
  if (!question) return;

  await supabase.from("session_questions").insert({
    session_id: sessionId,
    user_id: user.id,
    question,
  });

  revalidatePath(`/live/${sessionId}`);
}
