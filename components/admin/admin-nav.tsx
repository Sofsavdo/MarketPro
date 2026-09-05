"use client";

import { usePathname, useRouter } from "@/i18n/navigation";
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
  Sparkles,
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
  {
    label: "AI",
    items: [{ href: "/admin/ai-department", label: "AI Department", icon: Sparkles }],
  },
] as const;

type NavItem = { href: string; label: string; icon: (typeof NAV_GROUPS)[number]["items"][number]["icon"] };
const FLAT_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items as readonly NavItem[]);

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
  const router = useRouter();
  const activeItem = FLAT_ITEMS.find((item) => isActive(pathname, item.href));

  return (
    <nav>
      {/* Mobile: a single dropdown instead of a multi-row list that would
          eat most of the viewport while the header stays pinned (sticky). */}
      <select
        value={activeItem?.href ?? ""}
        onChange={(e) => router.push(e.target.value as never)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white sm:hidden"
      >
        {NAV_GROUPS.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.items.map((item) => (
              <option key={item.href} value={item.href}>
                {item.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Desktop/tablet: full grouped nav, wraps to extra rows if needed —
          fine there since the header isn't fighting for a small viewport. */}
      <div className="hidden flex-wrap items-center gap-x-5 gap-y-2 sm:flex">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[10px] font-medium tracking-wide text-slate-600 uppercase">
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
      </div>
    </nav>
  );
}
