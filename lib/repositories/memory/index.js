// In-Memory Repository Implementation for Streamer House
// Matches Postgres DDL schema structure

import { v4 as uuidv4 } from 'uuid'

// In-memory storage (simulates database tables)
const storage = {
  users: new Map(),           // User table
  houses: new Map(),          // House table
  houseMembers: new Map(),    // HouseMember table
  posts: new Map(),           // Post table
  postCollaborators: new Map(),// PostCollaborator table
  clips: new Map(),           // Clip table
  engagements: new Map(),     // Engagement table
  votes: new Map(),           // Vote table (for kick votes)
  invites: new Map(),         // Invite table
  bugReports: new Map(),      // BugReport table
  media: new Map()            // Media table
}

// Repository Interfaces (placeholder)
export class UserRepo {}
export class HouseRepo {}
export class PostRepo {}
export class VoteRepo {}
export class InviteRepo {}
export class BugReportRepo {}
export class MediaRepo {}

// USER REPOSITORY (matches User table schema)
export class MemoryUserRepo extends UserRepo {
  async getById(id) {
    return storage.users.get(id) || null
  }

  async getByUsername(username) {
    // Case-insensitive username lookup to prevent 404s
    const lowerUsername = username.toLowerCase()
    for (const user of storage.users.values()) {
      if (user.username.toLowerCase() === lowerUsername) return user
    }
    return null
  }

  async getByEmail(email) {
    for (const user of storage.users.values()) {
      if (user.email === email) return user
    }
    return null
  }

  async create(userData) {
    const user = {
      id: uuidv4(),
      ...userData,
      createdAt: new Date(),
      avatarUrl: null,
      totalPoints: 0,
      // Roommate fields (matching schema)
      roommateOptIn: false,
      roommatePlatforms: [],
      roommateNiche: null,
      roommateTimezone: null,
      roommateRegion: null,
      roommateExperience: null
    }
    storage.users.set(user.id, user)
    return user
  }

  async update(id, updates) {
    const user = storage.users.get(id)
    if (!user) return null
    
    const updated = { ...user, ...updates }
    storage.users.set(id, updated)
    return updated
  }

  async updateProfile(id, profileData) {
    return this.update(id, profileData)
  }

  async setAvatar(id, avatarUrl) {
    return this.update(id, { avatarUrl })
  }

  async deleteAvatar(id) {
    return this.update(id, { avatarUrl: null })
  }

  async addPoints(id, points) {
    const user = storage.users.get(id)
    if (!user) return null
    
    const updated = { ...user, totalPoints: (user.totalPoints || 0) + points }
    storage.users.set(id, updated)
    return updated
  }

  // Roommate search with filters
  async listForRoommateSearch(filters = {}) {
    const users = Array.from(storage.users.values())
      .filter(user => user.roommateOptIn === true)
    
    let filtered = users
    
    // Search query filter
    if (filters.q) {
      const query = filters.q.toLowerCase()
      filtered = filtered.filter(user => 
        user.username.toLowerCase().includes(query)
      )
    }
    
    // Platform filter
    if (filters.platforms && filters.platforms.length > 0) {
      filtered = filtered.filter(user => 
        user.roommatePlatforms && user.roommatePlatforms.some(p => filters.platforms.includes(p))
      )
    }
    
    // Niche filter
    if (filters.niche) {
      filtered = filtered.filter(user => 
        user.roommateNiche === filters.niche
      )
    }
    
    // Timezone filter
    if (filters.timezone) {
      filtered = filtered.filter(user => 
        user.roommateTimezone === filters.timezone
      )
    }
    
    // Region filter
    if (filters.region) {
      filtered = filtered.filter(user => 
        user.roommateRegion === filters.region
      )
    }
    
    // Experience filter
    if (filters.experience) {
      filtered = filtered.filter(user => 
        user.roommateExperience === filters.experience
      )
    }
    
    return filtered
  }

  async updateRoommateSettings(id, settings) {
    return this.update(id, {
      roommateOptIn: Boolean(settings.optIn),
      roommatePlatforms: settings.platforms || [],
      roommateNiche: settings.niche || null,
      roommateTimezone: settings.timezone || null,  
      roommateRegion: settings.region || null,
      roommateExperience: settings.experience || null
    })
  }
}

// HOUSE REPOSITORY (matches House + HouseMember tables)
export class MemoryHouseRepo extends HouseRepo {
  async getById(id) {
    return storage.houses.get(id) || null
  }

  async create(houseData) {
    const house = {
      id: uuidv4(),
      ...houseData,
      createdAt: new Date(),
      avatarUrl: null,
      bannerUrl: null
    }
    storage.houses.set(house.id, house)
    
    // Automatically add creator as owner member
    await this.addMember(house.id, houseData.ownerUserId, 'owner')
    
    return house
  }

  async update(id, updates) {
    const house = storage.houses.get(id)
    if (!house) return null
    
    const updated = { ...house, ...updates }
    storage.houses.set(id, updated)
    return updated
  }

  async delete(id) {
    // Remove all house members
    for (const [memberId, member] of storage.houseMembers.entries()) {
      if (member.houseId === id) {
        storage.houseMembers.delete(memberId)
      }
    }
    return storage.houses.delete(id)
  }

  // House membership methods
  async addMember(houseId, userId, role = 'member') {
    const memberId = uuidv4()
    const member = {
      id: memberId,
      houseId,
      userId,
      role,
      joinedAt: new Date()
    }
    storage.houseMembers.set(memberId, member)
    return member
  }

  async removeMember(houseId, userId) {
    for (const [memberId, member] of storage.houseMembers.entries()) {
      if (member.houseId === houseId && member.userId === userId) {
        storage.houseMembers.delete(memberId)
        return true
      }
    }
    return false
  }

  async isMember(houseId, userId) {
    for (const member of storage.houseMembers.values()) {
      if (member.houseId === houseId && member.userId === userId) {
        return true
      }
    }
    return false
  }

  async getMemberRole(houseId, userId) {
    for (const member of storage.houseMembers.values()) {
      if (member.houseId === houseId && member.userId === userId) {
        return member.role
      }
    }
    return null
  }

  async getMembers(houseId) {
    const members = []
    for (const member of storage.houseMembers.values()) {
      if (member.houseId === houseId) {
        const user = storage.users.get(member.userId)
        if (user) {
          members.push({
            ...member,
            user: {
              id: user.id,
              username: user.username,
              avatarUrl: user.avatarUrl
            }
          })
        }
      }
    }
    return members
  }

  async getMemberCount(houseId) {
    let count = 0
    for (const member of storage.houseMembers.values()) {
      if (member.houseId === houseId) count++
    }
    return count
  }

  // Get houses where user is a member (for "My Houses" switcher)
  async listByUserId(userId) {
    const userHouses = []
    
    for (const member of storage.houseMembers.values()) {
      if (member.userId === userId) {
        const house = storage.houses.get(member.houseId)
        if (house) {
          const memberCount = await this.getMemberCount(house.id)
          userHouses.push({
            ...house,
            role: member.role,
            memberCount,
            joinedAt: member.joinedAt
          })
        }
      }
    }
    
    // Sort by most recently joined
    return userHouses.sort((a, b) => new Date(b.joinedAt) - new Date(a.joinedAt))
  }

  async listOwnedByUser(userId) {
    const ownedHouses = []
    for (const house of storage.houses.values()) {
      if (house.ownerUserId === userId) {
        ownedHouses.push(house)
      }
    }
    return ownedHouses
  }

  async getSummary(houseId) {
    const house = await this.getById(houseId)
    if (!house) return null
    
    const memberCount = await this.getMemberCount(houseId)
    
    // Count active posts (24h)
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    let activePosts24h = 0
    let clips24h = 0
    
    for (const post of storage.posts.values()) {
      if (post.houseId === houseId && !post.isDeleted && new Date(post.createdAt) >= dayAgo) {
        activePosts24h++
      }
    }
    
    for (const clip of storage.clips.values()) {
      if (new Date(clip.createdAt) >= dayAgo) {
        const post = storage.posts.get(clip.postId)
        if (post && post.houseId === houseId) {
          clips24h++
        }
      }
    }
    
    // Get recent posts
    const recentPosts = []
    for (const post of storage.posts.values()) {
      if (post.houseId === houseId && !post.isDeleted) {
        recentPosts.push(post)
      }
    }
    recentPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    return {
      house: {
        houseId: house.id,
        name: house.name,
        avatarUrl: house.avatarUrl
      },
      counts: {
        members: memberCount,
        activePosts24h,
        clips24h
      },
      recentPosts: recentPosts.slice(0, 5).map(post => ({
        id: post.id,
        title: post.title,
        thumbnailUrl: post.thumbnailUrl,
        createdAt: post.createdAt
      })),
      canPost: true
    }
  }
}

// POST REPOSITORY (matches Post table)
export class MemoryPostRepo extends PostRepo {
  async getById(id) {
    return storage.posts.get(id) || null
  }

  async create(postData) {
    const post = {
      id: uuidv4(),
      ...postData,
      createdAt: new Date(),
      isDeleted: false
    }
    storage.posts.set(post.id, post)
    return post
  }

  async update(id, updates) {
    const post = storage.posts.get(id)
    if (!post) return null
    
    const updated = { ...post, ...updates }
    storage.posts.set(id, updated)
    return updated
  }

  async delete(id) {
    return this.update(id, { isDeleted: true })
  }

  async listByHouse(houseId, options = {}) {
    const { ttlHours = 24, includeDeleted = false } = options
    const posts = []
    const now = new Date()
    const cutoff = new Date(now.getTime() - ttlHours * 60 * 60 * 1000)
    
    for (const post of storage.posts.values()) {
      if (post.houseId === houseId) {
        if (!includeDeleted && post.isDeleted) continue
        if (new Date(post.createdAt) < cutoff) continue
        posts.push(post)
      }
    }
    
    return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  async listByUser(userId, options = {}) {
    const { ttlDays = 7, includeDeleted = false, page = 1, pageSize = 12 } = options
    const posts = []
    const now = new Date()
    const cutoff = new Date(now.getTime() - ttlDays * 24 * 60 * 60 * 1000)
    
    for (const post of storage.posts.values()) {
      if (post.ownerUserId === userId) {
        if (!includeDeleted && post.isDeleted) continue
        if (new Date(post.createdAt) < cutoff) continue
        posts.push(post)
      }
    }
    
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedPosts = posts.slice(startIndex, endIndex)
    
    return {
      items: paginatedPosts,
      page,
      pageSize,
      total: posts.length
    }
  }
}

// CLIP REPOSITORY
export class MemoryClipRepo {
  async create(clipData) {
    const clip = {
      id: uuidv4(),
      ...clipData,
      createdAt: new Date()
    }
    storage.clips.set(clip.id, clip)
    return clip
  }

  async listByPost(postId) {
    const clips = []
    for (const clip of storage.clips.values()) {
      if (clip.postId === postId) {
        clips.push(clip)
      }
    }
    return clips.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  async listByCreator(userId, options = {}) {
    const { page = 1, pageSize = 12 } = options
    const clips = []
    
    for (const clip of storage.clips.values()) {
      if (clip.creatorUserId === userId) {
        clips.push(clip)
      }
    }
    
    clips.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedClips = clips.slice(startIndex, endIndex)
    
    return {
      items: paginatedClips,
      page,
      pageSize,
      total: clips.length
    }
  }

  async getById(id) {
    return storage.clips.get(id) || null
  }
}

// ENGAGEMENT REPOSITORY
export class MemoryEngagementRepo {
  async create(engagementData) {
    const engagement = {
      id: uuidv4(),
      ...engagementData,
      createdAt: new Date()
    }
    storage.engagements.set(engagement.id, engagement)
    return engagement
  }

  async listByUser(userId) {
    return Array.from(storage.engagements.values())
      .filter(e => e.userId === userId)
  }

  async listByUserAndPost(userId, postId) {
    return Array.from(storage.engagements.values())
      .filter(e => e.userId === userId && e.postId === postId)
  }

  async listByUserAndCanonical(userId, canonicalUrl) {
    return Array.from(storage.engagements.values())
      .filter(e => e.userId === userId && e.canonicalUrl === canonicalUrl)
  }

  async getPointsBreakdown(userId) {
    const engagements = await this.listByUser(userId)
    const breakdown = {}
    
    for (const engagement of engagements) {
      if (!breakdown[engagement.type]) {
        breakdown[engagement.type] = { count: 0, total: 0 }
      }
      breakdown[engagement.type].count++
      breakdown[engagement.type].total += engagement.points
    }
    
    return breakdown
  }

  async getById(id) {
    return storage.engagements.get(id) || null
  }
}

// OTHER REPOSITORIES (simplified implementations)
export class MemoryVoteRepo extends VoteRepo {
  async create(voteData) {
    const vote = {
      id: uuidv4(),
      ...voteData,
      createdAt: new Date()
    }
    storage.votes.set(vote.id, vote)
    return vote
  }

  async getById(id) {
    return storage.votes.get(id) || null
  }
}

export class MemoryInviteRepo extends InviteRepo {
  async create(inviteData) {
    const invite = {
      id: uuidv4(),
      ...inviteData,
      createdAt: new Date()
    }
    storage.invites.set(invite.id, invite)
    return invite
  }

  async getById(id) {
    return storage.invites.get(id) || null
  }
}

export class MemoryBugReportRepo extends BugReportRepo {
  async create(reportData) {
    const report = {
      id: uuidv4(),
      ticketId: `SR-${Date.now()}`,
      ...reportData,
      createdAt: new Date()
    }
    storage.bugReports.set(report.id, report)
    return report
  }

  async getById(id) {
    return storage.bugReports.get(id) || null
  }
}

export class MemoryMediaRepo extends MediaRepo {
  async create(mediaData) {
    const media = {
      id: uuidv4(),
      ...mediaData,
      createdAt: new Date()
    }
    storage.media.set(media.id, media)
    return media
  }

  async getById(id) {
    return storage.media.get(id) || null
  }
}

// Export repository instances
export const userRepo = new MemoryUserRepo()
export const houseRepo = new MemoryHouseRepo()
export const postRepo = new MemoryPostRepo()
export const clipRepo = new MemoryClipRepo()
export const engagementRepo = new MemoryEngagementRepo()
export const voteRepo = new MemoryVoteRepo()
export const inviteRepo = new MemoryInviteRepo()
export const bugReportRepo = new MemoryBugReportRepo()
export const mediaRepo = new MemoryMediaRepo()