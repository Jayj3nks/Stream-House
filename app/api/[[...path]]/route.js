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

// Helper to calculate collaboration match score
function calculateMatchScore(user1, user2) {
  let score = 0
  const reasons = []

  // Niche overlap (+40 points max)
  const nicheOverlap = (user1.niches || []).filter(n => (user2.niches || []).includes(n))
  if (nicheOverlap.length > 0) {
    score += Math.min(nicheOverlap.length * 20, 40)
    reasons.push(`Shared niches: ${nicheOverlap.join(', ')}`)
  }

  // Game overlap (+15 points max)
  const gameOverlap = (user1.games || []).filter(g => (user2.games || []).includes(g))
  if (gameOverlap.length > 0) {
    score += Math.min(gameOverlap.length * 8, 15)
    reasons.push(`Same games: ${gameOverlap.join(', ')}`)
  }

  // Platform overlap (+10 points max)
  const platformOverlap = (user1.platforms || []).filter(p => (user2.platforms || []).includes(p))
  if (platformOverlap.length > 0) {
    score += Math.min(platformOverlap.length * 5, 10)
    reasons.push(`Shared platforms: ${platformOverlap.join(', ')}`)
  }

  // Same city (+10 points)
  if (user1.city && user2.city && user1.city.toLowerCase() === user2.city.toLowerCase()) {
    score += 10
    reasons.push(`Same city: ${user1.city}`)
  }

  // Schedule overlap (+25 points max)
  if (user1.hasSchedule && user2.hasSchedule && user1.schedule && user2.schedule) {
    const overlappingDays = []
    Object.keys(user1.schedule).forEach(day => {
      if (user2.schedule[day]) {
        const commonTimes = (user1.schedule[day] || []).filter(time => 
          (user2.schedule[day] || []).includes(time)
        )
        if (commonTimes.length > 0) {
          overlappingDays.push(day)
        }
      }
    })
    if (overlappingDays.length > 0) {
      score += Math.min(overlappingDays.length * 5, 25)
      reasons.push(`Available same times: ${overlappingDays.join(', ')}`)
    }
  }

  // Time zone compatibility (+5 points)
  if (user1.timeZone && user2.timeZone) {
    // Simple time zone compatibility check
    const tz1 = user1.timeZone.toLowerCase()
    const tz2 = user2.timeZone.toLowerCase()
    if (tz1 === tz2) {
      score += 5
      reasons.push('Same time zone')
    } else if (
      (tz1.includes('america') && tz2.includes('america')) ||
      (tz1.includes('europe') && tz2.includes('europe')) ||
      (tz1.includes('asia') && tz2.includes('asia'))
    ) {
      score += 3
      reasons.push('Compatible time zones')
    }
  }

  return {
    score: Math.min(score, 100), // Cap at 100%
    reasons
  }
}

// Enhanced URL metadata fetching with caching
async function fetchUrlMetadata(url) {
  try {
    const db = await connectToMongo()
    
    // Check cache first
    const cached = await db.collection('url_metadata').findOne({ url })
    if (cached && cached.cachedAt > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
      return cached.metadata
    }

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
    
    const description = $('meta[property="og:description"]').attr('content') || 
                       $('meta[name="twitter:description"]').attr('content') || 
                       $('meta[name="description"]').attr('content') || 
                       ''
    
    const thumbnail = $('meta[property="og:image"]').attr('content') || 
                     $('meta[name="twitter:image"]').attr('content') || 
                     ''
    
    // Enhanced platform detection
    let platform = 'Other'
    let platformIcon = '🔗'
    
    if (url.includes('tiktok.com')) {
      platform = 'TikTok'
      platformIcon = '🎵'
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      platform = 'YouTube'
      platformIcon = '📺'
    } else if (url.includes('instagram.com')) {
      platform = 'Instagram'
      platformIcon = '📷'
    } else if (url.includes('twitch.tv')) {
      platform = 'Twitch'
      platformIcon = '🎮'
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      platform = 'Twitter'
      platformIcon = '🐦'
    } else if (url.includes('facebook.com')) {
      platform = 'Facebook'
      platformIcon = '👥'
    }

    const metadata = { 
      title: title.slice(0, 200), 
      description: description.slice(0, 300),
      thumbnail, 
      platform,
      platformIcon 
    }

    // Cache the result
    await db.collection('url_metadata').updateOne(
      { url },
      { 
        $set: { 
          url, 
          metadata, 
          cachedAt: new Date() 
        } 
      },
      { upsert: true }
    )

    return metadata
  } catch (error) {
    console.error('Error fetching URL metadata:', error)
    return { 
      title: 'Content Post', 
      description: '',
      thumbnail: '', 
      platform: 'Other',
      platformIcon: '🔗'
    }
  }
}

// Helper to generate secure verification codes
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
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
      const { 
        email, 
        password, 
        displayName, 
        platforms = [], 
        niches = [], 
        games = [], 
        city = '', 
        timeZone = '', 
        hasSchedule = false, 
        schedule = {}, 
        bio = '' 
      } = await request.json()
      
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
        platforms,
        niches,
        games,
        city,
        timeZone,
        hasSchedule,
        schedule,
        bio,
        createdAt: new Date(),
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

    // SETTINGS ROUTES

    // Verify current password for password change - POST /api/settings/password/verify
    if (route === '/settings/password/verify' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { currentPassword } = await request.json()
      
      const user = await db.collection('users').findOne({ id: tokenData.userId })
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      const isValidPassword = await bcrypt.compare(currentPassword, user.password)
      if (!isValidPassword) {
        return handleCORS(NextResponse.json(
          { error: "Current password is incorrect" }, 
          { status: 401 }
        ))
      }

      // Generate and store verification code
      const verificationCode = generateVerificationCode()
      await db.collection('verification_codes').updateOne(
        { userId: tokenData.userId, type: 'password_change' },
        { 
          $set: { 
            code: verificationCode, 
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
          } 
        },
        { upsert: true }
      )

      // In a real app, send email here
      console.log(`Password change verification code for ${user.email}: ${verificationCode}`)

      return handleCORS(NextResponse.json({ 
        message: "Verification code sent to email" 
      }))
    }

    // Verify email code for password change - POST /api/settings/password/verify-code
    if (route === '/settings/password/verify-code' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { emailCode } = await request.json()
      
      const storedCode = await db.collection('verification_codes').findOne({ 
        userId: tokenData.userId, 
        type: 'password_change',
        code: emailCode,
        expiresAt: { $gt: new Date() }
      })

      if (!storedCode) {
        return handleCORS(NextResponse.json(
          { error: "Invalid or expired verification code" }, 
          { status: 400 }
        ))
      }

      return handleCORS(NextResponse.json({ 
        message: "Code verified successfully" 
      }))
    }

    // Change password - POST /api/settings/password/change
    if (route === '/settings/password/change' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { newPassword, emailCode } = await request.json()
      
      // Verify code again
      const storedCode = await db.collection('verification_codes').findOne({ 
        userId: tokenData.userId, 
        type: 'password_change',
        code: emailCode,
        expiresAt: { $gt: new Date() }
      })

      if (!storedCode) {
        return handleCORS(NextResponse.json(
          { error: "Invalid or expired verification code" }, 
          { status: 400 }
        ))
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Update password
      await db.collection('users').updateOne(
        { id: tokenData.userId },
        { $set: { password: hashedPassword } }
      )

      // Delete verification code
      await db.collection('verification_codes').deleteOne({ _id: storedCode._id })

      return handleCORS(NextResponse.json({ 
        message: "Password updated successfully" 
      }))
    }

    // Change username - POST /api/settings/username
    if (route === '/settings/username' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { newUsername, password } = await request.json()
      
      const user = await db.collection('users').findOne({ id: tokenData.userId })
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return handleCORS(NextResponse.json(
          { error: "Password is incorrect" }, 
          { status: 401 }
        ))
      }

      // Update username
      await db.collection('users').updateOne(
        { id: tokenData.userId },
        { $set: { displayName: newUsername } }
      )

      return handleCORS(NextResponse.json({ 
        message: "Username updated successfully" 
      }))
    }

    // Send email change confirmation - POST /api/settings/email/send-code
    if (route === '/settings/email/send-code' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { newEmail, password } = await request.json()
      
      const user = await db.collection('users').findOne({ id: tokenData.userId })
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password)
      if (!isValidPassword) {
        return handleCORS(NextResponse.json(
          { error: "Password is incorrect" }, 
          { status: 401 }
        ))
      }

      // Check if new email is already taken
      const existingUser = await db.collection('users').findOne({ email: newEmail })
      if (existingUser && existingUser.id !== tokenData.userId) {
        return handleCORS(NextResponse.json(
          { error: "Email is already in use" }, 
          { status: 400 }
        ))
      }

      // Generate and store verification code
      const verificationCode = generateVerificationCode()
      await db.collection('verification_codes').updateOne(
        { userId: tokenData.userId, type: 'email_change' },
        { 
          $set: { 
            code: verificationCode,
            newEmail: newEmail,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
          } 
        },
        { upsert: true }
      )

      // In a real app, send email here
      console.log(`Email change verification code for ${newEmail}: ${verificationCode}`)

      return handleCORS(NextResponse.json({ 
        message: "Confirmation code sent to new email" 
      }))
    }

    // Confirm email change - POST /api/settings/email/confirm
    if (route === '/settings/email/confirm' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { newEmail, confirmationCode } = await request.json()
      
      const storedCode = await db.collection('verification_codes').findOne({ 
        userId: tokenData.userId, 
        type: 'email_change',
        code: confirmationCode,
        newEmail: newEmail,
        expiresAt: { $gt: new Date() }
      })

      if (!storedCode) {
        return handleCORS(NextResponse.json(
          { error: "Invalid or expired confirmation code" }, 
          { status: 400 }
        ))
      }

      // Update email
      await db.collection('users').updateOne(
        { id: tokenData.userId },
        { $set: { email: newEmail } }
      )

      // Delete verification code
      await db.collection('verification_codes').deleteOne({ _id: storedCode._id })

      return handleCORS(NextResponse.json({ 
        message: "Email updated successfully" 
      }))
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

      // Fetch URL metadata with caching
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
        description: metadata.description,
        thumbnail: metadata.thumbnail,
        platform: metadata.platform,
        platformIcon: metadata.platformIcon,
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

    // Track engagement click - POST /api/engagements/click
    if (route === '/engagements/click' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { postId, userId, type, redirectUrl } = await request.json()
      
      if (!postId || !userId || !type || !redirectUrl) {
        return handleCORS(NextResponse.json(
          { error: "Post ID, user ID, type, and redirect URL are required" }, 
          { status: 400 }
        ))
      }

      // Check if user already clicked within 24 hours
      const existingClick = await db.collection('engagement_clicks').findOne({
        postId,
        userId,
        type,
        clickedAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })

      if (existingClick) {
        return handleCORS(NextResponse.json(
          { message: "Already tracked", redirectUrl }, 
          { status: 200 }
        ))
      }

      // Record the click
      const click = {
        id: uuidv4(),
        postId,
        userId,
        type,
        clickedAt: new Date(),
        redirectUrl
      }

      await db.collection('engagement_clicks').insertOne(click)

      return handleCORS(NextResponse.json({ 
        message: "Click tracked", 
        redirectUrl 
      }))
    }

    // Verify engagement and award credits - POST /api/engagements/verify
    if (route === '/engagements/verify' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { postId, userId, type, verificationData } = await request.json()
      
      // For now, we'll implement a simple verification
      // In production, this would integrate with platform APIs
      
      // Check if user already earned credits for this post in the last 24h
      const existingEngagement = await db.collection('engagements').findOne({
        postId,
        userId,
        type,
        createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })

      if (existingEngagement) {
        return handleCORS(NextResponse.json(
          { error: "Credits already earned for this engagement" }, 
          { status: 400 }
        ))
      }

      const engagement = {
        id: uuidv4(),
        postId,
        userId,
        type,
        verified: true,
        verificationData,
        createdAt: new Date()
      }

      await db.collection('engagements').insertOne(engagement)

      // Award credits
      const creditsEarned = type === 'like' ? 1 : type === 'comment' ? 2 : 3
      await db.collection('users').updateOne(
        { id: userId },
        { $inc: { credits: creditsEarned } }
      )

      return handleCORS(NextResponse.json({ 
        engagement, 
        creditsEarned 
      }))
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

    // COLLABORATION ROUTES

    // Get collaboration matches - GET /api/collaborations/matches/{userId}
    if (route.startsWith('/collaborations/matches/') && method === 'GET') {
      const userId = route.split('/')[3]
      
      // Get current user
      const currentUser = await db.collection('users').findOne({ id: userId })
      if (!currentUser) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      // Get all other users for matching
      const allUsers = await db.collection('users')
        .find({ id: { $ne: userId } })
        .toArray()

      // Calculate match scores
      const matches = allUsers.map(user => {
        const matchData = calculateMatchScore(currentUser, user)
        return {
          id: user.id,
          displayName: user.displayName,
          bio: user.bio,
          platforms: user.platforms || [],
          niches: user.niches || [],
          games: user.games || [],
          city: user.city,
          timeZone: user.timeZone,
          hasSchedule: user.hasSchedule,
          schedule: user.schedule || {},
          matchScore: matchData.score,
          matchReasons: matchData.reasons
        }
      })

      // Sort by match score and return top matches
      const sortedMatches = matches
        .filter(match => match.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 20)

      return handleCORS(NextResponse.json(sortedMatches))
    }

    // Send collaboration invite - POST /api/collaborations/invite
    if (route === '/collaborations/invite' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { fromUserId, toUserId, message } = await request.json()
      
      if (!fromUserId || !toUserId || !message) {
        return handleCORS(NextResponse.json(
          { error: "From user ID, to user ID, and message are required" }, 
          { status: 400 }
        ))
      }

      const invite = {
        id: uuidv4(),
        fromUserId,
        toUserId,
        message,
        status: 'pending',
        createdAt: new Date()
      }

      await db.collection('collaboration_invites').insertOne(invite)
      return handleCORS(NextResponse.json(invite))
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