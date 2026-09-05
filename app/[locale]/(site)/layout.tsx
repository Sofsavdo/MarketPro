import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

/**
 * The public site's own nav/footer chrome — scoped to this route group so
 * /admin (which has its own full header/nav in its own layout) doesn't get
 * two stacked sticky headers rendered on top of each other.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
