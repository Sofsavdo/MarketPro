import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export default function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location === path;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <span className="hidden font-bold sm:inline-block">
              BiznesYordam
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {user && (
              <>
                <Link
                  href="/partner-dashboard"
                  className={cn(
                    "transition-colors hover:text-foreground/80",
                    isActive("/partner-dashboard") ? "text-foreground" : "text-foreground/60"
                  )}
                >
                  Dashboard
                </Link>
                {user.role === "admin" && (
                  <Link
                    href="/admin-panel"
                    className={cn(
                      "transition-colors hover:text-foreground/80",
                      isActive("/admin-panel") ? "text-foreground" : "text-foreground/60"
                    )}
                  >
                    Admin Panel
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <nav className="flex items-center">
            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground">
                  Welcome, {user.firstName || user.username}
                </span>
                <Button variant="outline" size="sm" onClick={logout}>
                  Logout
                </Button>
              </div>
            ) : (
              <Link href="/partner-registration">
                <Button variant="default" size="sm">
                  Get Started
                </Button>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </nav>
  );
}