"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        aria-label="Menu"
        onClick={() => setOpen((v) => !v)}
        className="rounded-md p-2 text-slate-300 hover:bg-slate-800"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open &&
        // Rendered via portal, not inline: the header uses `backdrop-blur`,
        // and in Chromium `backdrop-filter` establishes a containing block
        // for `position: fixed` descendants — so a fixed overlay nested
        // inside it gets sized relative to the ~64px header box instead of
        // the viewport. Escaping to document.body sidesteps that entirely.
        createPortal(
          <div className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto bg-slate-950 px-4 py-8">
            <nav className="flex flex-col gap-5 text-lg text-slate-200">
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

            <div className="mt-8 flex flex-col gap-3 border-t border-slate-800 pt-8">
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
          </div>,
          document.body,
        )}
    </>
  );
}
