import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { userRepo } from '../../../lib/repositories/memory/index.js'
import { redirect } from 'next/navigation'

const JWT_SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key'

function sanitizeText(text) {
  if (typeof text !== 'string') return text
  return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
}

export async function POST(request) {
  try {
    const formData = await request.formData()
    
    // Extract form fields
    const email = formData.get('email')
    const password = formData.get('password')
    const displayName = formData.get('displayName')
    const platforms = JSON.parse(formData.get('platforms') || '[]')
    const niches = JSON.parse(formData.get('niches') || '[]')
    const games = JSON.parse(formData.get('games') || '[]')
    const city = formData.get('city') || ''
    const timeZone = formData.get('timeZone') || 'America/Los_Angeles'
    const hasSchedule = formData.get('hasSchedule') === 'true'
    const schedule = JSON.parse(formData.get('schedule') || '{}')
    const bio = formData.get('bio') || ''
    
    if (!email || !password || !displayName) {
      return new Response(`
        <html><body>
          <h2>Error</h2>
          <p>Email, password, and display name are required</p>
          <a href="/signup">Go back</a>
        </body></html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    if (password.length < 8) {
      return new Response(`
        <html><body>
          <h2>Error</h2>
          <p>Password must be at least 8 characters</p>
          <a href="/signup">Go back</a>
        </body></html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    if (platforms.length === 0) {
      return new Response(`
        <html><body>
          <h2>Error</h2>
          <p>Please select at least one platform</p>
          <a href="/signup">Go back</a>
        </body></html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const existingUser = await userRepo.getByEmail(email)
    if (existingUser) {
      return new Response(`
        <html><body>
          <h2>Error</h2>
          <p>User already exists</p>
          <a href="/signup">Go back</a>
        </body></html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const baseUsername = displayName.toLowerCase().replace(/[^a-z0-9]/g, '')
    let username = baseUsername
    let counter = 1
    
    while (await userRepo.getByUsername(username)) {
      username = `${baseUsername}${counter}`
      counter++
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await userRepo.create({
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

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    
    // Create response with redirect
    const response = NextResponse.redirect('https://fixmyapp.preview.emergentagent.com/dashboard', 302)
    
    response.cookies.set("access_token", token, {
      httpOnly: true,
      sameSite: "lax", 
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    
    return response
    
  } catch (error) {
    console.error('Signup form error:', error)
    return new Response(`
      <html><body>
        <h2>Error</h2>
        <p>Internal server error</p>
        <a href="/signup">Go back</a>
      </body></html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    })
  }
}