import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/lms/is-admin";
import { Link } from "@/i18n/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentProfile();

  if (!user) redirect("/login");
  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex items-center gap-6 border-b border-slate-800 pb-4 text-sm">
        <Link href="/admin" className="font-semibold text-white">
          Admin — Kurslar
        </Link>
        <Link href="/dashboard" className="ml-auto text-slate-400 hover:text-white">
          ← Saytga qaytish
        </Link>
      </div>
      {children}
    </div>
  );
}
