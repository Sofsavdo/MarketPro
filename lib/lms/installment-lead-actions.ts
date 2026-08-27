"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { computeMonthlyInstallment } from "@/lib/pricing";

/**
 * Registers interest in the 12-month installment plan — no payment happens
 * here. An operator calls the student to formalize it (see
 * convertInstallmentLead in admin-actions.ts), so the amounts are computed
 * server-side from the course's current price rather than trusted from the
 * client, same reasoning as lib/payments/resolve-amount.ts.
 */
export async function submitInstallmentLead(courseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("unauthorized");

  const admin = await createAdminClient();
  const { data: course } = await admin
    .from("courses")
    .select("price, is_published")
    .eq("id", courseId)
    .maybeSingle();
  if (!course || !course.is_published) throw new Error("invalid_course");

  const monthlyAmount = computeMonthlyInstallment(course.price);
  const totalAmount = monthlyAmount * 12;

  await supabase.from("installment_leads").insert({
    user_id: user.id,
    course_id: courseId,
    monthly_amount: monthlyAmount,
    total_amount: totalAmount,
  });

  revalidatePath("/admin/installments");
}
