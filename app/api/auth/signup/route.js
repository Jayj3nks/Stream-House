export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { mongoUserRepo } from "../../../../lib/repositories/mongodb-user.js";

const JWT_SECRET = process.env.JWT_SECRET || "streamer-house-secret-key";

function sanitizeText(text) {
  if (typeof text !== "string") return text;
  return text.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    "",
  );
}

export async function POST(request) {
  try {
    const {
      email,
      password,
      displayName,
      platforms = [],
      niches = [],
      games = [],
      city = "",
      timeZone = "America/Los_Angeles",
      hasSchedule = false,
      schedule = {},
      bio = "",
    } = await request.json();

    console.log("MongoDB: Signup attempt for:", email);

    if (!email || !password || !displayName) {
      return NextResponse.json(
        { error: "Email, password, and display name are required" },
        { status: 400 },
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }

    const existingUser = await mongoUserRepo.getUserByEmail(email);
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 400 },
      );
    }

    const baseUsername = displayName.toLowerCase().replace(/[^a-z0-9]/g, "");
    let username = baseUsername;
    let counter = 1;

    while (await mongoUserRepo.getUserByUsername(username)) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await mongoUserRepo.createUser({
      email: sanitizeText(email),
      passwordHash,
      displayName: sanitizeText(displayName),
      username,
      platforms: platforms.map((p) => sanitizeText(p)),
      niches: niches.map((n) => sanitizeText(n)),
      games: games.map((g) => sanitizeText(g)),
      city: sanitizeText(city),
      timeZone: sanitizeText(timeZone),
      hasSchedule: Boolean(hasSchedule),
      schedule: schedule || {},
      bio: sanitizeText(bio).slice(0, 500),
    });

    if (!user) {
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 },
      );
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, {
      expiresIn: "7d",
    });
    const { passwordHash: _, ...userWithoutPassword } = user;

    const response = NextResponse.json({
      token,
      user: userWithoutPassword,
    });

    // Use consistent cookie settings across all auth endpoints
    response.cookies.set("access_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      domain: undefined, // Let browser set the correct domain
    });

    console.log(
      "MongoDB: Signup successful, cookie set, token length:",
      token.length,
    );

    return response;
  } catch (error) {
    console.error("MongoDB: Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
