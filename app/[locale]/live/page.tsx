import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUpcomingSessionsForUser } from "@/lib/lms/live-sessions";

export default async function LiveSessionsPage() {
  const t = await getTranslations("live");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const sessions = await getUpcomingSessionsForUser();

  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-white">{t("title")}</h1>
      <p className="mt-2 text-slate-400">{t("subtitle")}</p>

      <div className="mt-8 space-y-4">
        {sessions.map((s) => (
          <Link key={s.id} href={`/live/${s.id}`}>
            <Card className="transition-colors hover:border-amber-500/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{s.tier}</Badge>
                  <span className="text-xs text-slate-500">
                    {new Date(s.scheduled_at).toLocaleString("uz-UZ", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <CardTitle className="mt-2 flex items-center gap-2 text-base">
                  <Video className="h-4 w-4 text-amber-500" />
                  {s.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-sm text-slate-400">{s.course_title}</CardContent>
            </Card>
          </Link>
        ))}

        {!sessions.length && (
          <p className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-center text-slate-500">
            {t("none")}
          </p>
        )}
      </div>
    </div>
  );
}
