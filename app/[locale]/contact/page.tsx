import { getTranslations } from "next-intl/server";
import { Send, AtSign, Mail } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function ContactPage() {
  const t = await getTranslations("legal.contact");

  const channels = [
    { icon: Send, label: t("telegram"), value: "@izdosh_academy", href: "https://t.me/izdosh_academy" },
    { icon: AtSign, label: t("instagram"), value: "@izdosh.uz", href: "https://instagram.com/izdosh.uz" },
    { icon: Mail, label: t("email"), value: "info@izdosh.uz", href: "mailto:info@izdosh.uz" },
  ];

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
      <p className="mt-2 text-slate-400">{t("subtitle")}</p>
      <p className="mt-1 text-sm text-slate-500">{t("company")}</p>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {channels.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex flex-col items-center gap-2 p-6">
              <c.icon className="h-6 w-6 text-amber-500" />
              <p className="text-sm text-slate-400">{c.label}</p>
              <a href={c.href} className="text-sm font-medium text-white hover:text-amber-400">
                {c.value}
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
