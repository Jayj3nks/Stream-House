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
  ENGAGE_DEDUP_HOURS: parseInt(process.env.CSQ_ENGAGE_DEDUP_HOURS) || 24,
  URL_CACHE_DAYS: parseInt(process.env.CSQ_URL_CACHE_DAYS) || 7,
  REDIRECT_ALLOWLIST: (process.env.CSQ_REDIRECT_ALLOWLIST || 'youtube.com,youtu.be,tiktok.com,vm.tiktok.com,twitch.tv,instagram.com,facebook.com,fb.watch,kik.com').split(','),
  MAX_CLIP_MB: parseInt(process.env.CSQ_MAX_CLIP_MB) || 50,
  ALLOWED_MIME: (process.env.CSQ_ALLOWED_MIME || 'video/mp4,video/webm,video/quicktime').split(','),
  ENGAGE_RATE_LIMIT: parseInt(process.env.CSQ_ENGAGE_RATE_LIMIT) || 20,
  WRITE_RATE_LIMIT: parseInt(process.env.CSQ_WRITE_RATE_LIMIT) || 10
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

// Enhanced URL metadata fetching
async function fetchUrlMetadata(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'StreamerHouse-Bot/1.0 (+https://streamerhouse.com)'
      },
      timeout: 10000
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const html = await response.text()
    const $ = cheerio.load(html)
    
    const title = sanitizeText($('title').text() || 
                  $('meta[property="og:title"]').attr('content') || 
                  'Untitled')
    
    const description = sanitizeText($('meta[property="og:description"]').attr('content') || 
                       $('meta[name="description"]').attr('content') || 
                       '')
    
    const thumbnail = $('meta[property="og:image"]').attr('content') || ''
    
    // Platform detection
    let provider = 'unknown'
    let platformIcon = '🔗'
    
    const hostname = new URL(url).hostname.toLowerCase()
    
    if (hostname.includes('tiktok.com')) {
      provider = 'tiktok'
      platformIcon = '🎵'
    } else if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
      provider = 'youtube'
      platformIcon = '📺'
    } else if (hostname.includes('twitch.tv')) {
      provider = 'twitch'
      platformIcon = '🎮'
    } else if (hostname.includes('instagram.com')) {
      provider = 'instagram'
      platformIcon = '📷'
    }

    const canonicalUrl = canonicalizeUrl(url, provider) || url

    return { 
      title: title.slice(0, 200), 
      description: description.slice(0, 500),
      thumbnailUrl: thumbnail, 
      provider,
      platformIcon,
      canonicalUrl,
      originalUrl: url
    }
  } catch (error) {
    console.error('Error fetching URL metadata:', error)
    
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

// XSS protection
function sanitizeText(text) {
  if (!text) return ''
  return text
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
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
const JWT_SECRET = process.env.JWT_SECRET || 'streamer-house-secret-key'

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
        version: "1.0.0",
        timezone: CONFIG.TIMEZONE
      }))
    }

    // AUTH ROUTES
    
    // Enhanced signup
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

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12)

      // Create user
      const user = await userRepo.create({
        username,
        email,
        passwordHash,
        displayName: sanitizeText(displayName),
        platforms: platforms.slice(0, 10),
        niches: niches.slice(0, 10),
        games: games.slice(0, 20),
        city: sanitizeText(city),
        timeZone,
        hasSchedule,
        schedule,
        bio: sanitizeText(bio).slice(0, 500),
        totalPoints: 0
      })

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

    // HOUSE SYSTEM (replaces Squads)

    // Create house
    if (route === '/houses' && method === 'POST') {
      const tokenData = verifyToken(request)
      
      const rateLimitKey = `houses:${tokenData.userId}`
      if (!await checkRateLimit(rateLimitKey, CONFIG.WRITE_RATE_LIMIT)) {
        return handleCORS(NextResponse.json(
          { error: "Rate limit exceeded" }, 
          { status: 429 }
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

      return handleCORS(NextResponse.json(house))
    }

    // Get user's house
    if (route.startsWith('/houses/user/') && method === 'GET') {
      const userId = route.split('/')[3]
      const house = await houseRepo.getByUserId(userId)
      
      if (house) {
        const members = await houseRepo.listMembers(house.id)
        house.members = members.map(m => ({ id: m.id, displayName: m.displayName, username: m.username }))
      }
      
      return handleCORS(NextResponse.json(house))
    }

    // Leave house
    if (route.match(/^\/houses\/[^\/]+\/leave$/) && method === 'POST') {
      const houseId = route.split('/')[2]
      const tokenData = verifyToken(request)
      
      const success = await houseRepo.leave(houseId, tokenData.userId)
      
      if (success) {
        return handleCORS(NextResponse.json({ message: "Left house successfully" }))
      } else {
        return handleCORS(NextResponse.json(
          { error: "Failed to leave house" }, 
          { status: 400 }
        ))
      }
    }

    // POST SYSTEM WITH DELETE AND VISIBILITY RULES

    // Create post
    if (route === '/posts' && method === 'POST') {
      const tokenData = verifyToken(request)
      
      const rateLimitKey = `posts:${tokenData.userId}`
      if (!await checkRateLimit(rateLimitKey, CONFIG.WRITE_RATE_LIMIT)) {
        return handleCORS(NextResponse.json(
          { error: "Rate limit exceeded" }, 
          { status: 429 }
        ))
      }

      const { url, houseId } = await request.json()
      
      if (!url) {
        return handleCORS(NextResponse.json(
          { error: "URL is required" }, 
          { status: 400 }
        ))
      }

      try {
        new URL(url)
      } catch {
        return handleCORS(NextResponse.json(
          { error: "Invalid URL format" }, 
          { status: 400 }
        ))
      }

      const metadata = await fetchUrlMetadata(url)

      if (!isDomainAllowed(metadata.canonicalUrl)) {
        return handleCORS(NextResponse.json(
          { error: "URL domain not allowed" }, 
          { status: 400 }
        ))
      }

      const user = await userRepo.getById(tokenData.userId)

      const post = await postRepo.create({
        ownerUserId: tokenData.userId,
        houseId: houseId || null,
        provider: metadata.provider,
        originalUrl: metadata.originalUrl,
        canonicalUrl: metadata.canonicalUrl,
        title: metadata.title,
        description: metadata.description,
        thumbnailUrl: metadata.thumbnailUrl,
        // Legacy compatibility
        authorName: user?.displayName || 'Unknown',
        platform: metadata.provider,
        platformIcon: metadata.platformIcon
      })
      
      // Get clip count
      const clips = await clipRepo.listByPost(post.id)
      post.clipCount = clips.length

      return handleCORS(NextResponse.json(post))
    }

    // Get single post
    if (route.startsWith('/posts/') && !route.includes('/collaborators') && !route.includes('/clips') && method === 'GET') {
      const postId = route.split('/')[2]
      
      const post = await postRepo.getById(postId)
      if (!post) {
        return handleCORS(NextResponse.json(
          { error: "Post not found" }, 
          { status: 404 }
        ))
      }

      const clips = await clipRepo.listByPost(post.id)
      post.clipCount = clips.length

      return handleCORS(NextResponse.json(post))
    }

    // Delete post (owner only)
    if (route.startsWith('/posts/') && method === 'DELETE') {
      const postId = route.split('/')[2]
      const tokenData = verifyToken(request)
      
      const success = await postRepo.delete(postId, tokenData.userId)
      
      if (success) {
        return handleCORS(NextResponse.json({ message: "Post deleted successfully" }))
      } else {
        return handleCORS(NextResponse.json(
          { error: "Not authorized to delete this post" }, 
          { status: 403 }
        ))
      }
    }

    // Get house feed with visibility rules
    if (route.match(/^\/house\/[^\/]+\/feed$/) && method === 'GET') {
      const houseId = route.split('/')[2]
      
      const posts = await postRepo.listByHouse(houseId, { limit: 50 })
      
      // Add clip counts
      for (let post of posts) {
        const clips = await clipRepo.listByPost(post.id)
        post.clipCount = clips.length
      }

      return handleCORS(NextResponse.json(posts))
    }

    // COLLABORATORS WITH DROPDOWN

    // Add collaborators (house members dropdown)
    if (route.match(/^\/posts\/[^\/]+\/collaborators$/) && method === 'POST') {
      const postId = route.split('/')[2]
      const tokenData = verifyToken(request)
      
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

      const post = await postRepo.getById(postId)
      if (!post) {
        return handleCORS(NextResponse.json(
          { error: "Post not found" }, 
          { status: 404 }
        ))
      }

      const isOwner = await postRepo.isOwner(postId, tokenData.userId)
      if (!isOwner) {
        return handleCORS(NextResponse.json(
          { error: "Only post owner can add collaborators" }, 
          { status: 403 }
        ))
      }

      const wasCollaboration = post.isCollaboration
      const allCollaborators = [post.ownerUserId, ...collaboratorUserIds]
      
      await postRepo.addCollaborators(postId, allCollaborators)

      // Award points only on first collaboration marking
      if (!wasCollaboration) {
        for (const userId of allCollaborators) {
          await engagementRepo.create({
            userId,
            postId,
            type: 'collab',
            points: 3
          })

          const user = await userRepo.getById(userId)
          if (user) {
            await userRepo.update(userId, { 
              totalPoints: (user.totalPoints || 0) + 3 
            })
          }
        }
      }

      return handleCORS(NextResponse.json({ 
        message: "Collaborators added successfully",
        pointsAwarded: wasCollaboration ? 0 : 3,
        collaborators: allCollaborators
      }))
    }

    // ENGAGE SYSTEM

    // Engage redirect
    if (route.startsWith('/r/') && method === 'GET') {
      const postId = route.split('/')[2]
      const url = new URL(request.url)
      const userId = url.searchParams.get('u')

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

      const post = await postRepo.getById(postId)
      if (!post) {
        return handleCORS(NextResponse.json(
          { error: "Post not found" }, 
          { status: 404 }
        ))
      }

      if (!isDomainAllowed(post.canonicalUrl)) {
        return handleCORS(NextResponse.json(
          { error: "Redirect URL not allowed" }, 
          { status: 403 }
        ))
      }

      // Check deduplication and award points if eligible
      const canEngage = await engagementRepo.checkDedup(userId, postId, 'engage', CONFIG.ENGAGE_DEDUP_HOURS)

      if (canEngage) {
        await engagementRepo.create({
          userId,
          postId,
          type: 'engage',
          points: 1
        })

        const user = await userRepo.getById(userId)
        if (user) {
          await userRepo.update(userId, { 
            totalPoints: (user.totalPoints || 0) + 1 
          })
        }
      }

      return Response.redirect(post.canonicalUrl, 302)
    }

    // CLIPS SYSTEM

    // Create clip
    if (route === '/clips' && method === 'POST') {
      const tokenData = verifyToken(request)
      
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

      const post = await postRepo.getById(postId)
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

      const clip = await clipRepo.create({
        postId,
        creatorUserId: tokenData.userId,
        source,
        clipUrl: source === 'url' ? clipUrl : null,
        storagePath: null,
        thumbnailUrl: null
      })

      await engagementRepo.create({
        userId: tokenData.userId,
        postId,
        type: 'clip',
        points: 2
      })

      const user = await userRepo.getById(tokenData.userId)
      if (user) {
        await userRepo.update(tokenData.userId, { 
          totalPoints: (user.totalPoints || 0) + 2 
        })
      }

      return handleCORS(NextResponse.json({ 
        clip, 
        pointsAwarded: 2 
      }))
    }

    // Get clips for post
    if (route.match(/^\/posts\/[^\/]+\/clips$/) && method === 'GET') {
      const postId = route.split('/')[2]
      
      const clips = await clipRepo.listByPost(postId)

      // Add creator info
      for (let clip of clips) {
        const creator = await userRepo.getById(clip.creatorUserId)
        if (creator) {
          clip.creator = { 
            displayName: creator.displayName, 
            username: creator.username 
          }
        }
      }

      return handleCORS(NextResponse.json(clips))
    }

    // SILENT KICK VOTE SYSTEM

    // Create kick proposal
    if (route.match(/^\/houses\/[^\/]+\/votes\/kick$/) && method === 'POST') {
      const houseId = route.split('/')[2]
      const tokenData = verifyToken(request)
      
      const { targetUserId, reason } = await request.json()
      
      if (!targetUserId) {
        return handleCORS(NextResponse.json(
          { error: "Target user ID is required" }, 
          { status: 400 }
        ))
      }

      // Verify both users are house members
      const isMember = await houseRepo.isMember(houseId, tokenData.userId)
      const isTargetMember = await houseRepo.isMember(houseId, targetUserId)
      
      if (!isMember || !isTargetMember) {
        return handleCORS(NextResponse.json(
          { error: "Both users must be house members" }, 
          { status: 403 }
        ))
      }

      const proposal = await voteRepo.createKickProposal(houseId, targetUserId, tokenData.userId, reason)
      
      return handleCORS(NextResponse.json({ 
        proposalId: proposal.id 
      }))
    }

    // Vote on kick proposal
    if (route.match(/^\/houses\/[^\/]+\/votes\/[^\/]+$/) && method === 'POST') {
      const houseId = route.split('/')[2]
      const proposalId = route.split('/')[4]
      const tokenData = verifyToken(request)
      
      const { vote } = await request.json()
      
      if (!['yes', 'no'].includes(vote)) {
        return handleCORS(NextResponse.json(
          { error: "Vote must be 'yes' or 'no'" }, 
          { status: 400 }
        ))
      }

      const canVote = await voteRepo.canVote(proposalId, tokenData.userId)
      if (!canVote) {
        return handleCORS(NextResponse.json(
          { error: "Cannot vote on this proposal" }, 
          { status: 403 }
        ))
      }

      const success = await voteRepo.vote(proposalId, tokenData.userId, vote)
      
      if (success) {
        return handleCORS(NextResponse.json({ message: "Vote recorded" }))
      } else {
        return handleCORS(NextResponse.json(
          { error: "Failed to record vote" }, 
          { status: 400 }
        ))
      }
    }

    // Get vote proposal status
    if (route.match(/^\/houses\/[^\/]+\/votes\/[^\/]+$/) && method === 'GET') {
      const proposalId = route.split('/')[4]
      const tokenData = verifyToken(request)
      
      const proposal = await voteRepo.getProposal(proposalId)
      if (!proposal) {
        return handleCORS(NextResponse.json(
          { error: "Proposal not found" }, 
          { status: 404 }
        ))
      }

      // Don't show proposal to target user
      if (proposal.targetUserId === tokenData.userId) {
        return handleCORS(NextResponse.json(
          { error: "Not authorized to view this proposal" }, 
          { status: 403 }
        ))
      }

      const tally = await voteRepo.tally(proposalId)
      
      // Execute if expired and hasn't been executed
      if (new Date() > proposal.expiresAt && !proposal.executed) {
        await voteRepo.executeKick(proposalId)
      }

      return handleCORS(NextResponse.json({
        id: proposal.id,
        status: proposal.status,
        expiresAt: proposal.expiresAt,
        tally
      }))
    }

    // INVITES SYSTEM

    // Create invite
    if (route.match(/^\/houses\/[^\/]+\/invites$/) && method === 'POST') {
      const houseId = route.split('/')[2]
      const tokenData = verifyToken(request)
      
      const { expiresInDays = 7, maxUses = 1 } = await request.json()
      
      const house = await houseRepo.getById(houseId)
      if (!house) {
        return handleCORS(NextResponse.json(
          { error: "House not found" }, 
          { status: 404 }
        ))
      }

      // Only owner can create invites for now
      if (house.ownerId !== tokenData.userId) {
        return handleCORS(NextResponse.json(
          { error: "Only house owner can create invites" }, 
          { status: 403 }
        ))
      }

      const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      
      const invite = await inviteRepo.create({
        houseId,
        createdBy: tokenData.userId,
        expiresAt,
        maxUses: Math.min(maxUses, 10) // Cap at 10 uses
      })

      return handleCORS(NextResponse.json({
        code: invite.code,
        expiresAt: invite.expiresAt,
        maxUses: invite.maxUses
      }))
    }

    // Accept invite
    if (route.match(/^\/invites\/[^\/]+\/accept$/) && method === 'POST') {
      const code = route.split('/')[2]
      const tokenData = verifyToken(request)
      
      const invite = await inviteRepo.getByCode(code)
      if (!invite) {
        return handleCORS(NextResponse.json(
          { error: "Invalid or expired invite" }, 
          { status: 400 }
        ))
      }

      const success = await inviteRepo.accept(code, tokenData.userId)
      if (!success) {
        return handleCORS(NextResponse.json(
          { error: "Cannot accept invite" }, 
          { status: 400 }
        ))
      }

      // Add user to house
      await houseRepo.addMember(invite.houseId, tokenData.userId)
      
      const house = await houseRepo.getById(invite.houseId)
      
      return handleCORS(NextResponse.json({
        message: "Invite accepted",
        house: { id: house.id, name: house.name }
      }))
    }

    // FIND ROOMMATES (replaces Find Collabs)

    // Get roommate search list
    if (route === '/roommates' && method === 'GET') {
      const url = new URL(request.url)
      const filters = {
        platforms: url.searchParams.get('platforms')?.split(','),
        niches: url.searchParams.get('niches')?.split(','), 
        region: url.searchParams.get('region')
      }

      const users = await userRepo.listForRoommateSearch(filters)
      
      // Remove sensitive data
      const safeUsers = users.map(user => ({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        platforms: user.platforms,
        niches: user.niches,
        city: user.city,
        timeZone: user.timeZone
      }))

      return handleCORS(NextResponse.json(safeUsers))
    }

    // USER PROFILES

    // Get user profile
    if (route.startsWith('/users/') && !route.includes('/avatar') && method === 'GET') {
      const username = route.split('/')[2]
      
      const user = await userRepo.getByUsername(username)
      if (!user) {
        return handleCORS(NextResponse.json(
          { error: "User not found" }, 
          { status: 404 }
        ))
      }

      // Get user's posts
      const house = await houseRepo.getByUserId(user.id)
      let posts = []
      if (house) {
        posts = await postRepo.listByHouse(house.id)
        posts = posts.filter(post => post.ownerUserId === user.id)
        
        // Add clip counts
        for (let post of posts) {
          const clips = await clipRepo.listByPost(post.id)
          post.clipCount = clips.length
        }
      }

      // Get clips made by user
      const clips = await clipRepo.listByCreator(user.id)
      
      // Add original post info to clips
      for (let clip of clips) {
        const originalPost = await postRepo.getById(clip.postId)
        if (originalPost) {
          clip.originalPost = {
            title: originalPost.title,
            thumbnailUrl: originalPost.thumbnailUrl,
            provider: originalPost.provider
          }
        }
      }

      // Get points breakdown
      const pointsBreakdown = await engagementRepo.getBreakdown(user.id)

      const { passwordHash, email, ...safeUser } = user

      return handleCORS(NextResponse.json({
        user: safeUser,
        posts,
        clipsMade: clips,
        pointsBreakdown
      }))
    }

    // AVATAR SYSTEM

    // Upload avatar
    if (route === '/users/me/avatar' && method === 'POST') {
      const tokenData = verifyToken(request)
      
      // For now, return mock success since we don't have actual file upload
      // In production, this would process multipart form data
      
      const mockAvatarUrl = `/api/avatars/${tokenData.userId}.jpg`
      await userRepo.setAvatar(tokenData.userId, mockAvatarUrl)
      
      return handleCORS(NextResponse.json({
        message: "Avatar uploaded successfully",
        avatarUrl: mockAvatarUrl
      }))
    }

    // Delete avatar
    if (route === '/users/me/avatar' && method === 'DELETE') {
      const tokenData = verifyToken(request)
      
      await userRepo.deleteAvatar(tokenData.userId)
      
      return handleCORS(NextResponse.json({
        message: "Avatar deleted successfully"
      }))
    }

    // Update roommate search visibility
    if (route === '/users/me/roommate-visibility' && method === 'POST') {
      const tokenData = verifyToken(request)
      const { visible } = await request.json()
      
      await userRepo.updateRoommateSearchVisibility(tokenData.userId, Boolean(visible))
      
      return handleCORS(NextResponse.json({
        message: "Roommate search visibility updated"
      }))
    }

    // BUG REPORT SYSTEM

    // Submit bug report
    if (route === '/help/report' && method === 'POST') {
      const tokenData = verifyToken(request)
      
      const { category, title, description, url: contextUrl, screenshot } = await request.json()
      
      if (!category || !title || !description) {
        return handleCORS(NextResponse.json(
          { error: "Category, title, and description are required" }, 
          { status: 400 }
        ))
      }

      if (!['Bug', 'Idea', 'Abuse'].includes(category)) {
        return handleCORS(NextResponse.json(
          { error: "Invalid category" }, 
          { status: 400 }
        ))
      }

      const report = await bugReportRepo.create({
        userId: tokenData.userId,
        category,
        title: sanitizeText(title),
        description: sanitizeText(description),
        contextUrl: contextUrl || null,
        screenshot: screenshot || null
      })

      return handleCORS(NextResponse.json({
        ticketId: report.ticketId,
        message: "Bug report submitted successfully"
      }))
    }

    // Get bug report
    if (route.startsWith('/help/report/') && method === 'GET') {
      const ticketId = route.split('/')[3]
      const tokenData = verifyToken(request)
      
      const report = await bugReportRepo.getById(ticketId)
      if (!report) {
        return handleCORS(NextResponse.json(
          { error: "Ticket not found" }, 
          { status: 404 }
        ))
      }

      // Only allow user to see their own reports
      if (report.userId !== tokenData.userId) {
        return handleCORS(NextResponse.json(
          { error: "Not authorized to view this ticket" }, 
          { status: 403 }
        ))
      }

      return handleCORS(NextResponse.json(report))
    }

    // Legacy compatibility routes (keep existing squad routes working)
    if (route === '/squads' && method === 'POST') {
      // Redirect to houses
      return handleRoute(request, { params: { path: ['houses'] } })
    }

    if (route.startsWith('/squads/user/')) {
      // Redirect to houses/user
      const userId = route.split('/')[3]
      return handleRoute(request, { params: { path: ['houses', 'user', userId] } })
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