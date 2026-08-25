"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/layout/logout-button";

export function MobileNav({
  navLinks,
  isLoggedIn,
  isAdmin,
  labels,
  liveLabel,
}: {
  navLinks: { href: "/courses" | "/pricing" | "/about"; label: string }[];
  isLoggedIn: boolean;
  isAdmin: boolean;
  labels: { dashboard: string; login: string; register: string; logout: string };
  liveLabel: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-2 text-slate-300 hover:bg-slate-800"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed inset-x-0 top-16 z-40 border-b border-slate-800 bg-slate-950 px-4 py-6">
          <nav className="flex flex-col gap-4 text-base text-slate-200">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}>
                {link.label}
              </Link>
            ))}
            {isLoggedIn && (
              <Link href="/live" onClick={() => setOpen(false)}>
                {liveLabel}
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" onClick={() => setOpen(false)}>
                Admin
              </Link>
            )}
          </nav>

          <div className="mt-6 flex flex-col gap-3">
            {isLoggedIn ? (
              <>
                <Button asChild variant="outline">
                  <Link href="/dashboard" onClick={() => setOpen(false)}>
                    {labels.dashboard}
                  </Link>
                </Button>
                <LogoutButton label={labels.logout} />
              </>
            ) : (
              <>
                <Button asChild variant="outline">
                  <Link href="/login" onClick={() => setOpen(false)}>
                    {labels.login}
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/register" onClick={() => setOpen(false)}>
                    {labels.register}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
