import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "streamer-house-secret-key";

export interface AuthCookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: "strict" | "lax" | "none";
  path?: string;
  maxAge?: number;
  domain?: string;
}

export const defaultCookieOptions: AuthCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
  domain: undefined, // Let browser set the correct domain
};

/**
 * Set authentication cookie in NextResponse
 */
export function setAuthCookie(
  response: NextResponse,
  token: string,
  options: AuthCookieOptions = {},
): void {
  const cookieOptions = { ...defaultCookieOptions, ...options };

  response.cookies.set("access_token", token, cookieOptions);
}

/**
 * Set authentication cookie using Next.js cookies() (for server actions)
 */
export function setAuthCookieServerAction(
  token: string,
  options: AuthCookieOptions = {},
): void {
  const cookieOptions = { ...defaultCookieOptions, ...options };
  const cookieStore = cookies();

  cookieStore.set("access_token", token, cookieOptions);
}

/**
 * Clear authentication cookie
 */
export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set("access_token", "", {
    ...defaultCookieOptions,
    maxAge: 0,
  });
}

/**
 * Clear authentication cookie using server action
 */
export function clearAuthCookieServerAction(): void {
  const cookieStore = cookies();
  cookieStore.set("access_token", "", {
    ...defaultCookieOptions,
    maxAge: 0,
  });
}

/**
 * Get authentication token from request cookies
 */
export function getAuthToken(request: Request): string | null {
  try {
    const cookieHeader = request.headers.get("cookie");
    if (!cookieHeader) return null;

    const cookies = cookieHeader.split(";").reduce(
      (acc, cookie) => {
        const [name, value] = cookie.trim().split("=");
        acc[name] = value;
        return acc;
      },
      {} as Record<string, string>,
    );

    return cookies["access_token"] || null;
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
}

/**
 * Verify JWT token and return payload
 */
export function verifyAuthToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
}

/**
 * Create JWT token with user ID
 */
export function createAuthToken(
  userId: string,
  expiresIn: string = "7d",
): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn });
}

/**
 * Validate authentication from request and return user ID
 */
export function validateAuthRequest(request: Request): {
  userId: string | null;
  error?: string;
} {
  const token = getAuthToken(request);

  if (!token) {
    return { userId: null, error: "No token provided" };
  }

  const decoded = verifyAuthToken(token);

  if (!decoded) {
    return { userId: null, error: "Invalid token" };
  }

  return { userId: decoded.userId };
}

/**
 * Create authenticated response with proper cookie settings
 */
export function createAuthResponse(
  data: any,
  token: string,
  status: number = 200,
): NextResponse {
  const response = NextResponse.json(data, { status });
  setAuthCookie(response, token);
  return response;
}

/**
 * Create error response for authentication failures
 */
export function createAuthErrorResponse(
  message: string,
  status: number = 401,
): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
