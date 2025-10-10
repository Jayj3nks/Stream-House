export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { mongoUserRepo } from "../../../../lib/repositories/mongodb-user.js";

const JWT_SECRET = process.env.JWT_SECRET || "streamer-house-secret-key";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    console.log("MongoDB: Login attempt for:", email);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const user = await mongoUserRepo.getUserByEmail(email);
    if (!user) {
      console.log("MongoDB: User not found:", email);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      console.log("MongoDB: Invalid password for:", email);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    console.log("MongoDB: Login successful for:", email);

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

    console.log("MongoDB: Login cookie set, token length:", token.length);

    return response;
  } catch (error) {
    console.error("MongoDB: Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
