// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAccessToken } from "@/lib/auth";

export function middleware(req: NextRequest) {
  const protectedPaths = ["/dashboard", "/house", "/roommates", "/profile", "/settings"];
  const isProtected = protectedPaths.some((p) => req.nextUrl.pathname.startsWith(p));
  
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get("access_token")?.value;
  if (!token || !verifyAccessToken(token)) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/house/:path*", "/roommates/:path*", "/profile/:path*", "/settings/:path*"],
};