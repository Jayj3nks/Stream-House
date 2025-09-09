// lib/auth.ts
import jwt, { JwtPayload } from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  throw new Error("JWT_SECRET is not set in environment variables");
}

export interface JWTPayload extends JwtPayload {
  userId: string;
  email?: string;
}

export function signAccessToken(payload: JWTPayload, maxAge: string | number = "7d") {
  return jwt.sign(payload, SECRET, { expiresIn: maxAge });
}

export function verifyAccessToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, SECRET) as JWTPayload;
  } catch (err) {
    console.error("JWT verification failed:", err);
    return null;
  }
}
