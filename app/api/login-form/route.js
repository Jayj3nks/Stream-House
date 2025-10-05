import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { sharedStorage } from '../../../lib/storage/shared.js'

const JWT_SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key'

export async function POST(request) {
  try {
    const formData = await request.formData()
    const email = formData.get('email')
    const password = formData.get('password')
    
    console.log('Form login attempt for:', email)
    
    if (!email || !password) {
      return new Response(`
        <html><body>
          <h2>Error</h2>
          <p>Email and password are required</p>
          <a href="/">Go back</a>
        </body></html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const user = sharedStorage.getUserByEmail(email)
    if (!user) {
      console.log('Form login: User not found:', email)
      return new Response(`
        <html><body>
          <h2>Error</h2>
          <p>Invalid credentials</p>
          <a href="/">Go back</a>
        </body></html>
      `, {
        status: 401,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      console.log('Form login: Invalid password for:', email)
      return new Response(`
        <html><body>
          <h2>Error</h2>
          <p>Invalid credentials</p>
          <a href="/">Go back</a>
        </body></html>
      `, {
        status: 401,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    console.log('Form login: Login successful for:', email)

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    
    // Create response with redirect to dashboard
    const response = NextResponse.redirect('https://api-dynamic-fix.preview.emergentagent.com/dashboard', 302)
    
    response.cookies.set("access_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false, // Disable for testing
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })
    
    console.log('Form login: Cookie set, redirecting to dashboard')
    return response
    
  } catch (error) {
    console.error('Form login error:', error)
    return new Response(`
      <html><body>
        <h2>Error</h2>
        <p>Internal server error</p>
        <a href="/">Go back</a>
      </body></html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    })
  }
}