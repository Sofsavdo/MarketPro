import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";
import { SOFSAVDO_REF_COOKIE } from "./lib/constants";

const intlMiddleware = createMiddleware(routing);

// 30 days — matches the attribution window Sofsavdo's own referral cookie uses
// (see ReferralController.handleReferral in sofsavdo.com), so a click that
// lands here via a Sofsavdo blogger link still counts toward that blogger's
// commission even if the buyer doesn't purchase on their first visit.
const SOFSAVDO_REF_MAX_AGE = 30 * 24 * 60 * 60;

export default async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  // Sofsavdo redirects a blogger's referral click here with `?ref=<clickToken>`
  // (see /r/:code in sofsavdo.com). Captured here, once, at the network edge —
  // rather than in every page component — since a Server Component can't set
  // cookies during render, and the buyer may land on any page, not just a
  // known entry point.
  const ref = request.nextUrl.searchParams.get("ref");
  if (ref) {
    // httpOnly — read back server-side only (the payment API routes), never
    // by client JS. Nothing sensitive derives from this cookie's value being
    // wrong (a forged one only misattributes a 5% commission, it can never
    // change what a buyer pays — see resolvePurchase's own comment on why
    // amounts are always re-derived server-side), but there's no reason to
    // expose it to the page either.
    response.cookies.set(SOFSAVDO_REF_COOKIE, ref, {
      maxAge: SOFSAVDO_REF_MAX_AGE,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
  }

  return updateSession(request, response);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
