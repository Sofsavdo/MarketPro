import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Code2, GraduationCap } from "lucide-react";

export default async function AboutPage() {
  const t = await getTranslations("legal.about");

  const points = [
    { icon: TrendingUp, title: t("bio1Title"), body: t("bio1Body") },
    { icon: Code2, title: t("bio2Title"), body: t("bio2Body") },
    { icon: GraduationCap, title: t("bio3Title"), body: t("bio3Body") },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-white sm:text-4xl">{t("title")}</h1>
      <p className="mt-3 text-lg text-slate-400">{t("intro")}</p>

      <div className="mt-10 space-y-4">
        {points.map((p) => (
          <Card key={p.title}>
            <CardContent className="flex gap-4 p-6">
              <p.icon className="h-6 w-6 shrink-0 text-amber-500" />
              <div>
                <h2 className="font-semibold text-white">{p.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{p.body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6">
        <h2 className="font-semibold text-white">{t("philosophyTitle")}</h2>
        <p className="mt-2 text-sm text-slate-400">{t("philosophyBody")}</p>
      </div>

      <Button asChild size="lg" className="mt-10">
        <Link href="/courses">{t("cta")}</Link>
      </Button>
    </div>
  );
}
