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
  clipRepo,
  engagementRepo,
  voteRepo,
  inviteRepo,
  bugReportRepo,
  mediaRepo
} from '../../../lib/repositories/memory/index.js'

// Global Configuration
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
  MAX_HOUSES_PER_USER: parseInt(process.env.CSQ_MAX_HOUSES_PER_USER) || 5
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key'

// Session store for active houses
const sessionStore = new Map()
const rateLimiters = new Map()

// Rate limiting
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

// Domain allowlist check
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

// URL canonicalization
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

// URL metadata fetching
async function fetchUrlMetadata(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Streamer House Bot 1.0' },
      timeout: 10000
    })
    
    if (!response.ok) return null
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    const title = $('meta[property="og:title"]').attr('content') ||
                  $('meta[name="twitter:title"]').attr('content') ||
                  $('title').text() || 'Untitled'
    
    const description = $('meta[property="og:description"]').attr('content') ||
                       $('meta[name="description"]').attr('content') || ''
    
    const thumbnailUrl = $('meta[property="og:image"]').attr('content') ||
                        $('meta[name="twitter:image"]').attr('content') || null
    
    const hostname = new URL(url).hostname.toLowerCase()
    let provider = 'Web'
    
    if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      provider = 'YouTube'
    } else if (hostname.includes('tiktok.com')) {
      provider = 'TikTok'
    } else if (hostname.includes('twitch.tv')) {
      provider = 'Twitch'
    } else if (hostname.includes('instagram.com')) {
      provider = 'Instagram'
    }
    
    return {
      title: title.trim(),
      description: description.trim().slice(0, 500),
      thumbnailUrl,
      provider,
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

// JWT token verification - support both Authorization header and cookies
function verifyToken(request) {
  let token = null
  
  // First try Authorization header (for existing functionality)
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7)
  } else {
    // Try cookie
    const cookieHeader = request.headers.get('cookie')
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => c.split('='))
      )
      token = cookies.access_token
    }
  }
  
  if (!token) {
    throw new Error('No token provided')
  }
  
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    throw new Error('Invalid token')
  }
}

// Get client IP
function getClientIP(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0] || 
         request.headers.get('x-real-ip') || 
         '127.0.0.1'
}

// TTL check helper
function isWithinTTL(createdAt, ttlHours) {
  const now = new Date()
  const postDate = new Date(createdAt)
  const diffHours = (now - postDate) / (1000 * 60 * 60)
  return diffHours <= ttlHours
}

// Active house session management
function getUserActiveHouse(userId) {
  return sessionStore.get(`active_house_${userId}`) || null
}

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

// Main route handler
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

    // ======================
    // AUTH ROUTES
    // ======================
    
    // Unified signup (only detailed signup)
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
        bio: sanitizeText(bio).slice(0, 500)
      })

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

      const { passwordHash: _, ...userWithoutPassword } = user
      const response = handleCORS(NextResponse.json({ 
        token, 
        user: userWithoutPassword 
      }))
      
      // Set HttpOnly cookie for persistent auth
      response.cookies.set("access_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      
      return response
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
      const response = handleCORS(NextResponse.json({ 
        token, 
        user: userWithoutPassword 
      }))
      
      // Set HttpOnly cookie for persistent auth
      response.cookies.set("access_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })
      
      return response
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

    // Logout endpoint
    if (route === '/auth/logout' && method === 'POST') {
      const response = handleCORS(NextResponse.json({ ok: true }))
      response.cookies.set("access_token", "", { 
        httpOnly: true, 
        path: "/", 
        maxAge: 0 
      })
      return response
    }

    // ======================
    // PROFILE ROUTES (STABLE SCHEMA)
    // ======================
    
    // Get user profile by username (case-insensitive, 404 only if genuinely missing)
    if (route.startsWith('/users/') && method === 'GET') {
      const username = route.split('/')[2]
      
      if (!username) {
        return handleCORS(NextResponse.json(
          { error: "Username required" }, 
          { status: 400 }
        ))
      }

      // Case-insensitive username lookup
      const user = await userRepo.getByUsername(username)
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      // Get posts with 7-day TTL and clip counts
      const postsResult = await postRepo.listByUser(user.id, { 
        ttlDays: CONFIG.PROFILE_TTL_DAYS,
        page: 1,
        pageSize: 12
      })
      
      // Add clip counts to posts
      const postsWithClips = await Promise.all(postsResult.items.map(async (post) => {
        const clips = await clipRepo.listByPost(post.id)
        return {
          id: post.id,
          title: post.title,
          thumbnailUrl: post.thumbnailUrl,
          provider: post.provider,
          clipCount: clips.length,
          createdAt: post.createdAt
        }
      }))

      // Get clips made by user
      const clipsResult = await clipRepo.listByCreator(user.id, {
        page: 1,
        pageSize: 12
      })

      // Add post info to clips
      const clipsWithPostInfo = await Promise.all(clipsResult.items.map(async (clip) => {
        const post = await postRepo.getById(clip.postId)
        return {
          id: clip.id,
          postId: clip.postId,
          postTitle: post?.title || 'Unknown',
          postThumbnailUrl: post?.thumbnailUrl || null,
          createdAt: clip.createdAt
        }
      }))

      // Get points breakdown
      const pointsBreakdown = await engagementRepo.getPointsBreakdown(user.id)

      const { passwordHash: _, ...safeUser } = user

      return handleCORS(NextResponse.json({
        user: {
          ...safeUser,
          pointsBreakdown: {
            engage: pointsBreakdown.engage?.total || 0,
            clip: pointsBreakdown.clip?.total || 0,
            collab: pointsBreakdown.collab?.total || 0
          }
        },
        posts: {
          items: postsWithClips,
          page: postsResult.page,
          pageSize: postsResult.pageSize,
          total: postsResult.total
        },
        clipsMade: {
          items: clipsWithPostInfo,
          page: clipsResult.page,
          pageSize: clipsResult.pageSize,
          total: clipsResult.total
        }
      }))
    }

    // Get user posts (paginated)
    if (route.match(/^\/users\/[^\/]+\/posts$/) && method === 'GET') {
      const username = route.split('/')[2]
      const url = new URL(request.url)
      const page = parseInt(url.searchParams.get('page')) || 1
      const pageSize = parseInt(url.searchParams.get('pageSize')) || 12

      const user = await userRepo.getByUsername(username)
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      const postsResult = await postRepo.listByUser(user.id, { 
        ttlDays: CONFIG.PROFILE_TTL_DAYS,
        page,
        pageSize
      })

      return handleCORS(NextResponse.json(postsResult))
    }

    // Get user clips (paginated)
    if (route.match(/^\/users\/[^\/]+\/clips$/) && method === 'GET') {
      const username = route.split('/')[2]
      const url = new URL(request.url)
      const page = parseInt(url.searchParams.get('page')) || 1
      const pageSize = parseInt(url.searchParams.get('pageSize')) || 12

      const user = await userRepo.getByUsername(username)
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      const clipsResult = await clipRepo.listByCreator(user.id, { page, pageSize })

      return handleCORS(NextResponse.json(clipsResult))
    }

    // Update profile (requires at least one field)
    if (route === '/profile' && method === 'PUT') {
      const tokenData = verifyToken(request)
      const body = await request.json()
      
      // Check if at least one field is provided and not empty
      const hasValidField = Object.values(body).some((x) => {
        if (x === undefined || x === null) return false;
        if (Array.isArray(x)) return x.length > 0;
        return String(x).trim() !== "";
      });
      
      if (!hasValidField) {
        return handleCORS(NextResponse.json({ 
          error: "Please fill at least one field." 
        }, { status: 400 }))
      }
      
      // Update user profile with provided fields
      const updateData = {}
      if (body.bio !== undefined) updateData.bio = body.bio
      if (body.interests !== undefined) updateData.interests = body.interests
      if (body.location !== undefined) updateData.location = body.location
      if (body.budget !== undefined) updateData.budget = body.budget
      if (body.platforms !== undefined) updateData.platforms = body.platforms
      if (body.niches !== undefined) updateData.niches = body.niches
      if (body.games !== undefined) updateData.games = body.games
      if (body.city !== undefined) updateData.city = body.city
      if (body.timeZone !== undefined) updateData.timeZone = body.timeZone
      
      const user = await userRepo.updateProfile(tokenData.userId, updateData)
      
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }
      
      const { passwordHash: _, ...userWithoutPassword } = user
      return handleCORS(NextResponse.json({ 
        ok: true, 
        user: userWithoutPassword 
      }))
    }

    // ======================
    // ROOMMATES ROUTES (AUTH REQUIRED, NO LOGOUT ON 401)
    // ======================
    
    // Find roommates (requires auth)
    if (route === '/roommates' && method === 'GET') {
      const tokenData = verifyToken(request) // Will throw if no auth
      
      const url = new URL(request.url)
      const filters = {
        platforms: url.searchParams.get('platforms')?.split(','),
        niche: url.searchParams.get('niche'),
        timezone: url.searchParams.get('timezone'),
        region: url.searchParams.get('region'),
        experience: url.searchParams.get('experience'),
        q: url.searchParams.get('q'),
        page: parseInt(url.searchParams.get('page')) || 1,
        pageSize: parseInt(url.searchParams.get('pageSize')) || 20
      }

      const users = await userRepo.listForRoommateSearch(filters)
      
      // Remove current user and sensitive data
      const safeUsers = users
        .filter(user => user.id !== tokenData.userId)
        .map(user => ({
          userId: user.id,
          username: user.username,
          avatarUrl: user.avatarUrl,
          niche: user.roommateNiche,
          platforms: user.roommatePlatforms,
          timezone: user.roommateTimezone,
          region: user.roommateRegion,
          experience: user.roommateExperience
        }))

      // Simple pagination
      const startIndex = (filters.page - 1) * filters.pageSize
      const endIndex = startIndex + filters.pageSize
      const paginatedUsers = safeUsers.slice(startIndex, endIndex)

      return handleCORS(NextResponse.json({
        items: paginatedUsers,
        page: filters.page,
        pageSize: filters.pageSize,
        total: safeUsers.length
      }))
    }

    // Update roommate search settings
    if (route === '/settings/roommate-search' && method === 'POST') {
      const tokenData = verifyToken(request)
      const settings = await request.json()
      
      const user = await userRepo.updateRoommateSettings(tokenData.userId, settings)
      
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }
      
      return handleCORS(NextResponse.json({
        message: "Roommate settings updated successfully",
        optIn: user.roommateOptIn
      }))
    }

    // ======================
    // HOUSE/DASHBOARD ROUTES (FIX FIRST-HOUSE BUG)
    // ======================
    
    // Create house (auto-set as active)
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
        ownerUserId: tokenData.userId
      })

      // IMPORTANT: Auto-set as active house for first-house fix
      setUserActiveHouse(tokenData.userId, house.id)

      return handleCORS(NextResponse.json({
        ...house,
        setActive: true  // Signal to frontend that this is now active
      }))
    }

    // Get user's houses (membership only)
    if (route === '/users/me/houses' && method === 'GET') {
      const tokenData = verifyToken(request)
      const houses = await houseRepo.listByUserId(tokenData.userId)
      
      const activeHouseId = getUserActiveHouse(tokenData.userId)
      
      const housesWithStats = await Promise.all(houses.map(async (house) => {
        // Count active posts (24h)
        const posts = await postRepo.listByHouse(house.id, { ttlHours: CONFIG.FEED_TTL_HOURS })
        const activePosts24h = posts.length
        
        return {
          houseId: house.id,
          name: house.name,
          avatarUrl: house.avatarUrl,
          role: house.role,
          membersCount: house.memberCount,
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
      let activeHouseId = getUserActiveHouse(tokenData.userId)
      
      // Auto-fallback: if no active house but user has houses, pick most recent
      if (!activeHouseId) {
        const userHouses = await houseRepo.listByUserId(tokenData.userId)
        if (userHouses.length > 0) {
          activeHouseId = userHouses[0].id // Most recently joined
          setUserActiveHouse(tokenData.userId, activeHouseId)
        }
      }
      
      // Verify user is still a member
      if (activeHouseId) {
        const isMember = await houseRepo.isMember(activeHouseId, tokenData.userId)
        if (!isMember) {
          setUserActiveHouse(tokenData.userId, null)
          activeHouseId = null
        }
      }
      
      return handleCORS(NextResponse.json({ 
        houseId: activeHouseId 
      }))
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

    // Get house feed (uses active house, 24h TTL)
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
      
      // Get posts with 24h TTL
      const posts = await postRepo.listByHouse(activeHouseId, { 
        ttlHours: CONFIG.FEED_TTL_HOURS 
      })
      
      // Add clip counts and author info
      const postsWithData = await Promise.all(posts.map(async (post) => {
        const clips = await clipRepo.listByPost(post.id)
        const author = await userRepo.getById(post.ownerUserId)
        
        return {
          ...post,
          clipCount: clips.length,
          authorName: author?.displayName || 'Unknown',
          authorAvatar: author?.avatarUrl || null
        }
      }))
      
      return handleCORS(NextResponse.json(postsWithData))
    }

    // Get house summary (optional dashboard stats)
    if (route.startsWith('/house/') && route.endsWith('/summary') && method === 'GET') {
      const houseId = route.split('/')[2]
      const tokenData = verifyToken(request)
      
      // Verify membership
      const isMember = await houseRepo.isMember(houseId, tokenData.userId)
      if (!isMember) {
        return handleCORS(NextResponse.json(
          { error: "Not a member of this house" }, 
          { status: 403 }
        ))
      }
      
      const summary = await houseRepo.getSummary(houseId)
      if (!summary) {
        return handleCORS(NextResponse.json(
          { error: "House not found" }, 
          { status: 404 }
        ))
      }
      
      return handleCORS(NextResponse.json(summary))
    }

    // ======================
    // POST MANAGEMENT
    // ======================
    
    // Create post (targets active house)
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
        provider: metadata.provider,
        originalUrl: url,
        canonicalUrl: metadata.canonicalUrl,
        title: metadata.title,
        description: metadata.description,
        thumbnailUrl: metadata.thumbnailUrl,
        isCollaboration: false
      })

      return handleCORS(NextResponse.json(post))
    }

    // ======================
    // ENGAGEMENT SYSTEM (WITH TTL RULES)
    // ======================
    
    // Engage redirect with TTL rules
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
      if (!post || post.isDeleted) {
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

    // ======================
    // MEDIA/SETTINGS ROUTES
    // ======================
    
    // Upload media (profile pictures, screenshots)
    if (route === '/media/upload' && method === 'POST') {
      const tokenData = verifyToken(request)
      
      // Simulate file upload with avatar generation
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

    // ======================
    // ERROR HANDLING
    // ======================
    
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