export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { sharedStorage } from '../../../../lib/storage/shared.js'

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

    const user = sharedStorage.getUserById(decoded.userId)
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: 401 }
      )
    }

    const { name, description, niches, maxMembers, rules } = await request.json()

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "House name is required" }, 
        { status: 400 }
      )
    }

    if (!niches || niches.length === 0) {
      return NextResponse.json(
        { error: "At least one niche is required" }, 
        { status: 400 }
      )
    }

    // Create mock house for now (in real app, this would go to database)
    const house = {
      id: `house_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description || '',
      niches: niches,
      maxMembers: Math.max(2, Math.min(20, maxMembers || 5)),
      rules: rules || '',
      ownerId: user.id,
      ownerDisplayName: user.displayName,
      members: [user.id], // Creator is automatically a member
      createdAt: new Date().toISOString(),
      isPrivate: false,
      memberCount: 1,
      totalPoints: 0
    }

    // In a real app, we would save this to the database
    // For now, we'll just return the house data
    console.log('Created house:', house.name, 'for user:', user.email)

    return NextResponse.json({
      success: true,
      house: house,
      message: "House created successfully"
    })
    
  } catch (error) {
    console.error('Create house error:', error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}