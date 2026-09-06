"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { connectTelegramWebhook } from "@/lib/telegram/actions";

type Status = {
  configured: boolean;
  setupCode: string | null;
  linkedChatId: number | null;
  linkedAt: string | null;
};

export function TelegramPanel({ initialStatus }: { initialStatus: Status }) {
  const [status] = useState(initialStatus);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function handleConnect() {
    startTransition(async () => {
      const res = await connectTelegramWebhook();
      setResult(res.ok ? "✅ Webhook ulandi." : `Xatolik: ${res.description ?? "noma'lum"}`);
    });
  }

  if (!status.configured) {
    return (
      <p className="text-sm text-slate-500">
        TELEGRAM_BOT_TOKEN sozlanmagan — Railow&apos;da environment variable qo&apos;shilishi kerak.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-4">
      <div>
        <p className="text-sm font-semibold text-white">1-qadam: Webhook&apos;ni ulash</p>
        <p className="mt-1 text-xs text-slate-500">
          Bu tugma Telegram&apos;ga &quot;har xabarni shu manzilga yubor&quot; deb aytadi — bir marta bosish yetarli.
        </p>
        <Button size="sm" className="mt-2" onClick={handleConnect} disabled={isPending}>
          {isPending ? "Ulanmoqda..." : "Webhook'ni ulash"}
        </Button>
        {result && <p className="mt-2 text-xs text-slate-400">{result}</p>}
      </div>

      <div className="border-t border-slate-800 pt-4">
        <p className="text-sm font-semibold text-white">2-qadam: Botga ulanish</p>
        {status.linkedChatId ? (
          <p className="mt-1 text-xs text-emerald-400">
            ✅ Ulangan (chat_id: {status.linkedChatId}, {status.linkedAt ? new Date(status.linkedAt).toLocaleString("uz-UZ") : ""})
          </p>
        ) : (
          <div className="mt-1 text-xs text-slate-400">
            <p>Telegram&apos;da botingizga quyidagini yozing:</p>
            <code className="mt-1 block rounded-md bg-slate-950 px-3 py-2 text-amber-400">
              /start {status.setupCode}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}
