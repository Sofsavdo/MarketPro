"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  await supabase
    .from("profiles")
    .update({
      full_name: String(formData.get("full_name") ?? ""),
      address: String(formData.get("address") ?? ""),
    })
    .eq("id", user.id);

  revalidatePath("/profile");
}
