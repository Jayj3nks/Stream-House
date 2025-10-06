export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { mongoUserRepo } from '../../../../../lib/repositories/mongodb-user.js'

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

    const user = await mongoUserRepo.getUserById(decoded.userId)
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: 401 }
      )
    }

    console.log('MongoDB: Getting houses for user:', user.email)

    // For now, return empty array as houses aren't implemented yet
    // In the future, this would query the houses the user belongs to
    return NextResponse.json({
      houses: [],
      total: 0
    })
    
  } catch (error) {
    console.error('MongoDB: Get user houses error:', error)
    return NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    )
  }
}