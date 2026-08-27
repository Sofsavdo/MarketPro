import { createAdminClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { approveCourseReview, deleteCourseReview } from "@/lib/lms/admin-actions";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={14}
          height={14}
          className={n <= rating ? "fill-amber-500 text-amber-500" : "text-slate-700"}
        />
      ))}
    </div>
  );
}

export default async function AdminReviewsPage() {
  const admin = await createAdminClient();

  const { data: reviews } = await admin
    .from("course_reviews")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: courses } = await admin.from("courses").select("id, title_uz");
  const courseById = new Map((courses ?? []).map((c) => [c.id, c.title_uz]));

  const { data: profiles } = await admin.from("profiles").select("id, full_name, phone");
  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const pending = (reviews ?? []).filter((r) => r.status === "pending");
  const approved = (reviews ?? []).filter((r) => r.status === "approved");

  return (
    <div>
      <h1 className="text-2xl font-bold text-white">Kurs sharhlari</h1>
      <p className="mt-1 text-sm text-slate-500">
        Talaba kursni 100% tugatgandan keyingina sharh qoldira oladi. Har bir sharh chop
        etilishidan oldin shu yerda tasdiqlanishi kerak.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-white">
        Tasdiqlanishi kerak {pending.length > 0 && <Badge className="ml-2">{pending.length}</Badge>}
      </h2>
      <div className="mt-4 space-y-3">
        {pending.map((r) => {
          const profile = profileById.get(r.user_id);
          return (
            <div key={r.id} className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-white">
                    {profile?.full_name ?? r.user_id.slice(0, 8)}{" "}
                    <span className="text-slate-500">— {courseById.get(r.course_id) ?? "—"}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {profile?.phone ?? "—"} · {formatDate(r.created_at)}
                  </p>
                </div>
                <StarRow rating={r.rating} />
              </div>
              {r.comment && <p className="mt-3 text-sm text-slate-300">{r.comment}</p>}
              <div className="mt-3 flex items-center gap-2">
                <form action={approveCourseReview.bind(null, r.id)}>
                  <Button type="submit" size="sm">
                    Tasdiqlash
                  </Button>
                </form>
                <form action={deleteCourseReview.bind(null, r.id)}>
                  <Button type="submit" size="sm" variant="ghost" className="text-red-400">
                    O&apos;chirish
                  </Button>
                </form>
              </div>
            </div>
          );
        })}
        {!pending.length && (
          <p className="text-sm text-slate-500">Hozircha tasdiq kutayotgan sharh yo&apos;q.</p>
        )}
      </div>

      <h2 className="mt-10 text-lg font-semibold text-white">Chop etilgan sharhlar</h2>
      <div className="mt-4 space-y-3">
        {approved.map((r) => {
          const profile = profileById.get(r.user_id);
          return (
            <div key={r.id} className="rounded-lg border border-slate-800 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm text-white">
                    {profile?.full_name ?? r.user_id.slice(0, 8)}{" "}
                    <span className="text-slate-500">— {courseById.get(r.course_id) ?? "—"}</span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(r.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StarRow rating={r.rating} />
                  <form action={deleteCourseReview.bind(null, r.id)}>
                    <button type="submit" className="text-xs text-red-400 hover:underline">
                      O&apos;chirish
                    </button>
                  </form>
                </div>
              </div>
              {r.comment && <p className="mt-3 text-sm text-slate-400">{r.comment}</p>}
            </div>
          );
        })}
        {!approved.length && <p className="text-sm text-slate-500">Hozircha chop etilgan sharh yo&apos;q.</p>}
      </div>
    </div>
  );
}
