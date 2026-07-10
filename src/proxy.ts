import { NextResponse, type NextRequest } from "next/server";

/**
 * Lightweight gate (Next.js "proxy", formerly middleware): redirect
 * unauthenticated users to /login for app pages, and authenticated users away
 * from the public auth pages. Real verification happens in the API routes
 * (this only checks cookie presence).
 */
const PUBLIC_PAGES = ["/login", "/register", "/forgot", "/reset"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has("pf_session");
  const isPublic = PUBLIC_PAGES.some((p) => pathname.startsWith(p));

  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  if (hasSession && isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Protect everything except API, static assets, and PWA files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons).*)"],
};
