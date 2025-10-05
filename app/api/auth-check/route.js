export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { sharedStorage } from '../../../lib/storage/shared.js'

const JWT_SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key'

export async function GET(request) {
  try {
    const token = request.cookies.get("access_token")?.value
    
    console.log('Auth check: Token present:', !!token)
    
    if (!token) {
      return NextResponse.json(
        { error: "No token provided", authenticated: false }, 
        { status: 401 }
      )
    }

    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
      console.log('Auth check: Token valid for user:', decoded.userId)
    } catch (jwtError) {
      console.log('Auth check: Invalid token:', jwtError.message)
      return NextResponse.json(
        { error: "Invalid token", authenticated: false }, 
        { status: 401 }
      )
    }

    const user = sharedStorage.getUserById(decoded.userId)
    
    if (!user) {
      console.log('Auth check: User not found:', decoded.userId)
      return NextResponse.json(
        { error: "User not found", authenticated: false }, 
        { status: 401 }
      )
    }

    console.log('Auth check: Success for user:', user.email)
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