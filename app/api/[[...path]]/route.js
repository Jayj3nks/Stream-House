import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import fetch from 'node-fetch'
import * as cheerio from 'cheerio'

// Repository imports
import {
  userRepo,
  houseRepo,
  postRepo,
  voteRepo,
  inviteRepo,
  bugReportRepo,
  mediaRepo,
  engagementRepo,
  clipRepo
} from '../../../lib/repositories/memory/index.js'

// Global Configuration
const CONFIG = {
  TIMEZONE: process.env.CSQ_TIMEZONE || 'America/New_York',
  ENGAGE_DEDUP_HOURS: parseInt(process.env.CSQ_ENGAGE_DEDUP_HOURS) || 24,
  URL_CACHE_DAYS: parseInt(process.env.CSQ_URL_CACHE_DAYS) || 7,
  REDIRECT_ALLOWLIST: (process.env.CSQ_REDIRECT_ALLOWLIST || 'youtube.com,youtu.be,tiktok.com,vm.tiktok.com,twitch.tv,instagram.com,facebook.com,fb.watch,kik.com').split(','),
  MAX_CLIP_MB: parseInt(process.env.CSQ_MAX_CLIP_MB) || 50,
  ALLOWED_MIME: (process.env.CSQ_ALLOWED_MIME || 'video/mp4,video/webm,video/quicktime').split(','),
  ENGAGE_RATE_LIMIT: parseInt(process.env.CSQ_ENGAGE_RATE_LIMIT) || 20,
  WRITE_RATE_LIMIT: parseInt(process.env.CSQ_WRITE_RATE_LIMIT) || 10
}

// MongoDB connection
let client
let db

async function connectToMongo() {
  if (!client) {
    client = new MongoClient(process.env.MONGO_URL)
    await client.connect()
    db = client.db(process.env.DB_NAME)
    
    // Ensure indexes exist
    await ensureIndexes()
  }
  return db
}

async function ensureIndexes() {
  try {
    // User indexes
    await db.collection('users').createIndex({ username: 1 }, { unique: true })
    await db.collection('users').createIndex({ email: 1 }, { unique: true })
    
    // Post indexes
    await db.collection('posts').createIndex({ ownerUserId: 1 })
    await db.collection('posts').createIndex({ createdAt: -1 })
    
    // Clip indexes
    await db.collection('clips').createIndex({ postId: 1 })
    await db.collection('clips').createIndex({ creatorUserId: 1 })
    
    // Engagement indexes
    await db.collection('engagements').createIndex({ userId: 1, postId: 1, type: 1, createdAt: 1 })
    
    // PostCollaborator indexes
    await db.collection('post_collaborators').createIndex({ postId: 1, userId: 1 }, { unique: true })
    
    // Rate limiting indexes
    await db.collection('rate_limits').createIndex({ key: 1 })
    await db.collection('rate_limits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
  } catch (error) {
    console.error('Index creation error:', error)
  }
}

// Rate limiting implementation
const rateLimiters = new Map()

async function checkRateLimit(key, limit, windowMs = 60000) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  if (!rateLimiters.has(key)) {
    rateLimiters.set(key, [])
  }
  
  const requests = rateLimiters.get(key)
  
  // Remove old requests outside the window
  const validRequests = requests.filter(timestamp => timestamp > windowStart)
  rateLimiters.set(key, validRequests)
  
  if (validRequests.length >= limit) {
    return false // Rate limit exceeded
  }
  
  // Add current request
  validRequests.push(now)
  return true
}

// Helper to check if domain is in allowlist
function isDomainAllowed(url) {
  try {
    const domain = new URL(url).hostname.toLowerCase()
    return CONFIG.REDIRECT_ALLOWLIST.some(allowed => 
      domain === allowed || domain.endsWith('.' + allowed)
    )
  } catch {
    return false
  }
}

// Enhanced URL canonicalization
function canonicalizeUrl(originalUrl, provider) {
  try {
    const url = new URL(originalUrl)
    
    switch (provider.toLowerCase()) {
      case 'youtube':
        // Extract video ID from various YouTube URL formats
        let videoId = null
        if (url.hostname.includes('youtu.be')) {
          videoId = url.pathname.slice(1).split('?')[0]
        } else if (url.searchParams.has('v')) {
          videoId = url.searchParams.get('v')
        }
        
        if (videoId) {
          return `https://www.youtube.com/watch?v=${videoId}`
        }
        break
        
      case 'tiktok':
        // Keep TikTok URLs but clean tracking params
        const tiktokCleanUrl = new URL(originalUrl)
        tiktokCleanUrl.search = '' // Remove all query params
        return tiktokCleanUrl.toString()
        
      default:
        // For other platforms, strip common tracking params
        const cleanUrl = new URL(originalUrl)
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid']
        trackingParams.forEach(param => cleanUrl.searchParams.delete(param))
        return cleanUrl.toString()
    }
  } catch (error) {
    console.error('URL canonicalization error:', error)
  }
  
  // Fallback to original URL if canonicalization fails
  return originalUrl
}

// Enhanced URL metadata fetching with security and caching
async function fetchUrlMetadata(url) {
  try {
    const db = await connectToMongo()
    
    // Check cache first (respect cache expiration)
    const cacheExpiry = new Date(Date.now() - CONFIG.URL_CACHE_DAYS * 24 * 60 * 60 * 1000)
    const cached = await db.collection('url_metadata').findOne({ 
      url, 
      cachedAt: { $gt: cacheExpiry }
    })
    
    if (cached) {
      return cached.metadata
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CreatorSquad-Bot/2.0 (+https://creatorsquad.com)'
      },
      timeout: 10000 // 10 second timeout
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    // Extract metadata with XSS protection
    const title = sanitizeText($('title').text() || 
                  $('meta[property="og:title"]').attr('content') || 
                  $('meta[name="twitter:title"]').attr('content') || 
                  'Untitled')
    
    const description = sanitizeText($('meta[property="og:description"]').attr('content') || 
                       $('meta[name="twitter:description"]').attr('content') || 
                       $('meta[name="description"]').attr('content') || 
                       '')
    
    const thumbnail = $('meta[property="og:image"]').attr('content') || 
                     $('meta[name="twitter:image"]').attr('content') || 
                     ''
    
    // Enhanced platform detection
    let provider = 'unknown'
    let platformIcon = '🔗'
    
    const hostname = new URL(url).hostname.toLowerCase()
    
    if (hostname.includes('tiktok.com')) {
      provider = 'tiktok'
      platformIcon = '🎵'
    } else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      provider = 'youtube'
      platformIcon = '📺'
    } else if (hostname.includes('instagram.com')) {
      provider = 'instagram'
      platformIcon = '📷'
    } else if (hostname.includes('twitch.tv')) {
      provider = 'twitch'
      platformIcon = '🎮'
    } else if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
      provider = 'twitter'
      platformIcon = '🐦'
    } else if (hostname.includes('facebook.com') || hostname.includes('fb.watch')) {
      provider = 'facebook'
      platformIcon = '👥'
    } else if (hostname.includes('kik.com')) {
      provider = 'kik'
      platformIcon = '💬'
    }

    // Canonicalize URL with fallback
    const canonicalUrl = canonicalizeUrl(url, provider) || url

    const metadata = { 
      title: title.slice(0, 200), 
      description: description.slice(0, 500),
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
    
    // Return fallback metadata with canonicalized URL
    const provider = 'unknown'
    return { 
      title: 'Content Post', 
      description: '',
      thumbnailUrl: '', 
      provider,
      platformIcon: '🔗',
      canonicalUrl: canonicalizeUrl(url, provider) || url,
      originalUrl: url
    }
  }
}

// XSS protection for text content
function sanitizeText(text) {
  if (!text) return ''
  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: urls
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
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

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'creator-squad-v2-secret-key'

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

// Helper to get client IP
function getClientIP(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         '127.0.0.1'
}

// Check engagement deduplication (24-hour sliding window)
async function checkEngagementDedup(userId, postId, type) {
  const db = await connectToMongo()
  const windowStart = new Date(Date.now() - CONFIG.ENGAGE_DEDUP_HOURS * 60 * 60 * 1000)
  
  const existingEngagement = await db.collection('engagements').findOne({
    userId,
    postId,
    type,
    createdAt: { $gt: windowStart }
  })
  
  return !existingEngagement // Return true if no recent engagement found
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

    // Root endpoint with config info
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ 
        message: "CreatorSquad V2 API",
        version: "2.0.0",
        timezone: CONFIG.TIMEZONE,
        config: {
          engageDedup: `${CONFIG.ENGAGE_DEDUP_HOURS}h`,
          urlCache: `${CONFIG.URL_CACHE_DAYS}d`,
          maxClipSize: `${CONFIG.MAX_CLIP_MB}MB`
        }
      }))
    }

    // AUTH ROUTES
    
    // Enhanced signup with extended profile
    if (route === '/auth/signup' && method === 'POST') {
      // Rate limiting for signup
      const clientIP = getClientIP(request)
      const rateLimitKey = `signup:${clientIP}`
      
      if (!await checkRateLimit(rateLimitKey, 5, 300000)) { // 5 signups per 5 minutes
        return handleCORS(NextResponse.json(
          { error: "Rate limit exceeded" }, 
          { status: 429 }
        ))
      }

      const { 
        email, 
        password, 
        displayName, 
        platforms = [], 
        niches = [], 
        games = [], 
        city = '', 
        timeZone = CONFIG.TIMEZONE, 
        hasSchedule = false, 
        schedule = {}, 
        bio = '' 
      } = await request.json()
      
      // Validation
      if (!email || !password || !displayName) {
        return handleCORS(NextResponse.json(
          { error: "Email, password, and display name are required" }, 
          { status: 400 }
        ))
      }

      if (password.length < 8) {
        return handleCORS(NextResponse.json(
          { error: "Password must be at least 8 characters" }, 
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

      // Generate unique username
      const baseUsername = displayName.toLowerCase().replace(/[^a-z0-9]/g, '')
      let username = baseUsername
      let counter = 1
      
      while (await db.collection('users').findOne({ username })) {
        username = `${baseUsername}${counter}`
        counter++
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12)

      // Create user
      const user = {
        id: uuidv4(),
        username,
        email,
        passwordHash,
        displayName: sanitizeText(displayName),
        platforms: platforms.slice(0, 10), // Limit array size
        niches: niches.slice(0, 10),
        games: games.slice(0, 20),
        city: sanitizeText(city),
        timeZone,
        hasSchedule,
        schedule,
        bio: sanitizeText(bio).slice(0, 500),
        avatarUrl: null,
        totalPoints: 0,
        createdAt: new Date()
      }

      await db.collection('users').insertOne(user)

      // Create JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

      const { passwordHash: _, ...userWithoutPassword } = user
      return handleCORS(NextResponse.json({ 
        token, 
        user: userWithoutPassword 
      }))
    }

    // Login endpoint
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
      const isValidPassword = await bcrypt.compare(password, user.passwordHash)
      if (!isValidPassword) {
        return handleCORS(NextResponse.json(
          { error: "Invalid credentials" }, 
          { status: 401 }
        ))
      }

      // Create JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

      const { passwordHash: _, ...userWithoutPassword } = user
      return handleCORS(NextResponse.json({ 
        token, 
        user: userWithoutPassword 
      }))
    }

    // Get current user
    if (route === '/auth/me' && method === 'GET') {
      const tokenData = verifyToken(request)
      const user = await db.collection('users').findOne({ id: tokenData.userId })
      
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      const { passwordHash: _, ...userWithoutPassword } = user
      return handleCORS(NextResponse.json(userWithoutPassword))
    }

    // POST SYSTEM

    // Create post with enhanced metadata and security
    if (route === '/posts' && method === 'POST') {
      const tokenData = verifyToken(request)
      
      // Rate limiting for post creation
      const rateLimitKey = `posts:${tokenData.userId}`
      if (!await checkRateLimit(rateLimitKey, CONFIG.WRITE_RATE_LIMIT)) {
        return handleCORS(NextResponse.json(
          { error: "Rate limit exceeded" }, 
          { status: 429 }
        ))
      }

      const { url, squadId } = await request.json()
      
      if (!url) {
        return handleCORS(NextResponse.json(
          { error: "URL is required" }, 
          { status: 400 }
        ))
      }

      // Validate URL format
      try {
        new URL(url)
      } catch {
        return handleCORS(NextResponse.json(
          { error: "Invalid URL format" }, 
          { status: 400 }
        ))
      }

      // Fetch metadata with enhanced security
      const metadata = await fetchUrlMetadata(url)

      // Security check: ensure canonical URL is in allowlist
      if (!isDomainAllowed(metadata.canonicalUrl)) {
        return handleCORS(NextResponse.json(
          { error: "URL domain not allowed" }, 
          { status: 400 }
        ))
      }

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
        // Legacy compatibility
        authorName: user?.displayName || 'Unknown',
        platform: metadata.provider,
        platformIcon: metadata.platformIcon
      }

      await db.collection('posts').insertOne(post)
      
      // Get clip count
      const clipCount = await db.collection('clips').countDocuments({ postId: post.id })
      post.clipCount = clipCount

      return handleCORS(NextResponse.json(post))
    }

    // Get single post with clip count
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

      // Get collaborators if collaboration
      if (post.isCollaboration) {
        const collaborators = await db.collection('post_collaborators')
          .find({ postId: post.id })
          .toArray()
        
        const collaboratorIds = collaborators.map(c => c.userId)
        const users = await db.collection('users')
          .find({ id: { $in: collaboratorIds } })
          .project({ id: 1, displayName: 1, username: 1 })
          .toArray()
        
        post.collaborators = users
      }

      return handleCORS(NextResponse.json(post))
    }

    // Get squad posts
    if (route.startsWith('/posts/squad/') && method === 'GET') {
      const squadId = route.split('/')[3]
      
      const posts = await db.collection('posts')
        .find({ squadId })
        .sort({ createdAt: -1 })
        .limit(50)
        .toArray()

      // Add clip counts
      for (let post of posts) {
        const clipCount = await db.collection('clips').countDocuments({ postId: post.id })
        post.clipCount = clipCount
      }

      return handleCORS(NextResponse.json(posts))
    }

    // ENGAGE SYSTEM WITH SECURITY

    // Engage redirect with enhanced security and rate limiting
    if (route.startsWith('/r/') && method === 'GET') {
      const postId = route.split('/')[2]
      const url = new URL(request.url)
      const userId = url.searchParams.get('u')

      // Rate limiting for engage endpoints
      const clientIP = getClientIP(request)
      const rateLimitKey = `engage:${clientIP}:${userId}`
      
      if (!await checkRateLimit(rateLimitKey, CONFIG.ENGAGE_RATE_LIMIT)) {
        return handleCORS(NextResponse.json(
          { error: "Rate limit exceeded" }, 
          { status: 429 }
        ))
      }

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

      // Security: Verify canonical URL is in allowlist
      if (!isDomainAllowed(post.canonicalUrl)) {
        return handleCORS(NextResponse.json(
          { error: "Redirect URL not allowed" }, 
          { status: 403 }
        ))
      }

      // Check 24-hour deduplication
      const canEngage = await checkEngagementDedup(userId, postId, 'engage')

      if (canEngage) {
        // Award 1 point for engagement
        const engagement = {
          id: uuidv4(),
          userId,
          postId,
          type: 'engage',
          points: 1,
          createdAt: new Date()
        }

        await db.collection('engagements').insertOne(engagement)

        // Update user total points
        await db.collection('users').updateOne(
          { id: userId },
          { $inc: { totalPoints: 1 } }
        )
      }

      // Always redirect (points awarded only if dedup allows)
      return Response.redirect(post.canonicalUrl, 302)
    }

    // CLIPS SYSTEM WITH VALIDATION

    // Create clip with file validation
    if (route === '/clips' && method === 'POST') {
      const tokenData = verifyToken(request)
      
      // Rate limiting
      const rateLimitKey = `clips:${tokenData.userId}`
      if (!await checkRateLimit(rateLimitKey, CONFIG.WRITE_RATE_LIMIT)) {
        return handleCORS(NextResponse.json(
          { error: "Rate limit exceeded" }, 
          { status: 429 }
        ))
      }

      const { postId, clipUrl, source = 'url' } = await request.json()
      
      if (!postId || (!clipUrl && source === 'url')) {
        return handleCORS(NextResponse.json(
          { error: "Post ID and clip URL are required" }, 
          { status: 400 }
        ))
      }

      // Verify post exists and user doesn't own it
      const post = await db.collection('posts').findOne({ id: postId })
      if (!post) {
        return handleCORS(NextResponse.json(
          { error: "Post not found" }, 
          { status: 404 }
        ))
      }

      if (post.ownerUserId === tokenData.userId) {
        return handleCORS(NextResponse.json(
          { error: "Cannot create clip of your own post" }, 
          { status: 400 }
        ))
      }

      // Check for duplicate clip URL
      const existingClip = await db.collection('clips').findOne({ 
        postId, 
        creatorUserId: tokenData.userId,
        clipUrl 
      })

      if (existingClip) {
        return handleCORS(NextResponse.json(
          { error: "Clip already exists" }, 
          { status: 400 }
        ))
      }

      // Create clip
      const clip = {
        id: uuidv4(),
        postId,
        creatorUserId: tokenData.userId,
        source,
        clipUrl: source === 'url' ? clipUrl : null,
        storagePath: null,
        thumbnailUrl: null,
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

    // Get clips for post
    if (route.match(/^\/posts\/[^\/]+\/clips$/) && method === 'GET') {
      const postId = route.split('/')[2]
      
      const clips = await db.collection('clips')
        .find({ postId })
        .sort({ createdAt: -1 })
        .toArray()

      // Get creator info
      for (let clip of clips) {
        const creator = await db.collection('users')
          .findOne({ id: clip.creatorUserId }, { projection: { displayName: 1, username: 1 } })
        clip.creator = creator
      }

      return handleCORS(NextResponse.json(clips))
    }

    // COLLABORATION SYSTEM WITH PERMISSIONS

    // Add collaborators with owner-only access
    if (route.match(/^\/posts\/[^\/]+\/collaborators$/) && method === 'POST') {
      const postId = route.split('/')[2]
      const tokenData = verifyToken(request)
      
      // Rate limiting
      const rateLimitKey = `collab:${tokenData.userId}`
      if (!await checkRateLimit(rateLimitKey, CONFIG.WRITE_RATE_LIMIT)) {
        return handleCORS(NextResponse.json(
          { error: "Rate limit exceeded" }, 
          { status: 429 }
        ))
      }

      const { collaboratorUserIds } = await request.json()
      
      if (!Array.isArray(collaboratorUserIds)) {
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

      const wasCollaboration = post.isCollaboration
      const allCollaborators = [...new Set([post.ownerUserId, ...collaboratorUserIds])]
      
      // Add collaborators
      for (const userId of allCollaborators) {
        await db.collection('post_collaborators').updateOne(
          { postId, userId },
          { 
            $set: { 
              id: uuidv4(),
              postId, 
              userId, 
              createdAt: new Date() 
            } 
          },
          { upsert: true }
        )
      }

      // Mark as collaboration
      await db.collection('posts').updateOne(
        { id: postId },
        { $set: { isCollaboration: true } }
      )

      // Award points only on first collaboration marking
      if (!wasCollaboration) {
        for (const userId of allCollaborators) {
          const engagement = {
            id: uuidv4(),
            userId,
            postId,
            type: 'collab',
            points: 3,
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

    // ENHANCED USER PROFILES

    // Get comprehensive user profile
    if (route.startsWith('/users/') && !route.includes('/posts') && !route.includes('/clips') && method === 'GET') {
      const username = route.split('/')[2]
      
      const user = await db.collection('users').findOne({ username })
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      // Get user's posts with clip counts
      const posts = await db.collection('posts')
        .find({ ownerUserId: user.id })
        .sort({ createdAt: -1 })
        .limit(20)
        .toArray()

      for (let post of posts) {
        const clipCount = await db.collection('clips').countDocuments({ postId: post.id })
        post.clipCount = clipCount
      }

      // Get clips made by user
      const clips = await db.collection('clips')
        .find({ creatorUserId: user.id })
        .sort({ createdAt: -1 })
        .limit(20)
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

      const breakdown = pointsBreakdown.reduce((acc, item) => {
        acc[item._id] = { total: item.total, count: item.count }
        return acc
      }, {})

      // Remove sensitive data
      const { passwordHash, email, ...safeUser } = user

      const profile = {
        user: safeUser,
        posts,
        clipsMade: clips,
        pointsBreakdown: breakdown
      }

      return handleCORS(NextResponse.json(profile))
    }

    // Get user posts (paginated)
    if (route.match(/^\/users\/[^\/]+\/posts$/) && method === 'GET') {
      const username = route.split('/')[2]
      const url = new URL(request.url)
      const page = parseInt(url.searchParams.get('page')) || 1
      const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 50)
      const skip = (page - 1) * limit

      const user = await db.collection('users').findOne({ username })
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      const posts = await db.collection('posts')
        .find({ ownerUserId: user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray()

      // Add clip counts
      for (let post of posts) {
        const clipCount = await db.collection('clips').countDocuments({ postId: post.id })
        post.clipCount = clipCount
      }

      const total = await db.collection('posts').countDocuments({ ownerUserId: user.id })

      return handleCORS(NextResponse.json({
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }))
    }

    // Get user clips (paginated)
    if (route.match(/^\/users\/[^\/]+\/clips$/) && method === 'GET') {
      const username = route.split('/')[2]
      const url = new URL(request.url)
      const page = parseInt(url.searchParams.get('page')) || 1
      const limit = Math.min(parseInt(url.searchParams.get('limit')) || 20, 50)
      const skip = (page - 1) * limit

      const user = await db.collection('users').findOne({ username })
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      const clips = await db.collection('clips')
        .find({ creatorUserId: user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray()

      // Add original post info
      for (let clip of clips) {
        const originalPost = await db.collection('posts')
          .findOne({ id: clip.postId }, { projection: { title: 1, thumbnailUrl: 1, provider: 1 } })
        clip.originalPost = originalPost
      }

      const total = await db.collection('clips').countDocuments({ creatorUserId: user.id })

      return handleCORS(NextResponse.json({
        clips,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }))
    }

    // LEGACY COMPATIBILITY

    // Keep existing squad routes for compatibility
    if (route === '/squads' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { name, ownerId } = await request.json()
      
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

    if (route.startsWith('/squads/user/') && method === 'GET') {
      const userId = route.split('/')[3]
      const squad = await db.collection('squads').findOne({ 
        members: { $in: [userId] } 
      })
      return handleCORS(NextResponse.json(squad))
    }

    // Keep collaboration matching for compatibility
    if (route.startsWith('/collaborations/matches/') && method === 'GET') {
      // Simplified matching - return empty array for now
      return handleCORS(NextResponse.json([]))
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