import { MongoClient } from 'mongodb'
import { v4 as uuidv4 } from 'uuid'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
  }
  return db
}

// Helper function to handle CORS
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', process.env.CORS_ORIGINS || '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  return response
}

// JWT Secret (in production, use a proper secret)
const JWT_SECRET = process.env.JWT_SECRET || 'creator-squad-secret-key'

// Helper to verify JWT token
function verifyToken(request) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided')
  }
  
  const token = authHeader.substring(7)
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Helper to fetch URL metadata
async function fetchUrlMetadata(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch URL')
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    const title = $('title').text() || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content') || 
                  'Untitled'
    
    const thumbnail = $('meta[property="og:image"]').attr('content') || 
                     $('meta[name="twitter:image"]').attr('content') || 
                     ''
    
    // Detect platform
    let platform = 'Other'
    if (url.includes('tiktok.com')) platform = 'TikTok'
    else if (url.includes('youtube.com') || url.includes('youtu.be')) platform = 'YouTube'
    else if (url.includes('instagram.com')) platform = 'Instagram'
    else if (url.includes('twitch.tv')) platform = 'Twitch'
    else if (url.includes('twitter.com') || url.includes('x.com')) platform = 'Twitter'
    
    return { title: title.slice(0, 200), thumbnail, platform }
  } catch (error) {
    console.error('Error fetching URL metadata:', error)
    return { 
      title: 'Content Post', 
      thumbnail: '', 
      platform: 'Other' 
    }
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return handleCORS(new NextResponse(null, { status: 200 }))
}

// Route handler function
async function handleRoute(request, { params }) {
  const { path = [] } = params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    const db = await connectToMongo()

    // Root endpoint
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ message: "CreatorSquad API" }))
    }

    // AUTH ROUTES
    
    // Sign up - POST /api/auth/signup
    if (route === '/auth/signup' && method === 'POST') {
      const { email, password, displayName } = await request.json()
      
      if (!email || !password || !displayName) {
        return handleCORS(NextResponse.json(
          { error: "Email, password, and display name are required" }, 
          { status: 400 }
        ))
      }

      // Check if user exists
      const existingUser = await db.collection('users').findOne({ email })
      if (existingUser) {
        return handleCORS(NextResponse.json(
          { error: "User already exists" }, 
          { status: 400 }
        ))
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Create user
      const user = {
        id: uuidv4(),
        email,
        password: hashedPassword,
        displayName,
        createdAt: new Date(),
        platforms: [],
        niches: [],
        credits: 0
      }

      await db.collection('users').insertOne(user)

      // Create JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

      const { password: _, ...userWithoutPassword } = user
      return handleCORS(NextResponse.json({ 
        token, 
        user: userWithoutPassword 
      }))
    }

    // Sign in - POST /api/auth/login
    if (route === '/auth/login' && method === 'POST') {
      const { email, password } = await request.json()
      
      if (!email || !password) {
        return handleCORS(NextResponse.json(
          { error: "Email and password are required" }, 
          { status: 400 }
        ))
      }

      // Find user
      const user = await db.collection('users').findOne({ email })
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "Invalid credentials" }, 
          { status: 401 }
        ))
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return handleCORS(NextResponse.json(
          { error: "Invalid credentials" }, 
          { status: 401 }
        ))
      }

      // Create JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

      const { password: _, ...userWithoutPassword } = user
      return handleCORS(NextResponse.json({ 
        token, 
        user: userWithoutPassword 
      }))
    }

    // Get current user - GET /api/auth/me
    if (route === '/auth/me' && method === 'GET') {
      const tokenData = verifyToken(request)
      const user = await db.collection('users').findOne({ id: tokenData.userId })
      
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      const { password: _, ...userWithoutPassword } = user
      return handleCORS(NextResponse.json(userWithoutPassword))
    }

    // SQUAD ROUTES

    // Create squad - POST /api/squads
    if (route === '/squads' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { name, ownerId } = await request.json()
      
      if (!name || !ownerId) {
        return handleCORS(NextResponse.json(
          { error: "Squad name and owner ID are required" }, 
          { status: 400 }
        ))
      }

      const squad = {
        id: uuidv4(),
        name,
        ownerId,
        members: [ownerId],
        memberCount: 1,
        createdAt: new Date(),
        visibility: 'private'
      }

      await db.collection('squads').insertOne(squad)
      return handleCORS(NextResponse.json(squad))
    }

    // Get user's squad - GET /api/squads/user/{userId}
    if (route.startsWith('/squads/user/') && method === 'GET') {
      const userId = route.split('/')[3]
      const squad = await db.collection('squads').findOne({ 
        members: { $in: [userId] } 
      })
      
      if (!squad) {
        return handleCORS(NextResponse.json(null))
      }

      return handleCORS(NextResponse.json(squad))
    }

    // POST ROUTES

    // Create post - POST /api/posts
    if (route === '/posts' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { url, squadId, userId } = await request.json()
      
      if (!url || !squadId || !userId) {
        return handleCORS(NextResponse.json(
          { error: "URL, squad ID, and user ID are required" }, 
          { status: 400 }
        ))
      }

      // Fetch URL metadata
      const metadata = await fetchUrlMetadata(url)

      // Get user info
      const user = await db.collection('users').findOne({ id: userId })

      const post = {
        id: uuidv4(),
        url,
        squadId,
        userId,
        authorName: user?.displayName || 'Unknown',
        title: metadata.title,
        thumbnail: metadata.thumbnail,
        platform: metadata.platform,
        createdAt: new Date(),
        engagements: []
      }

      await db.collection('posts').insertOne(post)
      return handleCORS(NextResponse.json(post))
    }

    // Get squad posts - GET /api/posts/squad/{squadId}
    if (route.startsWith('/posts/squad/') && method === 'GET') {
      const squadId = route.split('/')[3]
      
      const posts = await db.collection('posts')
        .find({ squadId })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()

      // Get engagements for each post
      for (let post of posts) {
        const engagements = await db.collection('engagements')
          .find({ postId: post.id })
          .toArray()
        post.engagements = engagements
      }

      return handleCORS(NextResponse.json(posts))
    }

    // ENGAGEMENT ROUTES

    // Create engagement - POST /api/engagements
    if (route === '/engagements' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { postId, userId, type } = await request.json()
      
      if (!postId || !userId || !type) {
        return handleCORS(NextResponse.json(
          { error: "Post ID, user ID, and type are required" }, 
          { status: 400 }
        ))
      }

      // Check if user already engaged with this post in the same way
      const existingEngagement = await db.collection('engagements').findOne({
        postId,
        userId,
        type
      })

      if (existingEngagement) {
        return handleCORS(NextResponse.json(
          { error: "Already engaged" }, 
          { status: 400 }
        ))
      }

      const engagement = {
        id: uuidv4(),
        postId,
        userId,
        type, // 'like', 'comment', 'share'
        createdAt: new Date()
      }

      await db.collection('engagements').insertOne(engagement)

      // Update user credits
      const creditsEarned = type === 'like' ? 1 : type === 'comment' ? 2 : 3
      await db.collection('users').updateOne(
        { id: userId },
        { $inc: { credits: creditsEarned } }
      )

      return handleCORS(NextResponse.json(engagement))
    }

    // CREDITS ROUTES

    // Get user credits - GET /api/credits/{userId}
    if (route.startsWith('/credits/') && method === 'GET') {
      const userId = route.split('/')[2]
      const user = await db.collection('users').findOne({ id: userId })
      
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      return handleCORS(NextResponse.json({ 
        balance: user.credits || 0 
      }))
    }

    // Route not found
    return handleCORS(NextResponse.json(
      { error: `Route ${route} not found` }, 
      { status: 404 }
    ))

  } catch (error) {
    console.error('API Error:', error)
    
    if (error.message === 'No token provided' || error.message === 'Invalid token') {
      return handleCORS(NextResponse.json(
        { error: "Unauthorized" }, 
        { status: 401 }
      ))
    }
    
    return handleCORS(NextResponse.json(
      { error: "Internal server error" }, 
      { status: 500 }
    ))
  }
}

// Export all HTTP methods
export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute