import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyPaymeAuth, PaymeError, type PaymeRpcRequest } from "@/lib/payments/payme";
import { grantAccessForPayment, revokeAccessForPayment } from "@/lib/payments/grant-access";

function rpcResult(id: number | string, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function rpcError(id: number | string, code: number, message: string) {
  return NextResponse.json({
    jsonrpc: "2.0",
    id,
    error: { code, message: { uz: message, ru: message, en: message } },
  });
}

// Payme calls this endpoint as JSON-RPC 2.0 with Basic auth
// (`Paycom:SECRET_KEY`) for each step of a transaction's lifecycle.
// See https://developer.help.paycom.uz/protokol-merchant-api/
export async function POST(request: NextRequest) {
  if (!verifyPaymeAuth(request.headers.get("authorization"))) {
    return rpcError(0, -32504, "Insufficient privilege to perform this method");
  }

  const rpc = (await request.json()) as PaymeRpcRequest;
  const admin = await createAdminClient();
  const account = rpc.params.account as { order_id?: string } | undefined;
  const paymentId = account?.order_id;

  switch (rpc.method) {
    case "CheckPerformTransaction": {
      const { data: payment } = paymentId
        ? await admin.from("payments").select("*").eq("id", paymentId).maybeSingle()
        : { data: null };

      if (!payment) return rpcError(rpc.id, PaymeError.ORDER_NOT_FOUND, "Order not found");
      if (payment.amount * 100 !== rpc.params.amount) {
        return rpcError(rpc.id, PaymeError.INVALID_AMOUNT, "Invalid amount");
      }
      return rpcResult(rpc.id, { allow: true });
    }

    case "CreateTransaction": {
      const { data: payment } = paymentId
        ? await admin.from("payments").select("*").eq("id", paymentId).maybeSingle()
        : { data: null };
      if (!payment) return rpcError(rpc.id, PaymeError.ORDER_NOT_FOUND, "Order not found");

      await admin
        .from("payments")
        .update({ provider_transaction_id: rpc.params.id as string })
        .eq("id", payment.id);

      return rpcResult(rpc.id, {
        create_time: Date.now(),
        transaction: payment.id,
        state: 1,
      });
    }

    case "PerformTransaction": {
      const { data: payment } = await admin
        .from("payments")
        .select("*")
        .eq("provider_transaction_id", rpc.params.id as string)
        .maybeSingle();
      if (!payment) return rpcError(rpc.id, PaymeError.TRANSACTION_NOT_FOUND, "Transaction not found");

      if (payment.status !== "paid") {
        await admin.from("payments").update({ status: "paid" }).eq("id", payment.id);
        await grantAccessForPayment(payment.id);
      }

      return rpcResult(rpc.id, {
        transaction: payment.id,
        perform_time: Date.now(),
        state: 2,
      });
    }

    case "CancelTransaction": {
      const { data: payment } = await admin
        .from("payments")
        .select("*")
        .eq("provider_transaction_id", rpc.params.id as string)
        .maybeSingle();
      if (!payment) return rpcError(rpc.id, PaymeError.TRANSACTION_NOT_FOUND, "Transaction not found");

      // Payme can call this on a transaction that already completed
      // (PerformTransaction ran, access was granted) — a real refund or
      // chargeback initiated from Payme's side, not just an admin decision.
      // Only revoke in that case; canceling a transaction that never got
      // past "created" never granted anything to undo.
      const wasPaid = payment.status === "paid";
      await admin.from("payments").update({ status: "refunded" }).eq("id", payment.id);
      if (wasPaid) await revokeAccessForPayment(payment.id);

      return rpcResult(rpc.id, {
        transaction: payment.id,
        cancel_time: Date.now(),
        state: -1,
      });
    }

    case "CheckTransaction": {
      const { data: payment } = await admin
        .from("payments")
        .select("*")
        .eq("provider_transaction_id", rpc.params.id as string)
        .maybeSingle();
      if (!payment) return rpcError(rpc.id, PaymeError.TRANSACTION_NOT_FOUND, "Transaction not found");

      return rpcResult(rpc.id, {
        create_time: new Date(payment.created_at).getTime(),
        perform_time: payment.status === "paid" ? new Date(payment.created_at).getTime() : 0,
        cancel_time: payment.status === "refunded" ? Date.now() : 0,
        transaction: payment.id,
        state: payment.status === "paid" ? 2 : payment.status === "refunded" ? -1 : 1,
        reason: null,
      });
    }

    default:
      return rpcError(rpc.id, -32601, "Method not found");
  }
}
