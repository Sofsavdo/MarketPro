"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  MessageSquare,
  Lightbulb,
  Users,
  ListChecks,
  BrainCircuit,
  ShieldQuestion,
  FileBarChart,
  UsersRound,
  CalendarClock,
} from "lucide-react";

const TABS = [
  { href: "/admin/ai-department", label: "Chat", icon: MessageSquare },
  { href: "/admin/ai-department/content", label: "Kontent", icon: Lightbulb },
  { href: "/admin/ai-department/competitors", label: "Raqobatchilar", icon: Users },
  { href: "/admin/ai-department/tasks", label: "Tasklar", icon: ListChecks },
  { href: "/admin/ai-department/objections", label: "E'tirozlar", icon: ShieldQuestion },
  { href: "/admin/ai-department/reports", label: "Hisobotlar", icon: FileBarChart },
  { href: "/admin/ai-department/meetings", label: "Yig'ilishlar", icon: CalendarClock },
  { href: "/admin/ai-department/agents", label: "Mutaxassislar", icon: UsersRound },
  { href: "/admin/ai-department/brand", label: "Brend xotirasi", icon: BrainCircuit },
] as const;

export function AiDepartmentNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-1.5 border-b border-slate-800 pb-3">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
              active ? "bg-amber-500/15 text-amber-400" : "text-slate-400 hover:bg-slate-800 hover:text-white",
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
