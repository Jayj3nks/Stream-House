// lib/auth.ts
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key';

export type JWTPayload = { userId: string; email?: string };

export function signAccessToken(payload: JWTPayload, maxAge = "7d") {
  return jwt.sign(payload, SECRET, { expiresIn: maxAge });
}

export function verifyAccessToken(token: string) {
  try { 
    return jwt.verify(token, SECRET) as JWTPayload; 
  }
  catch { 
    return null; 
  }
}