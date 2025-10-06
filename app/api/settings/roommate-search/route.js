export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { sharedStorage } from '../../../../lib/storage/shared.js'

const JWT_SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key'

export async function PUT(request) {
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

    const { appearInRoommateSearch } = await request.json()
    
    console.log('Updating roommate search visibility for user:', user.email, 'to:', appearInRoommateSearch)

    // Update the user's roommate opt-in setting
    const success = sharedStorage.updateUser(user.id, {
      roommateOptIn: Boolean(appearInRoommateSearch)
    })
    
    if (!success) {
      return NextResponse.json(
        { error: "Failed to update roommate search setting" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      appearInRoommateSearch: Boolean(appearInRoommateSearch),
      message: "Roommate search visibility updated successfully"
    })
    
  } catch (error) {
    console.error('Update roommate search error:', error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}