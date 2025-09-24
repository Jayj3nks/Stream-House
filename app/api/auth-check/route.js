import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { userRepo } from '../../../lib/repositories/memory/index.js'

const JWT_SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key'

export async function GET(request) {
  try {
    const token = request.cookies.get("access_token")?.value
    
    if (!token) {
      return NextResponse.json(
        { error: "No token provided", authenticated: false }, 
        { status: 401 }
      )
    }

    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (jwtError) {
      return NextResponse.json(
        { error: "Invalid token", authenticated: false }, 
        { status: 401 }
      )
    }

    const user = await userRepo.getById(decoded.userId)
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found", authenticated: false }, 
        { status: 401 }
      )
    }

    const { passwordHash: _, ...userWithoutPassword } = user
    return NextResponse.json({
      authenticated: true,
      user: userWithoutPassword
    })
    
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: "Internal server error", authenticated: false }, 
      { status: 500 }
    )
  }
}