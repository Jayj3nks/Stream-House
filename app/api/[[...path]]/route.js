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
    
    // Check cache first (revalidate if older than 7 days)
    const cached = await db.collection('url_metadata').findOne({ url })
    if (cached && cached.cachedAt > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
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
    
    // Enhanced platform detection with canonical URL creation
    let provider = 'Other'
    let platformIcon = '🔗'
    let canonicalUrl = url
    
    if (url.includes('tiktok.com')) {
      provider = 'TikTok'
      platformIcon = '🎵'
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      provider = 'YouTube'
      platformIcon = '📺'
      // Convert youtu.be to youtube.com for canonical URL
      if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1].split('?')[0]
        canonicalUrl = `https://www.youtube.com/watch?v=${videoId}`
      }
    } else if (url.includes('instagram.com')) {
      provider = 'Instagram'
      platformIcon = '📷'
    } else if (url.includes('twitch.tv')) {
      provider = 'Twitch'
      platformIcon = '🎮'
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      provider = 'Twitter'
      platformIcon = '🐦'
    } else if (url.includes('facebook.com')) {
      provider = 'Facebook'
      platformIcon = '👥'
    }

    const metadata = { 
      title: title.slice(0, 200), 
      description: description.slice(0, 300),
      thumbnailUrl: thumbnail, 
      provider,
      platformIcon,
      canonicalUrl,
      originalUrl: url
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
      thumbnailUrl: '', 
      provider: 'Other',
      platformIcon: '🔗',
      canonicalUrl: url,
      originalUrl: url
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
      return handleCORS(NextResponse.json({ message: "CreatorSquad API v2" }))
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

      // Create user with username from display name
      const username = displayName.toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 1000)

      const user = {
        id: uuidv4(),
        username,
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
        totalPoints: 0
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

    // SETTINGS ROUTES (keeping existing settings functionality)

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

    // NEW POST SYSTEM

    // Create post - POST /api/posts
    if (route === '/posts' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { url, squadId } = await request.json()
      
      if (!url) {
        return handleCORS(NextResponse.json(
          { error: "URL is required" }, 
          { status: 400 }
        ))
      }

      // Fetch URL metadata with caching
      const metadata = await fetchUrlMetadata(url)

      // Get user info
      const user = await db.collection('users').findOne({ id: tokenData.userId })

      const post = {
        id: uuidv4(),
        ownerUserId: tokenData.userId,
        squadId: squadId || null,
        provider: metadata.provider,
        originalUrl: metadata.originalUrl,
        canonicalUrl: metadata.canonicalUrl,
        title: metadata.title,
        description: metadata.description,
        thumbnailUrl: metadata.thumbnailUrl,
        isCollaboration: false,
        createdAt: new Date(),
        // Add author info for compatibility
        authorName: user?.displayName || 'Unknown',
        platform: metadata.provider,
        platformIcon: metadata.platformIcon
      }

      await db.collection('posts').insertOne(post)
      
      // Get clip count for this post
      const clipCount = await db.collection('clips').countDocuments({ postId: post.id })
      post.clipCount = clipCount

      return handleCORS(NextResponse.json(post))
    }

    // Get single post - GET /api/posts/{id}
    if (route.startsWith('/posts/') && !route.includes('/collaborators') && !route.includes('/clips') && method === 'GET') {
      const postId = route.split('/')[2]
      
      const post = await db.collection('posts').findOne({ id: postId })
      if (!post) {
        return handleCORS(NextResponse.json(
          { error: "Post not found" }, 
          { status: 404 }
        ))
      }

      // Get clip count
      const clipCount = await db.collection('clips').countDocuments({ postId: post.id })
      post.clipCount = clipCount

      // Get collaborators if it's a collaboration
      if (post.isCollaboration) {
        const collaborators = await db.collection('post_collaborators')
          .find({ postId: post.id })
          .toArray()
        
        // Get user details for collaborators
        const collaboratorIds = collaborators.map(c => c.userId)
        const users = await db.collection('users')
          .find({ id: { $in: collaboratorIds } })
          .project({ id: 1, displayName: 1, username: 1 })
          .toArray()
        
        post.collaborators = users
      }

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

      // Get clip counts for each post
      for (let post of posts) {
        const clipCount = await db.collection('clips').countDocuments({ postId: post.id })
        post.clipCount = clipCount
      }

      return handleCORS(NextResponse.json(posts))
    }

    // ENGAGE SYSTEM

    // Engage redirect - GET /api/r/{postId}?u={userId}
    if (route.startsWith('/r/') && method === 'GET') {
      const postId = route.split('/')[2]
      const url = new URL(request.url)
      const userId = url.searchParams.get('u')

      if (!userId) {
        return handleCORS(NextResponse.json(
          { error: "User ID is required" }, 
          { status: 400 }
        ))
      }

      // Get post
      const post = await db.collection('posts').findOne({ id: postId })
      if (!post) {
        return handleCORS(NextResponse.json(
          { error: "Post not found" }, 
          { status: 404 }
        ))
      }

      // Check if user already engaged in last 24 hours
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const existingEngagement = await db.collection('engagements').findOne({
        userId,
        postId,
        type: 'engage',
        createdAt: { $gt: yesterday }
      })

      if (!existingEngagement) {
        // Award 1 point for engagement
        const engagement = {
          id: uuidv4(),
          userId,
          postId,
          type: 'engage',
          points: 1,
          status: 'credited',
          createdAt: new Date()
        }

        await db.collection('engagements').insertOne(engagement)

        // Update user total points
        await db.collection('users').updateOne(
          { id: userId },
          { $inc: { totalPoints: 1 } }
        )
      }

      // Redirect to canonical URL
      return Response.redirect(post.canonicalUrl, 302)
    }

    // CLIPS SYSTEM

    // Create clip - POST /api/clips
    if (route === '/clips' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { postId, clipUrl, source = 'url' } = await request.json()
      
      if (!postId || (!clipUrl && source === 'url')) {
        return handleCORS(NextResponse.json(
          { error: "Post ID and clip URL are required" }, 
          { status: 400 }
        ))
      }

      // Verify post exists
      const post = await db.collection('posts').findOne({ id: postId })
      if (!post) {
        return handleCORS(NextResponse.json(
          { error: "Post not found" }, 
          { status: 404 }
        ))
      }

      // Create clip
      const clip = {
        id: uuidv4(),
        postId,
        creatorUserId: tokenData.userId,
        source,
        clipUrl: source === 'url' ? clipUrl : null,
        storagePath: source === 'upload' ? null : null, // TODO: implement file upload
        thumbnailUrl: null, // TODO: generate thumbnail
        createdAt: new Date()
      }

      await db.collection('clips').insertOne(clip)

      // Award 2 points for creating clip
      const engagement = {
        id: uuidv4(),
        userId: tokenData.userId,
        postId,
        type: 'clip',
        points: 2,
        status: 'credited',
        createdAt: new Date()
      }

      await db.collection('engagements').insertOne(engagement)

      // Update user total points
      await db.collection('users').updateOne(
        { id: tokenData.userId },
        { $inc: { totalPoints: 2 } }
      )

      return handleCORS(NextResponse.json({ 
        clip, 
        pointsAwarded: 2 
      }))
    }

    // Get clips for post - GET /api/posts/{postId}/clips
    if (route.match(/^\/posts\/[^\/]+\/clips$/) && method === 'GET') {
      const postId = route.split('/')[2]
      
      const clips = await db.collection('clips')
        .find({ postId })
        .sort({ createdAt: -1 })
        .toArray()

      // Get creator info for each clip
      for (let clip of clips) {
        const creator = await db.collection('users')
          .findOne({ id: clip.creatorUserId }, { projection: { displayName: 1, username: 1 } })
        clip.creator = creator
      }

      return handleCORS(NextResponse.json(clips))
    }

    // COLLABORATION SYSTEM

    // Add collaborators to post - POST /api/posts/{postId}/collaborators
    if (route.match(/^\/posts\/[^\/]+\/collaborators$/) && method === 'POST') {
      const postId = route.split('/')[2]
      const tokenData = verifyToken(request)
      const { collaboratorUserIds } = await request.json()
      
      if (!Array.isArray(collaboratorUserIds) || collaboratorUserIds.length === 0) {
        return handleCORS(NextResponse.json(
          { error: "Collaborator user IDs array is required" }, 
          { status: 400 }
        ))
      }

      // Verify post exists and user owns it
      const post = await db.collection('posts').findOne({ id: postId })
      if (!post) {
        return handleCORS(NextResponse.json(
          { error: "Post not found" }, 
          { status: 404 }
        ))
      }

      if (post.ownerUserId !== tokenData.userId) {
        return handleCORS(NextResponse.json(
          { error: "Only post owner can add collaborators" }, 
          { status: 403 }
        ))
      }

      // Check if post is already marked as collaboration
      const wasCollaboration = post.isCollaboration

      // Add collaborators (including owner)
      const allCollaborators = [...new Set([post.ownerUserId, ...collaboratorUserIds])]
      
      // Insert collaborators
      for (const userId of allCollaborators) {
        await db.collection('post_collaborators').updateOne(
          { postId, userId },
          { $set: { postId, userId, createdAt: new Date() } },
          { upsert: true }
        )
      }

      // Mark post as collaboration
      await db.collection('posts').updateOne(
        { id: postId },
        { $set: { isCollaboration: true } }
      )

      // Award points if this is the first time marking as collaboration
      if (!wasCollaboration) {
        for (const userId of allCollaborators) {
          const engagement = {
            id: uuidv4(),
            userId,
            postId,
            type: 'collab',
            points: 3,
            status: 'credited',
            createdAt: new Date()
          }

          await db.collection('engagements').insertOne(engagement)

          // Update user total points
          await db.collection('users').updateOne(
            { id: userId },
            { $inc: { totalPoints: 3 } }
          )
        }
      }

      return handleCORS(NextResponse.json({ 
        message: "Collaborators added successfully",
        pointsAwarded: wasCollaboration ? 0 : 3,
        collaborators: allCollaborators
      }))
    }

    // USER PROFILES

    // Get user profile - GET /api/users/{username}
    if (route.startsWith('/users/') && method === 'GET') {
      const username = route.split('/')[2]
      
      const user = await db.collection('users').findOne({ username })
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      // Get user's posts
      const posts = await db.collection('posts')
        .find({ ownerUserId: user.id })
        .sort({ createdAt: -1 })
        .toArray()

      // Add clip counts to posts
      for (let post of posts) {
        const clipCount = await db.collection('clips').countDocuments({ postId: post.id })
        post.clipCount = clipCount
      }

      // Get clips made by user
      const clips = await db.collection('clips')
        .find({ creatorUserId: user.id })
        .sort({ createdAt: -1 })
        .toArray()

      // Add original post info to clips
      for (let clip of clips) {
        const originalPost = await db.collection('posts')
          .findOne({ id: clip.postId }, { projection: { title: 1, thumbnailUrl: 1, provider: 1 } })
        clip.originalPost = originalPost
      }

      // Get points breakdown
      const pointsBreakdown = await db.collection('engagements').aggregate([
        { $match: { userId: user.id } },
        { $group: { _id: '$type', total: { $sum: '$points' }, count: { $sum: 1 } } }
      ]).toArray()

      const profile = {
        user: {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          bio: user.bio,
          totalPoints: user.totalPoints || 0,
          createdAt: user.createdAt
        },
        posts,
        clipsMade: clips,
        pointsBreakdown: pointsBreakdown.reduce((acc, item) => {
          acc[item._id] = { total: item.total, count: item.count }
          return acc
        }, {})
      }

      return handleCORS(NextResponse.json(profile))
    }

    // LEGACY COMPATIBILITY (keeping squad and collaboration finder)

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
          username: user.username,
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