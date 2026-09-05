"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Copy, Check, Send, MessageCircle } from "lucide-react";

export function ReferralCard({
  code,
  count,
  nextTierCount,
  nextTierMonths,
  siteUrl,
}: {
  code: string;
  count: number;
  nextTierCount: number | null;
  nextTierMonths: number | null;
  siteUrl: string;
}) {
  const t = useTranslations("referral");
  const [copied, setCopied] = useState(false);
  const link = `${siteUrl}/register?ref=${code}`;

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const pct = nextTierCount ? Math.min(100, Math.round((count / nextTierCount) * 100)) : 100;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
        <p className="text-sm text-slate-400">{t("desc")}</p>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-300">
            {link}
          </code>
          <Button size="sm" variant="outline" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild size="sm" variant="outline" className="min-w-0 flex-1 whitespace-normal">
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(t("shareTelegram"))}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Send className="h-4 w-4 shrink-0" /> {t("shareTelegram")}
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className="min-w-0 flex-1 whitespace-normal">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${link}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4 shrink-0" /> {t("shareWhatsapp")}
            </a>
          </Button>
        </div>

        <div>
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              {t("invited")}: {count}
            </span>
            {nextTierCount && nextTierMonths && (
              <span>
                {t("nextReward", { count: nextTierCount, months: nextTierMonths })}
              </span>
            )}
          </div>
          <Progress value={pct} className="mt-2" />
        </div>
      </CardContent>
    </Card>
  );
}
