export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { sharedStorage } from '../../../lib/storage/shared.js'

const JWT_SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key'

export async function GET(request) {
  try {
    const token = request.cookies.get("access_token")?.value
    
    if (!token) {
      return NextResponse.json(
        { error: "No token provided" }, 
        { status: 401 }
      )
    }

    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (jwtError) {
      return NextResponse.json(
        { error: "Invalid token" }, 
        { status: 401 }
      )
    }

    const user = sharedStorage.getUserById(decoded.userId)
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: 401 }
      )
    }

    // Get all users who have opted into roommate search
    const allUsers = sharedStorage.getAllUsers()
    const roommateUsers = allUsers.filter(u => 
      u.id !== user.id && // Don't include the current user
      u.roommateOptIn && // Only include users who opted in
      u.city // Only include users who have a location
    )

    // Return mock roommate data for now
    const roommates = roommateUsers.map(u => ({
      id: u.id,
      displayName: u.displayName,
      username: u.username,
      avatarUrl: u.avatarUrl,
      platforms: u.platforms || [],
      niches: u.niches || [],
      city: u.city,
      timeZone: u.timeZone,
      bio: u.bio || '',
      // Add some mock roommate-specific fields
      experience: 'Intermediate',
      lookingFor: 'Content collaboration',
      budget: '$800-1200',
      availableFrom: '2024-01-01'
    }))

    return NextResponse.json({
      roommates: roommates.slice(0, 20), // Limit to 20 for now
      total: roommates.length,
      page: 1,
      hasMore: roommates.length > 20
    })
    
  } catch (error) {
    console.error('Get roommates error:', error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}