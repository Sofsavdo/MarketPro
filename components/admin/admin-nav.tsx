"use client";

import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  Radio,
  BarChart3,
  Users,
  Wallet,
  CalendarClock,
  ListPlus,
  Tag,
  Star,
  MonitorSmartphone,
} from "lucide-react";

const NAV_GROUPS = [
  {
    label: "Kontent",
    items: [
      { href: "/admin", label: "Kurslar", icon: LayoutGrid },
      { href: "/admin/landing", label: "Landing", icon: MonitorSmartphone },
      { href: "/admin/live-sessions", label: "Jonli darslar", icon: Radio },
    ],
  },
  {
    label: "Savdo",
    items: [
      { href: "/admin/analytics", label: "Statistika", icon: BarChart3 },
      { href: "/admin/leads", label: "Mijozlar (CRM)", icon: Users },
      { href: "/admin/payments", label: "To'lovlar", icon: Wallet },
      { href: "/admin/installments", label: "Muddatli to'lovlar", icon: CalendarClock },
    ],
  },
  {
    label: "Boshqa",
    items: [
      { href: "/admin/waitlist", label: "Kutish ro'yxati", icon: ListPlus },
      { href: "/admin/promo-codes", label: "Promo-kodlar", icon: Tag },
      { href: "/admin/reviews", label: "Sharhlar", icon: Star },
    ],
  },
] as const;

/**
 * A course/lesson editor page (/admin/courses/[id], /admin/lessons/[id])
 * still counts as the "Kurslar" section — only an exact match on every
 * other item would otherwise leave the nav showing no active tab there.
 */
function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin" || pathname.startsWith("/admin/courses") || pathname.startsWith("/admin/lessons");
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-x-5 gap-y-2">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 hidden text-[10px] font-medium tracking-wide text-slate-600 uppercase sm:inline">
            {group.label}
          </span>
          {group.items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-amber-500/15 text-amber-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white",
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
