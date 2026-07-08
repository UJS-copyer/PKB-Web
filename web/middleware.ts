import { NextResponse } from "next/server";

const protectedPrefixes = ["/admin", "/api/admin"];
const canonicalPrefixes = ["/admin", "/api/admin", "/login", "/api/auth"];
const sessionCookieNames = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token"
];

export default function middleware(request: Request & { nextUrl: URL; cookies: { has(name: string): boolean } }) {
  const pathname = request.nextUrl.pathname;
  const needsCanonicalHost = canonicalPrefixes.some((prefix) => pathname.startsWith(prefix));
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (!needsCanonicalHost && !isProtected) return NextResponse.next();

  const canonicalUrlValue = process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NODE_ENV === "production" && canonicalUrlValue && needsCanonicalHost) {
    const canonicalUrl = new URL(canonicalUrlValue);
    const requestOrigin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const canonicalOrigin = canonicalUrl.origin;

    if (requestOrigin !== canonicalOrigin) {
      const redirectUrl = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, canonicalUrl);
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (!isProtected) return NextResponse.next();

  const hasSessionCookie = sessionCookieNames.some((name) => request.cookies.has(name));
  if (hasSessionCookie) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
  }

  const signInUrl = new URL("/login", request.url);
  const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  signInUrl.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
