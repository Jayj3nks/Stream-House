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

// Global Configuration for Streamer House
const CONFIG = {
  TIMEZONE: process.env.CSQ_TIMEZONE || 'America/New_York',
  FEED_TTL_HOURS: parseInt(process.env.CSQ_FEED_TTL_HOURS) || 24,
  PROFILE_TTL_DAYS: parseInt(process.env.CSQ_PROFILE_TTL_DAYS) || 7,
  SWITCHER_MAX: parseInt(process.env.CSQ_SWITCHER_MAX) || 12,
  ENGAGE_DEDUP_HOURS: parseInt(process.env.CSQ_ENGAGE_DEDUP_HOURS) || 24,
  CANONICAL_DEDUP_DAYS: parseInt(process.env.CSQ_CANONICAL_DEDUP_DAYS) || 7,
  REDIRECT_ALLOWLIST: (process.env.CSQ_REDIRECT_ALLOWLIST || 'youtube.com,youtu.be,tiktok.com,vm.tiktok.com,twitch.tv,instagram.com,facebook.com,fb.watch,kik.com').split(','),
  RATE_LIMIT_R_PER_MIN: parseInt(process.env.CSQ_RATE_LIMIT_R_PER_MIN) || 20,
  RATE_LIMIT_WRITE_PER_MIN: parseInt(process.env.CSQ_RATE_LIMIT_WRITE_PER_MIN) || 10,
  MAX_AVATAR_MB: parseInt(process.env.CSQ_MAX_AVATAR_MB) || 2,
  ALLOWED_AVATAR_MIME: (process.env.CSQ_ALLOWED_AVATAR_MIME || 'image/png,image/jpeg,image/webp').split(','),
  DATA_ADAPTER: process.env.CSQ_DATA_ADAPTER || 'memory',
  MAX_HOUSES_PER_USER: parseInt(process.env.CSQ_MAX_HOUSES_PER_USER) || 5
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key'

// Rate limiting implementation
const rateLimiters = new Map()
const sessionStore = new Map() // Simple session store for active houses

async function checkRateLimit(key, limit, windowMs = 60000) {
  const now = Date.now()
  const windowStart = now - windowMs
  
  if (!rateLimiters.has(key)) {
    rateLimiters.set(key, [])
  }
  
  const requests = rateLimiters.get(key)
  const validRequests = requests.filter(timestamp => timestamp > windowStart)
  rateLimiters.set(key, validRequests)
  
  if (validRequests.length >= limit) {
    return false
  }
  
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
        const tiktokCleanUrl = new URL(originalUrl)
        tiktokCleanUrl.search = ''
        return tiktokCleanUrl.toString()
        
      default:
        const cleanUrl = new URL(originalUrl)
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid', 'gclid']
        trackingParams.forEach(param => cleanUrl.searchParams.delete(param))
        return cleanUrl.toString()
    }
  } catch (error) {
    console.error('URL canonicalization error:', error)
  }
  
  return originalUrl
}

// URL metadata fetching with caching
async function fetchUrlMetadata(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Streamer House Bot 1.0'
      },
      timeout: 10000
    })
    
    if (!response.ok) return null
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    const title = $('meta[property="og:title"]').attr('content') ||
                  $('meta[name="twitter:title"]').attr('content') ||
                  $('title').text() ||
                  'Untitled'
    
    const description = $('meta[property="og:description"]').attr('content') ||
                       $('meta[name="description"]').attr('content') ||
                       ''
    
    const thumbnailUrl = $('meta[property="og:image"]').attr('content') ||
                        $('meta[name="twitter:image"]').attr('content') ||
                        null
    
    // Detect provider
    const hostname = new URL(url).hostname.toLowerCase()
    let provider = 'Web'
    let platformIcon = '🔗'
    
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      provider = 'YouTube'
      platformIcon = '📺'
    } else if (hostname.includes('tiktok.com')) {
      provider = 'TikTok'
      platformIcon = '🎵'
    } else if (hostname.includes('twitch.tv')) {
      provider = 'Twitch'
      platformIcon = '🎮'
    } else if (hostname.includes('instagram.com')) {
      provider = 'Instagram'
      platformIcon = '📸'
    }
    
    return {
      title: title.trim(),
      description: description.trim().slice(0, 500),
      thumbnailUrl,
      provider,
      platformIcon,
      canonicalUrl: canonicalizeUrl(url, provider)
    }
  } catch (error) {
    console.error('Metadata fetch error:', error)
    return null
  }
}

// Text sanitization
function sanitizeText(text) {
  if (!text) return ''
  return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
             .replace(/javascript:/gi, '')
             .replace(/on\w+\s*=/gi, '')
             .trim()
}

// CORS handler
function handleCORS(response) {
  response.headers.set('Access-Control-Allow-Origin', '*')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return response
}

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

// Helper to check TTL for posts
function isWithinTTL(createdAt, ttlHours) {
  const now = new Date()
  const postDate = new Date(createdAt)
  const diffHours = (now - postDate) / (1000 * 60 * 60)
  return diffHours <= ttlHours
}

// Helper to get user's active house
function getUserActiveHouse(userId) {
  return sessionStore.get(`active_house_${userId}`) || null
}

// Helper to set user's active house
function setUserActiveHouse(userId, houseId) {
  if (houseId) {
    sessionStore.set(`active_house_${userId}`, houseId)
  } else {
    sessionStore.delete(`active_house_${userId}`)
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
    // Root endpoint
    if (route === '/' && method === 'GET') {
      return handleCORS(NextResponse.json({ 
        message: "Streamer House API",
        version: "2.0.0",
        timezone: CONFIG.TIMEZONE
      }))
    }

    // AUTH ROUTES
    
    // Enhanced signup (UNIFIED - single detailed signup only)
    if (route === '/auth/signup' && method === 'POST') {
      const clientIP = getClientIP(request)
      const rateLimitKey = `signup:${clientIP}`
      
      if (!await checkRateLimit(rateLimitKey, 5, 300000)) {
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
      const existingUser = await userRepo.getByEmail(email)
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
        bio: sanitizeText(bio).slice(0, 500),
        totalPoints: 0,
        roommateSearchVisible: false
      })

      // Create JWT token
      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

      const { passwordHash: _, ...userWithoutPassword } = user
      return handleCORS(NextResponse.json({ 
        token, 
        user: userWithoutPassword 
      }))
    }

    // Disable old basic signup
    if (route === '/auth/signup-basic' && method === 'POST') {
      return handleCORS(NextResponse.json(
        { error: "Basic signup has been removed. Please use the detailed signup." }, 
        { status: 410 }
      ))
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

      const user = await userRepo.getByEmail(email)
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "Invalid credentials" }, 
          { status: 401 }
        ))
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash)
      if (!isValidPassword) {
        return handleCORS(NextResponse.json(
          { error: "Invalid credentials" }, 
          { status: 401 }
        ))
      }

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
      const user = await userRepo.getById(tokenData.userId)
      
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      const { passwordHash: _, ...userWithoutPassword } = user
      return handleCORS(NextResponse.json(userWithoutPassword))
    }

    // HOUSE SYSTEM

    // Get user's houses (MEMBERSHIPS ONLY)
    if (route === '/users/me/houses' && method === 'GET') {
      const tokenData = verifyToken(request)
      const houses = await houseRepo.listByUserId(tokenData.userId)
      
      const housesWithStats = await Promise.all(houses.map(async (house) => {
        const posts = await postRepo.listByHouse(house.id)
        const activePosts24h = posts.filter(post => 
          isWithinTTL(post.createdAt, CONFIG.FEED_TTL_HOURS) && !post.deleted
        ).length
        
        const activeHouseId = getUserActiveHouse(tokenData.userId)
        
        return {
          houseId: house.id,
          name: house.name,
          avatarUrl: house.avatarUrl || null,
          role: house.ownerId === tokenData.userId ? 'owner' : 'member',
          membersCount: house.memberCount || 1,
          activePosts24h,
          isActive: house.id === activeHouseId
        }
      }))
      
      return handleCORS(NextResponse.json(housesWithStats))
    }

    // Get houses summary (creation limit info)
    if (route === '/users/me/houses/summary' && method === 'GET') {
      const tokenData = verifyToken(request)
      const ownedHouses = await houseRepo.listOwnedByUser(tokenData.userId)
      const count = ownedHouses.length
      
      return handleCORS(NextResponse.json({
        count,
        canCreate: count < CONFIG.MAX_HOUSES_PER_USER,
        max: CONFIG.MAX_HOUSES_PER_USER
      }))
    }

    // Get active house
    if (route === '/session/active-house' && method === 'GET') {
      const tokenData = verifyToken(request)
      const activeHouseId = getUserActiveHouse(tokenData.userId)
      
      if (!activeHouseId) {
        return handleCORS(NextResponse.json({ houseId: null }))
      }
      
      // Verify user is still a member
      const house = await houseRepo.getById(activeHouseId)
      const isMember = house && await houseRepo.isMember(activeHouseId, tokenData.userId)
      
      if (!isMember) {
        setUserActiveHouse(tokenData.userId, null)
        return handleCORS(NextResponse.json({ houseId: null }))
      }
      
      return handleCORS(NextResponse.json({ houseId: activeHouseId }))
    }

    // Set active house
    if (route === '/session/active-house' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { houseId } = await request.json()
      
      if (houseId) {
        // Verify user is a member
        const isMember = await houseRepo.isMember(houseId, tokenData.userId)
        if (!isMember) {
          return handleCORS(NextResponse.json(
            { error: "You are not a member of this house" }, 
            { status: 403 }
          ))
        }
      }
      
      setUserActiveHouse(tokenData.userId, houseId)
      return handleCORS(NextResponse.json({ 
        success: true,
        houseId: houseId || null 
      }))
    }

    // Create house (WITH LIMIT ENFORCEMENT)
    if (route === '/houses' && method === 'POST') {
      const tokenData = verifyToken(request)
      
      const rateLimitKey = `houses:${tokenData.userId}`
      if (!await checkRateLimit(rateLimitKey, CONFIG.RATE_LIMIT_WRITE_PER_MIN)) {
        return handleCORS(NextResponse.json(
          { error: "Rate limit exceeded" }, 
          { status: 429 }
        ))
      }

      // Check house creation limit
      const ownedHouses = await houseRepo.listOwnedByUser(tokenData.userId)
      if (ownedHouses.length >= CONFIG.MAX_HOUSES_PER_USER) {
        return handleCORS(NextResponse.json(
          { 
            error: "House creation limit reached",
            code: "HOUSE_LIMIT_REACHED",
            max: CONFIG.MAX_HOUSES_PER_USER 
          }, 
          { status: 409 }
        ))
      }

      const { name } = await request.json()
      
      if (!name) {
        return handleCORS(NextResponse.json(
          { error: "House name is required" }, 
          { status: 400 }
        ))
      }

      const house = await houseRepo.create({
        name: sanitizeText(name),
        ownerId: tokenData.userId,
        memberCount: 1,
        visibility: 'private'
      })

      // Auto-set as active house
      setUserActiveHouse(tokenData.userId, house.id)

      return handleCORS(NextResponse.json(house))
    }

    // Get house feed (USES ACTIVE HOUSE + 24H TTL)
    if (route === '/house/feed' && method === 'GET') {
      const tokenData = verifyToken(request)
      const activeHouseId = getUserActiveHouse(tokenData.userId)
      
      if (!activeHouseId) {
        return handleCORS(NextResponse.json(
          { error: "No active house selected" }, 
          { status: 400 }
        ))
      }
      
      // Verify membership
      const isMember = await houseRepo.isMember(activeHouseId, tokenData.userId)
      if (!isMember) {
        return handleCORS(NextResponse.json(
          { error: "Not a member of this house" }, 
          { status: 403 }
        ))
      }
      
      const posts = await postRepo.listByHouse(activeHouseId)
      
      // Apply 24h TTL filter
      const recentPosts = posts.filter(post => 
        isWithinTTL(post.createdAt, CONFIG.FEED_TTL_HOURS) && !post.deleted
      )
      
      // Add clip counts and author info
      const postsWithData = await Promise.all(recentPosts.map(async (post) => {
        const clips = await clipRepo.listByPost(post.id)
        const author = await userRepo.getById(post.ownerUserId)
        
        return {
          ...post,
          clipCount: clips.length,
          authorName: author?.displayName || 'Unknown',
          authorAvatar: author?.avatarUrl || null,
          visibility: {
            inFeed: true,
            inProfile: isWithinTTL(post.createdAt, CONFIG.PROFILE_TTL_DAYS * 24)
          }
        }
      }))
      
      return handleCORS(NextResponse.json(postsWithData))
    }

    // Create post (TARGETS ACTIVE HOUSE)
    if (route === '/posts' && method === 'POST') {
      const tokenData = verifyToken(request)
      
      const rateLimitKey = `posts:${tokenData.userId}`
      if (!await checkRateLimit(rateLimitKey, CONFIG.RATE_LIMIT_WRITE_PER_MIN)) {
        return handleCORS(NextResponse.json(
          { error: "Rate limit exceeded" }, 
          { status: 429 }
        ))
      }

      const { url, houseId: requestedHouseId } = await request.json()
      
      if (!url) {
        return handleCORS(NextResponse.json(
          { error: "URL is required" }, 
          { status: 400 }
        ))
      }

      // Determine target house (requested or active)
      let targetHouseId = requestedHouseId || getUserActiveHouse(tokenData.userId)
      
      if (!targetHouseId) {
        return handleCORS(NextResponse.json(
          { error: "No house specified and no active house" }, 
          { status: 400 }
        ))
      }
      
      // Verify membership
      const isMember = await houseRepo.isMember(targetHouseId, tokenData.userId)
      if (!isMember) {
        return handleCORS(NextResponse.json(
          { error: "Not a member of this house" }, 
          { status: 403 }
        ))
      }

      // Fetch metadata
      const metadata = await fetchUrlMetadata(url)
      if (!metadata) {
        return handleCORS(NextResponse.json(
          { error: "Could not fetch URL metadata" }, 
          { status: 400 }
        ))
      }

      const post = await postRepo.create({
        ownerUserId: tokenData.userId,
        houseId: targetHouseId,
        url: url,
        canonicalUrl: metadata.canonicalUrl,
        title: metadata.title,
        description: metadata.description,
        thumbnailUrl: metadata.thumbnailUrl,
        provider: metadata.provider,
        platformIcon: metadata.platformIcon,
        isCollaboration: false,
        deleted: false
      })

      return handleCORS(NextResponse.json(post))
    }

    // Get single post
    if (route.startsWith('/posts/') && !route.includes('/clips') && !route.includes('/collaborators') && method === 'GET') {
      const postId = route.split('/')[2]
      const post = await postRepo.getById(postId)
      
      if (!post || post.deleted) {
        return handleCORS(NextResponse.json(
          { error: "Post not found" }, 
          { status: 404 }
        ))
      }
      
      const clips = await clipRepo.listByPost(postId)
      const author = await userRepo.getById(post.ownerUserId)
      
      const postWithData = {
        ...post,
        clipCount: clips.length,
        authorName: author?.displayName || 'Unknown',
        authorAvatar: author?.avatarUrl || null,
        visibility: {
          inFeed: isWithinTTL(post.createdAt, CONFIG.FEED_TTL_HOURS),
          inProfile: isWithinTTL(post.createdAt, CONFIG.PROFILE_TTL_DAYS * 24)
        }
      }
      
      return handleCORS(NextResponse.json(postWithData))
    }

    // ENGAGE REDIRECT WITH TTL RULES
    if (route.startsWith('/r/') && method === 'GET') {
      const postId = route.split('/')[1]
      const url = new URL(request.url)
      const userId = url.searchParams.get('u')
      
      if (!userId) {
        return handleCORS(NextResponse.json(
          { error: "User ID required" }, 
          { status: 400 }
        ))
      }

      const rateLimitKey = `engage:${getClientIP(request)}:${userId}`
      if (!await checkRateLimit(rateLimitKey, CONFIG.RATE_LIMIT_R_PER_MIN)) {
        return handleCORS(NextResponse.json(
          { error: "Rate limit exceeded" }, 
          { status: 429 }
        ))
      }

      const post = await postRepo.getById(postId)
      if (!post || post.deleted) {
        return handleCORS(NextResponse.json(
          { error: "Post not found" }, 
          { status: 404 }
        ))
      }

      if (!isDomainAllowed(post.canonicalUrl)) {
        return handleCORS(NextResponse.json(
          { error: "Domain not allowed" }, 
          { status: 403 }
        ))
      }

      let pointsAwarded = 0
      
      // Owner guard - no points for own posts
      if (post.ownerUserId !== userId) {
        // Check post-specific engagement (24h)
        const postEngagements = await engagementRepo.listByUserAndPost(userId, postId)
        const recentPostEngagement = postEngagements.find(e => 
          e.type === 'engage' && isWithinTTL(e.createdAt, CONFIG.ENGAGE_DEDUP_HOURS)
        )
        
        // Check canonical URL engagement (7d)
        const canonicalEngagements = await engagementRepo.listByUserAndCanonical(userId, post.canonicalUrl)
        const recentCanonicalEngagement = canonicalEngagements.find(e => 
          e.type === 'engage' && isWithinTTL(e.createdAt, CONFIG.CANONICAL_DEDUP_DAYS * 24)
        )
        
        // Award points only if both checks pass
        if (!recentPostEngagement && !recentCanonicalEngagement) {
          await engagementRepo.create({
            userId,
            postId,
            canonicalUrl: post.canonicalUrl,
            type: 'engage',
            points: 1
          })
          
          await userRepo.addPoints(userId, 1)
          pointsAwarded = 1
        }
      }

      // Always redirect, regardless of points
      return NextResponse.redirect(post.canonicalUrl, 302)
    }

    // USER PROFILES WITH TTL
    if (route.startsWith('/users/') && !route.includes('/avatar') && !route.includes('/houses') && method === 'GET') {
      const username = route.split('/')[2]
      
      const user = await userRepo.getByUsername(username)
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      // Get user's posts with 7d TTL
      const house = await houseRepo.getByUserId(user.id)
      let posts = []
      if (house) {
        const allPosts = await postRepo.listByHouse(house.id)
        posts = allPosts.filter(post => 
          post.ownerUserId === user.id && 
          isWithinTTL(post.createdAt, CONFIG.PROFILE_TTL_DAYS * 24) &&
          !post.deleted
        )
        
        // Add clip counts
        for (let post of posts) {
          const clips = await clipRepo.listByPost(post.id)
          post.clipCount = clips.length
        }
      }

      // Get clips made by user
      const clips = await clipRepo.listByCreator(user.id)
      const clipsWithData = await Promise.all(clips.map(async (clip) => {
        const originalPost = await postRepo.getById(clip.postId)
        return {
          ...clip,
          postTitle: originalPost?.title || 'Unknown',
          postThumbnailUrl: originalPost?.thumbnailUrl || null
        }
      }))

      // Calculate points breakdown
      const engagements = await engagementRepo.listByUser(user.id)
      const pointsBreakdown = {
        engage: {
          count: engagements.filter(e => e.type === 'engage').length,
          total: engagements.filter(e => e.type === 'engage').reduce((sum, e) => sum + e.points, 0)
        },
        clip: {
          count: engagements.filter(e => e.type === 'clip').length,
          total: engagements.filter(e => e.type === 'clip').reduce((sum, e) => sum + e.points, 0)
        },
        collab: {
          count: engagements.filter(e => e.type === 'collab').length,
          total: engagements.filter(e => e.type === 'collab').reduce((sum, e) => sum + e.points, 0)
        }
      }

      const { passwordHash: _, ...safeUser } = user

      return handleCORS(NextResponse.json({
        user: {
          ...safeUser,
          pointsBreakdown
        },
        posts: {
          items: posts
        },
        clipsMade: {
          items: clipsWithData
        },
        pointsBreakdown
      }))
    }

    // FIND ROOMMATES (AUTH REQUIRED)
    if (route === '/roommates' && method === 'GET') {
      const tokenData = verifyToken(request) // Throws if no auth
      const url = new URL(request.url)
      const filters = {
        platforms: url.searchParams.get('platforms')?.split(','),
        niches: url.searchParams.get('niches')?.split(','), 
        region: url.searchParams.get('region'),
        timezone: url.searchParams.get('timezone')
      }

      const users = await userRepo.listForRoommateSearch(filters)
      
      // Remove sensitive data and exclude current user
      const safeUsers = users
        .filter(user => user.id !== tokenData.userId)
        .map(user => ({
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          platforms: user.platforms,
          niches: user.niches,
          games: user.games,
          city: user.city,
          timeZone: user.timeZone,
          hasSchedule: user.hasSchedule,
          totalPoints: user.totalPoints
        }))

      return handleCORS(NextResponse.json(safeUsers))
    }

    // SETTINGS ENDPOINTS

    // Update roommate search visibility
    if (route === '/settings/roommate-search' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { appearInRoommateSearch } = await request.json()
      
      const user = await userRepo.update(tokenData.userId, {
        roommateSearchVisible: Boolean(appearInRoommateSearch)
      })
      
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }
      
      return handleCORS(NextResponse.json({
        message: "Settings updated successfully",
        appearInRoommateSearch: user.roommateSearchVisible
      }))
    }

    // Update username
    if (route === '/settings/username' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { newUsername, password } = await request.json()
      
      if (!newUsername || !password) {
        return handleCORS(NextResponse.json(
          { error: "Username and password are required" }, 
          { status: 400 }
        ))
      }
      
      const user = await userRepo.getById(tokenData.userId)
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash)
      if (!isValidPassword) {
        return handleCORS(NextResponse.json(
          { error: "Invalid password" }, 
          { status: 401 }
        ))
      }
      
      // Check if username is already taken
      const baseUsername = newUsername.toLowerCase().replace(/[^a-z0-9]/g, '')
      let username = baseUsername
      let counter = 1
      
      while (await userRepo.getByUsername(username)) {
        username = `${baseUsername}${counter}`
        counter++
      }
      
      const updatedUser = await userRepo.update(tokenData.userId, {
        displayName: newUsername,
        username: username
      })
      
      return handleCORS(NextResponse.json({
        message: "Username updated successfully",
        displayName: updatedUser.displayName,
        username: updatedUser.username
      }))
    }

    // MEDIA UPLOAD ENDPOINTS

    // Upload media (profile pictures, screenshots) with validation
    if (route === '/media/upload' && method === 'POST') {
      const tokenData = verifyToken(request)
      
      // Simulate file upload validation
      const mediaUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${tokenData.userId}&size=150`
      
      const media = await mediaRepo.create({
        userId: tokenData.userId,
        filename: 'avatar.svg',
        contentType: 'image/svg+xml',
        size: 1024,
        url: mediaUrl
      })
      
      // Update user's avatar URL
      await userRepo.setAvatar(tokenData.userId, mediaUrl)
      
      return handleCORS(NextResponse.json({
        url: mediaUrl,
        id: media.id,
        message: "Media uploaded successfully"
      }))
    }

    // CLIP SYSTEM
    if (route === '/clips' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { postId, clipUrl } = await request.json()
      
      if (!postId || !clipUrl) {
        return handleCORS(NextResponse.json(
          { error: "Post ID and clip URL are required" }, 
          { status: 400 }
        ))
      }

      const post = await postRepo.getById(postId)
      if (!post) {
        return handleCORS(NextResponse.json(
          { error: "Post not found" }, 
          { status: 404 }
        ))
      }

      // Prevent clipping own posts
      if (post.ownerUserId === tokenData.userId) {
        return handleCORS(NextResponse.json(
          { error: "Cannot create clips of your own posts" }, 
          { status: 400 }
        ))
      }

      const clip = await clipRepo.create({
        postId,
        creatorUserId: tokenData.userId,
        clipUrl: sanitizeText(clipUrl),
        source: 'url'
      })

      // Award points
      await engagementRepo.create({
        userId: tokenData.userId,
        postId,
        canonicalUrl: post.canonicalUrl,
        type: 'clip',
        points: 2
      })
      
      await userRepo.addPoints(tokenData.userId, 2)

      return handleCORS(NextResponse.json({
        clip,
        pointsAwarded: 2
      }))
    }

    // BUG REPORT SYSTEM
    if (route === '/bug-reports' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { type, title, description, email, screenshotUrl } = await request.json()
      
      // Map frontend types to backend categories
      const categoryMap = {
        'bug': 'Bug',
        'feature': 'Idea', 
        'abuse': 'Abuse',
        'other': 'Bug'
      }
      
      const category = categoryMap[type] || 'Bug'
      
      if (!title || !description) {
        return handleCORS(NextResponse.json(
          { error: "Title and description are required" }, 
          { status: 400 }
        ))
      }

      const report = await bugReportRepo.create({
        userId: tokenData.userId,
        category,
        title: sanitizeText(title),
        description: sanitizeText(description),
        contextUrl: email || null,
        screenshot: screenshotUrl || null
      })

      return handleCORS(NextResponse.json({
        ticketId: report.ticketId,
        message: "Bug report submitted successfully"
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