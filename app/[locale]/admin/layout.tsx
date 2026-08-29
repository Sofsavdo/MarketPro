import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/lms/is-admin";
import { Link } from "@/i18n/navigation";
import { AdminNav } from "@/components/admin/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentProfile();

  if (!user) redirect("/login");
  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <Link href="/admin" className="flex items-center gap-2 text-sm font-semibold text-white">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-xs font-bold text-slate-950">
                I
              </span>
              Admin
            </Link>
            <Link href="/dashboard" className="text-sm text-slate-500 hover:text-white">
              ← Saytga qaytish
            </Link>
          </div>
          <div className="mt-3">
            <AdminNav />
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
