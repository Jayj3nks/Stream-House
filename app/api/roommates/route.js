export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { mongoUserRepo } from "../../../lib/repositories/mongodb-user.js";

const JWT_SECRET = process.env.JWT_SECRET || "streamer-house-secret-key";

export async function GET(request) {
  try {
    const token = request.cookies.get("access_token")?.value;

    if (!token) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const user = await mongoUserRepo.getUserById(decoded.userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Get all users who have opted into roommate search
    const allUsers = await mongoUserRepo.getAllUsers();
    const roommateUsers = allUsers.filter(
      (u) =>
        u.id !== user.id && // Don't include the current user
        u.roommateOptIn && // Only include users who opted in
        u.city, // Only include users who have a location
    );

    console.log(
      "MongoDB: Found",
      roommateUsers.length,
      "roommate candidates for user:",
      user.email,
    );

    // Return roommate data
    const roommates = roommateUsers.map((u) => ({
      id: u.id,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl,
      platforms: u.platforms || [],
      niches: u.niches || [],
      city: u.city,
      timeZone: u.timeZone,
      bio: u.bio || "",
      // Add some mock roommate-specific fields
      experience: "Intermediate",
      lookingFor: "Content collaboration",
      budget: "$800-1200",
      availableFrom: "2024-01-01",
    }));

    return NextResponse.json({
      roommates: roommates.slice(0, 20), // Limit to 20 for now
      total: roommates.length,
      page: 1,
      hasMore: roommates.length > 20,
    });
  } catch (error) {
    console.error("MongoDB: Get roommates error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
