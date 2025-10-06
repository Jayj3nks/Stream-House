export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { sharedStorage } from '../../../../lib/storage/shared.js'

export async function GET(request, { params }) {
  try {
    const { username } = params
    
    if (!username) {
      return NextResponse.json(
        { error: "Username is required" }, 
        { status: 400 }
      )
    }

    console.log('Looking up user by username:', username)
    
    // Get user by username
    const user = sharedStorage.getUserByUsername(username.toLowerCase())
    
    if (!user) {
      console.log('User not found for username:', username)
      return NextResponse.json(
        { error: "User not found" }, 
        { status: 404 }
      )
    }

    console.log('User found:', user.email)

    // Return user profile data (without password)
    const { passwordHash: _, ...userProfile } = user
    
    // Add mock engagement stats for now
    const profileData = {
      ...userProfile,
      stats: {
        totalPosts: 0,
        totalClips: 0,
        totalPoints: user.totalPoints || 0,
        engagePoints: 0,
        clipPoints: 0,
        collabPoints: 0
      },
      posts: [], // Mock empty posts for now
      clips: []  // Mock empty clips for now
    }

    return NextResponse.json(profileData)
    
  } catch (error) {
    console.error('Get user profile error:', error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}