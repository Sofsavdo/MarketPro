import { AiDepartmentNav } from "@/components/admin/ai-department-nav";

export default function AiDepartmentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Marketing Department</h1>
        <p className="mt-1 text-sm text-slate-400">
          @amaliy.biznes va @izdosh.academy uchun kontent, raqobatchi tahlili va task yordamchisi.
        </p>
      </div>
      <AiDepartmentNav />
      {children}
    </div>
  );
}
