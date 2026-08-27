import { createAdminClient } from "@/lib/supabase/server";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Splits totalAmount into `count` monthly installments, each equal to
 * monthlyAmount except the last, which absorbs whatever rounding remainder
 * is left so the schedule always sums to exactly totalAmount (never more,
 * never less, regardless of how monthlyAmount was rounded upstream — see
 * computeMonthlyInstallment in lib/pricing.ts, the source of both figures).
 */
function buildSchedule(totalAmount: number, monthlyAmount: number, count: number): number[] {
  const amounts = Array(count - 1).fill(monthlyAmount);
  const last = totalAmount - monthlyAmount * (count - 1);
  return [...amounts, last];
}

/**
 * Creates a 12-month installment plan and its full payment schedule for a
 * course purchase an operator has formalized by phone (see
 * convertInstallmentLead in admin-actions.ts, the only caller) — totalAmount
 * and monthlyAmount are whatever was already agreed with the student at
 * lead-submission time (lib/lms/installment-lead-actions.ts), not
 * recomputed here. Returns every scheduled installment in order so the
 * caller can mark the first one paid (the operator just collected it) and
 * link a manual payment record to it.
 */
export async function createInstallmentPlan(params: {
  userId: string;
  courseId: string;
  totalAmount: number;
  monthlyAmount: number;
  installmentsCount: number;
}): Promise<{ planId: string; installments: { id: string; sequenceNumber: number; amount: number }[] }> {
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

  const amounts = buildSchedule(params.totalAmount, params.monthlyAmount, params.installmentsCount);
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
    installments: installments.map((i) => ({
      id: i.id,
      sequenceNumber: i.sequence_number,
      amount: i.amount,
    })),
  };
}

/** Marks one scheduled installment paid — a real Click/Payme payment
 * succeeding (see grantAccessForPayment), or an operator recording a
 * manually-collected month (see markInstallmentPaymentPaid in
 * admin-actions.ts). */
export async function markInstallmentPaid(installmentPaymentId: string) {
  const admin = await createAdminClient();
  await admin
    .from("installment_payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", installmentPaymentId);
}
