export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { mongoUserRepo } from '../../../../lib/repositories/mongodb-user.js'

const JWT_SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key'

export async function POST(request) {
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

    const user = await mongoUserRepo.getUserById(decoded.userId)
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('avatar')
    
    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      )
    }

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      )
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      return NextResponse.json(
        { error: "File size must be less than 5MB" },
        { status: 400 }
      )
    }

    // For now, just create a avatar URL using dicebear
    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}&backgroundColor=b6e3f4,c0aede,d1d4f9`
    
    // Update user with new avatar URL
    const updatedUser = await mongoUserRepo.updateUser(user.id, {
      avatarUrl: avatarUrl
    })
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: "Failed to update avatar" },
        { status: 500 }
      )
    }

    console.log('MongoDB: Avatar updated for user:', user.email)

    return NextResponse.json({
      success: true,
      avatarUrl: avatarUrl,
      message: "Avatar updated successfully"
    })
    
  } catch (error) {
    console.error('MongoDB: Avatar upload error:', error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}