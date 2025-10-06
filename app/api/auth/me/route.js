export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { mongoUserRepo } from '../../../../lib/repositories/mongodb-user.js'

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

    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await mongoUserRepo.getUserById(decoded.userId)
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" }, 
        { status: 401 }
      )
    }

    console.log('MongoDB: Auth me successful for:', user.email)
    
    const { passwordHash: _, ...userWithoutPassword } = user
    return NextResponse.json(userWithoutPassword)
    
  } catch (error) {
    console.error('MongoDB: Auth me error:', error)
    return NextResponse.json(
      { error: "Invalid token" }, 
      { status: 401 }
    )
  }
}