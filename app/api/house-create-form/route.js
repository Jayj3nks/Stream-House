import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { sharedStorage } from '../../../lib/storage/shared.js'

const JWT_SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key'

export async function POST(request) {
  try {
    const token = request.cookies.get("access_token")?.value
    
    if (!token) {
      return new Response(`
        <html><body>
          <h2>Error</h2>
          <p>Authentication required</p>
          <a href="/">Go back</a>
        </body></html>
      `, {
        status: 401,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (jwtError) {
      return new Response(`
        <html><body>
          <h2>Error</h2>
          <p>Invalid authentication</p>
          <a href="/">Go back</a>
        </body></html>
      `, {
        status: 401,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const user = sharedStorage.getUserById(decoded.userId)
    
    if (!user) {
      return new Response(`
        <html><body>
          <h2>Error</h2>
          <p>User not found</p>
          <a href="/">Go back</a>
        </body></html>
      `, {
        status: 401,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const formData = await request.formData()
    const name = formData.get('name')
    const description = formData.get('description') || ''
    const maxMembers = parseInt(formData.get('maxMembers')) || 5
    const rules = formData.get('rules') || ''
    const niches = JSON.parse(formData.get('niches') || '[]')

    if (!name || !name.trim()) {
      return new Response(`
        <html><body>
          <h2>Error</h2>
          <p>House name is required</p>
          <a href="/house/create">Go back</a>
        </body></html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    if (!niches || niches.length === 0) {
      return new Response(`
        <html><body>
          <h2>Error</h2>
          <p>At least one niche is required</p>
          <a href="/house/create">Go back</a>
        </body></html>
      `, {
        status: 400,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // Create house
    const house = {
      id: `house_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      description: description,
      niches: niches,
      maxMembers: Math.max(2, Math.min(20, maxMembers)),
      rules: rules,
      ownerId: user.id,
      ownerDisplayName: user.displayName,
      members: [user.id],
      createdAt: new Date().toISOString(),
      isPrivate: false,
      memberCount: 1,
      totalPoints: 0
    }

    console.log('Form: Created house:', house.name, 'for user:', user.email)

    // Redirect to success page or dashboard with success message
    const response = NextResponse.redirect('https://fixmyapp.preview.emergentagent.com/dashboard?house_created=1', 302)
    
    return response
    
  } catch (error) {
    console.error('Form house creation error:', error)
    return new Response(`
      <html><body>
        <h2>Error</h2>
        <p>Internal server error</p>
        <a href="/house/create">Go back</a>
      </body></html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    })
  }
}