import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin/access";
import { NextResponse } from "next/server";

const protectedPrefixes = ["/admin", "/api/admin"];

function githubAuthConfigured() {
  return Boolean(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);
}

export default auth((request) => {
  const pathname = request.nextUrl.pathname;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));
  if (!isProtected) return NextResponse.next();

  if (process.env.NODE_ENV === "development" && !githubAuthConfigured()) {
    return NextResponse.next();
  }

  if (isAdminEmail(request.auth?.user?.email)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.json({ ok: false, error: "Administrator access required." }, { status: request.auth ? 403 : 401 });
  }

  const signInUrl = new URL("/login", request.url);
  const callbackUrl = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  signInUrl.searchParams.set("callbackUrl", callbackUrl);
  return NextResponse.redirect(signInUrl);
});

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"]
};
