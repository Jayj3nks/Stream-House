// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and auth pages
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/' ||
    pathname === '/signup' ||
    pathname === '/login'
  ) {
    return NextResponse.next();
  }

  // Get the access token from cookies
  const token = request.cookies.get("access_token")?.value;

  if (!token) {
    console.log('Middleware: No token found for', pathname);
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Simple token presence check (avoid JWT verification in edge runtime)
  // The actual validation will be done by individual pages
  if (token && token.length > 10) {
    console.log('Middleware: Token present, allowing access to', pathname);
    return NextResponse.next();
  } else {
    console.log('Middleware: Invalid token format for', pathname);
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/house/:path*", "/roommates/:path*", "/profile/:path*"],
};
