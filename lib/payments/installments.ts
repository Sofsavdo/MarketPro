import { createAdminClient } from "@/lib/supabase/server";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// Business plan §11.3: 2-part plans split 50/50; 3-part plans require a 40%
// down payment (§9.7's "kamida 40%" cash-flow rule) with the rest split
// evenly over the remaining installments.
function splitAmount(totalAmount: number, installmentsCount: 2 | 3): number[] {
  if (installmentsCount === 2) {
    const first = Math.round(totalAmount / 2);
    return [first, totalAmount - first];
  }

  const first = Math.ceil((totalAmount * 40) / 100);
  const remaining = totalAmount - first;
  const second = Math.round(remaining / 2);
  return [first, second, remaining - second];
}

/**
 * Creates the installment plan and its full payment schedule up front, and
 * returns the id of installment #1 (the down payment) so the caller can
 * create a Click/Payme `payments` row against it immediately.
 */
export async function createInstallmentPlan(params: {
  userId: string;
  courseId: string;
  totalAmount: number;
  installmentsCount: 2 | 3;
}): Promise<{ planId: string; firstInstallmentId: string; firstInstallmentAmount: number }> {
  const admin = await createAdminClient();

  const { data: plan, error } = await admin
    .from("installment_plans")
    .insert({
      user_id: params.userId,
      course_id: params.courseId,
      total_amount: params.totalAmount,
      installments_count: params.installmentsCount,
    })
    .select("id")
    .single();

  if (error || !plan) throw new Error("could_not_create_installment_plan");

  const amounts = splitAmount(params.totalAmount, params.installmentsCount);
  const now = Date.now();

  const rows = amounts.map((amount, i) => ({
    plan_id: plan.id,
    sequence_number: i + 1,
    amount,
    due_date: new Date(now + i * THIRTY_DAYS_MS).toISOString(),
  }));

  const { data: installments, error: installmentsError } = await admin
    .from("installment_payments")
    .insert(rows)
    .select("id, sequence_number, amount")
    .order("sequence_number", { ascending: true });

  if (installmentsError || !installments?.length) {
    throw new Error("could_not_create_installment_schedule");
  }

  return {
    planId: plan.id,
    firstInstallmentId: installments[0].id,
    firstInstallmentAmount: installments[0].amount,
  };
}

/** Marks one scheduled installment paid once its Click/Payme payment succeeds. */
export async function markInstallmentPaid(installmentPaymentId: string) {
  const admin = await createAdminClient();
  await admin
    .from("installment_payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", installmentPaymentId);
}
