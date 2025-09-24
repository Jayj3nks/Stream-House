// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key'

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

  try {
    // Verify the JWT token
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Middleware: Valid token for', pathname, 'user:', (decoded as any)?.userId);
    return NextResponse.next();
  } catch (error) {
    console.log('Middleware: Invalid token for', pathname, 'error:', error.message);
    
    // Instead of immediate redirect, allow one more chance for cookie to propagate
    // This helps with timing issues after login
    if (pathname === '/dashboard' && request.nextUrl.searchParams.has('retry') === false) {
      console.log('Middleware: Giving dashboard one retry for cookie propagation');
      const url = request.nextUrl.clone();
      url.searchParams.set('retry', '1');
      return NextResponse.redirect(url);
    }
    
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/house/:path*", "/roommates/:path*", "/profile/:path*"],
};
