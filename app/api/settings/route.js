export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { mongoUserRepo } from "../../../lib/repositories/mongodb-user.js";

const JWT_SECRET = process.env.JWT_SECRET || "streamer-house-secret-key";

export async function PUT(request) {
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

    const updates = await request.json();

    console.log("MongoDB: Updating user settings:", updates);

    // Validate that at least one field is being updated
    const allowedFields = [
      "displayName",
      "email",
      "bio",
      "city",
      "timeZone",
      "platforms",
      "niches",
      "games",
      "roommateOptIn",
    ];
    const validUpdates = Object.keys(updates).filter((key) =>
      allowedFields.includes(key),
    );

    if (validUpdates.length === 0) {
      return NextResponse.json(
        { error: "At least one valid field must be provided to update" },
        { status: 400 },
      );
    }

    // Update the user
    const updatedUser = await mongoUserRepo.updateUser(user.id, updates);

    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to update user" },
        { status: 500 },
      );
    }

    const { passwordHash: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("MongoDB: Update settings error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
