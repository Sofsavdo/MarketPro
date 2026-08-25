import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";
import { LogoutButton } from "@/components/layout/logout-button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { getCurrentProfile } from "@/lib/lms/is-admin";

export async function Header() {
  const t = await getTranslations();
  const { user, profile } = await getCurrentProfile();

  const navLinks = [
    { href: "/courses" as const, label: t("nav.courses") },
    { href: "/pricing" as const, label: t("nav.pricing") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-white">
          <span className="text-amber-500">{t("brand.name")}</span>
          <span className="hidden text-sm font-normal text-slate-400 sm:inline">Academy</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="hover:text-white">
              {link.label}
            </Link>
          ))}
          {profile?.role === "admin" && (
            <Link href="/admin" className="hover:text-white">
              Admin
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LocaleSwitcher />
          {user ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">{t("nav.dashboard")}</Link>
              </Button>
              <LogoutButton label={t("nav.logout")} />
            </>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">{t("nav.login")}</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">{t("nav.register")}</Link>
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <LocaleSwitcher />
          <MobileNav
            navLinks={navLinks}
            isLoggedIn={!!user}
            isAdmin={profile?.role === "admin"}
            labels={{
              dashboard: t("nav.dashboard"),
              login: t("nav.login"),
              register: t("nav.register"),
              logout: t("nav.logout"),
            }}
          />
        </div>
      </div>
    </header>
  );
}
