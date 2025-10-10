// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and auth pages
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.startsWith("/favicon.ico") ||
    (pathname.includes(".") &&
      (pathname.endsWith(".ico") ||
        pathname.endsWith(".png") ||
        pathname.endsWith(".jpg") ||
        pathname.endsWith(".jpeg") ||
        pathname.endsWith(".gif") ||
        pathname.endsWith(".svg") ||
        pathname.endsWith(".css") ||
        pathname.endsWith(".js") ||
        pathname.endsWith(".map"))) ||
    pathname === "/" ||
    pathname === "/signup" ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  // Get the access token from cookies with more detailed logging
  const allCookies = request.cookies.getAll();
  const token = request.cookies.get("access_token")?.value;

  console.log("Middleware: Path:", pathname);
  console.log(
    "Middleware: All cookies:",
    allCookies.map((c) => `${c.name}=${c.value.substring(0, 20)}...`),
  );
  console.log(
    "Middleware: Access token found:",
    !!token,
    token ? `Length: ${token.length}` : "None",
  );

  if (!token) {
    console.log("Middleware: No token found, redirecting to login");
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Simple token presence check (avoid JWT verification in edge runtime)
  // The actual validation will be done by individual pages
  if (token && token.length > 10) {
    console.log("Middleware: Token valid, allowing access to", pathname);
    return NextResponse.next();
  } else {
    console.log("Middleware: Invalid token format, redirecting to login");
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/settings/:path*",
    "/house/:path*",
    "/roommates/:path*",
    "/profile/:path*",
  ],
};
