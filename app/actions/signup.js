'use server'

import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sharedStorage } from '../../lib/storage/shared.js'
import { cookies } from 'next/headers'

const JWT_SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key'

function sanitizeText(text) {
  if (typeof text !== 'string') return text
  return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}

export async function createAccount(formData) {
  try {
    const { 
      email, 
      password, 
      displayName, 
      platforms = [], 
      niches = [], 
      games = [], 
      city = '', 
      timeZone = 'America/Los_Angeles', 
      hasSchedule = false, 
      schedule = {}, 
      bio = '' 
    } = formData
    
    console.log('Server action: Creating account for:', email)
    
    if (!email || !password || !displayName) {
      return { error: "Email, password, and display name are required" }
    }

    if (password.length < 8) {
      return { error: "Password must be at least 8 characters" }
    }

    if (platforms.length === 0) {
      return { error: "Please select at least one platform" }
    }

    const existingUser = sharedStorage.getUserByEmail(email)
    if (existingUser) {
      return { error: "User already exists" }
    }

    const baseUsername = displayName.toLowerCase().replace(/[^a-z0-9]/g, '')
    let username = baseUsername
    let counter = 1
    
    while (sharedStorage.getUserByUsername(username)) {
      username = `${baseUsername}${counter}`
      counter++
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = sharedStorage.createUser({
      email: sanitizeText(email),
      passwordHash,
      displayName: sanitizeText(displayName),
      username,
      platforms: platforms.map(p => sanitizeText(p)),
      niches: niches.map(n => sanitizeText(n)),
      games: games.map(g => sanitizeText(g)),
      city: sanitizeText(city),
      timeZone: sanitizeText(timeZone),
      hasSchedule: Boolean(hasSchedule),
      schedule: schedule || {},
      bio: sanitizeText(bio).slice(0, 500)
    })

    if (!user) {
      return { error: "Failed to create user" }
    }

    console.log('Server action: User created successfully:', user.id)

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    
    console.log('Server action: Setting authentication cookie...')
    // Set cookie using Next.js server action
    const cookieStore = cookies()
    cookieStore.set("access_token", token, {
      httpOnly: true,
      sameSite: "lax", 
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    
    // Verify the cookie was set by trying to read it back
    const setCookie = cookieStore.get("access_token")
    console.log('Server action: Cookie set result:', !!setCookie?.value)
    
    console.log('Server action: Returning success with redirect instruction')
    
    // Return success with user data and redirect instruction
    const { passwordHash: _, ...userWithoutPassword } = user
    return { 
      success: true, 
      user: userWithoutPassword,
      redirect: '/dashboard',
      authenticated: true
    }
    
  } catch (error) {
    console.error('Server action: Signup error:', error)
    return { error: "Internal server error" }
  }
}