// In-Memory Repository Implementations for Streamer House
// Provides full functionality without database dependency

import { v4 as uuidv4 } from 'uuid'
import { 
  UserRepo, 
  HouseRepo, 
  PostRepo, 
  VoteRepo, 
  InviteRepo, 
  BugReportRepo, 
  MediaRepo,
  EngagementRepo,
  ClipRepo
} from '../interfaces.js'

// In-memory storage
const storage = {
  users: new Map(),
  houses: new Map(),
  posts: new Map(),
  votes: new Map(),
  invites: new Map(),
  bugReports: new Map(),
  media: new Map(),
  engagements: new Map(),
  clips: new Map(),
  houseMembers: new Map(), // houseId -> Set of userIds
  postCollaborators: new Map(), // postId -> Set of userIds
}

export class MemoryUserRepo extends UserRepo {
  async getById(id) {
    return storage.users.get(id) || null
  }

  async getByUsername(username) {
    for (const user of storage.users.values()) {
      if (user.username === username) return user
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
      roommateSearchVisible: false
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

  async listForRoommateSearch(filters = {}) {
    const users = Array.from(storage.users.values())
      .filter(user => user.roommateSearchVisible)
    
    // Apply filters
    let filtered = users
    
    if (filters.platforms && filters.platforms.length > 0) {
      filtered = filtered.filter(user => 
        user.platforms && user.platforms.some(p => filters.platforms.includes(p))
      )
    }
    
    if (filters.niches && filters.niches.length > 0) {
      filtered = filtered.filter(user => 
        user.niches && user.niches.some(n => filters.niches.includes(n))
      )
    }
    
    if (filters.region) {
      filtered = filtered.filter(user => 
        user.city && user.city.toLowerCase().includes(filters.region.toLowerCase())
      )
    }
    
    if (filters.timezone) {
      filtered = filtered.filter(user => 
        user.timeZone && user.timeZone.includes(filters.timezone)
      )
    }
    
    return filtered
  }
    
    if (filters.region) {
      filtered = filtered.filter(user => 
        user.city && user.city.toLowerCase().includes(filters.region.toLowerCase())
      )
    }
    
    return filtered
  }

  async updateRoommateSearchVisibility(id, visible) {
    return this.update(id, { roommateSearchVisible: visible })
  }
}

export class MemoryHouseRepo extends HouseRepo {
  async getById(id) {
    return storage.houses.get(id) || null
  }

  async create(houseData) {
    const house = {
      id: uuidv4(),
      ...houseData,
      createdAt: new Date(),
      archived: false
    }
    storage.houses.set(house.id, house)
    
    // Add owner as member
    if (!storage.houseMembers.has(house.id)) {
      storage.houseMembers.set(house.id, new Set())
    }
    storage.houseMembers.get(house.id).add(houseData.ownerId)
    
    return house
  }

  async listMembers(houseId) {
    const memberIds = storage.houseMembers.get(houseId) || new Set()
    const members = []
    
    for (const userId of memberIds) {
      const user = storage.users.get(userId)
      if (user) members.push(user)
    }
    
    return members
  }

  async addMember(houseId, userId) {
    if (!storage.houseMembers.has(houseId)) {
      storage.houseMembers.set(houseId, new Set())
    }
    storage.houseMembers.get(houseId).add(userId)
    
    // Update house member count
    const house = storage.houses.get(houseId)
    if (house) {
      house.memberCount = storage.houseMembers.get(houseId).size
      storage.houses.set(houseId, house)
    }
    
    return true
  }

  async removeMember(houseId, userId) {
    if (storage.houseMembers.has(houseId)) {
      storage.houseMembers.get(houseId).delete(userId)
      
      // Update house member count
      const house = storage.houses.get(houseId)
      if (house) {
        house.memberCount = storage.houseMembers.get(houseId).size
        storage.houses.set(houseId, house)
      }
    }
    return true
  }

  async transferOwner(houseId, newOwnerId) {
    const house = storage.houses.get(houseId)
    if (!house) return false
    
    house.ownerId = newOwnerId
    storage.houses.set(houseId, house)
    return true
  }

  async leave(houseId, userId) {
    const house = storage.houses.get(houseId)
    if (!house) return false
    
    // Remove from members
    await this.removeMember(houseId, userId)
    
    // Handle ownership transfer if owner is leaving
    if (house.ownerId === userId) {
      const members = await this.listMembers(houseId)
      const remainingMembers = members.filter(m => m.id !== userId)
      
      if (remainingMembers.length > 0) {
        // Transfer to longest-tenured member
        const newOwner = remainingMembers[0] // Simplified: first member
        await this.transferOwner(houseId, newOwner.id)
      } else {
        // Last member leaving, archive house
        await this.archive(houseId)
      }
    }
    
    return true
  }

  async archive(houseId) {
    const house = storage.houses.get(houseId)
    if (!house) return false
    
    house.archived = true
    storage.houses.set(houseId, house)
    return true
  }

  async getByUserId(userId) {
    for (const [houseId, memberIds] of storage.houseMembers.entries()) {
      if (memberIds.has(userId)) {
        return storage.houses.get(houseId)
      }
    }
    return null
  }

  async listOwnedByUser(userId) {
    const houses = []
    for (const house of storage.houses.values()) {
      if (house.ownerId === userId) {
        houses.push(house)
      }
    }
    return houses
  }

  async isMember(houseId, userId) {
    const memberIds = storage.houseMembers.get(houseId)
    return memberIds ? memberIds.has(userId) : false
  }
}

export class MemoryPostRepo extends PostRepo {
  async create(postData) {
    const post = {
      id: uuidv4(),
      ...postData,
      createdAt: new Date(),
      deleted: false,
      isCollaboration: false
    }
    storage.posts.set(post.id, post)
    return post
  }

  async getById(id) {
    const post = storage.posts.get(id)
    return (post && !post.deleted) ? post : null
  }

  async listByHouse(houseId, options = {}) {
    const posts = Array.from(storage.posts.values())
      .filter(post => post.houseId === houseId && !post.deleted)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    if (options.limit) {
      return posts.slice(0, options.limit)
    }
    
    return posts
  }

  async update(id, updates) {
    const post = storage.posts.get(id)
    if (!post || post.deleted) return null
    
    const updated = { ...post, ...updates }
    storage.posts.set(id, updated)
    return updated
  }

  async delete(id, userId) {
    const post = storage.posts.get(id)
    if (!post || post.deleted) return false
    
    // Check if user is owner
    if (post.ownerUserId !== userId) return false
    
    post.deleted = true
    storage.posts.set(id, post)
    return true
  }

  async addCollaborators(postId, collaboratorIds) {
    if (!storage.postCollaborators.has(postId)) {
      storage.postCollaborators.set(postId, new Set())
    }
    
    const collaborators = storage.postCollaborators.get(postId)
    collaboratorIds.forEach(id => collaborators.add(id))
    
    // Mark post as collaboration
    const post = storage.posts.get(postId)
    if (post) {
      post.isCollaboration = true
      storage.posts.set(postId, post)
    }
    
    return true
  }

  async isOwner(postId, userId) {
    const post = storage.posts.get(postId)
    return post && post.ownerUserId === userId
  }
}

export class MemoryVoteRepo extends VoteRepo {
  async createKickProposal(houseId, targetUserId, initiatorId, reason) {
    const proposal = {
      id: uuidv4(),
      houseId,
      targetUserId,
      initiatorId,
      reason: reason || '',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
      votes: new Map(), // voterId -> 'yes'|'no'
      status: 'active', // active, passed, failed, expired
      executed: false
    }
    storage.votes.set(proposal.id, proposal)
    return proposal
  }

  async vote(proposalId, voterId, vote) {
    const proposal = storage.votes.get(proposalId)
    if (!proposal || proposal.status !== 'active') return false
    
    // Check if voter can vote (not the target)
    if (voterId === proposal.targetUserId) return false
    
    proposal.votes.set(voterId, vote)
    storage.votes.set(proposalId, proposal)
    return true
  }

  async getProposal(proposalId) {
    return storage.votes.get(proposalId) || null
  }

  async listActiveProposals(houseId) {
    return Array.from(storage.votes.values())
      .filter(proposal => proposal.houseId === houseId && proposal.status === 'active')
  }

  async tally(proposalId) {
    const proposal = storage.votes.get(proposalId)
    if (!proposal) return null
    
    const votes = Array.from(proposal.votes.values())
    const yesVotes = votes.filter(v => v === 'yes').length
    const noVotes = votes.filter(v => v === 'no').length
    const totalVotes = votes.length
    
    return {
      yesVotes,
      noVotes,
      totalVotes,
      majority: totalVotes > 0 && yesVotes > noVotes
    }
  }

  async executeKick(proposalId) {
    const proposal = storage.votes.get(proposalId)
    if (!proposal || proposal.executed) return false
    
    const tally = await this.tally(proposalId)
    
    if (tally.majority) {
      proposal.status = 'passed'
      proposal.executed = true
      
      // Remove user from house
      if (storage.houseMembers.has(proposal.houseId)) {
        storage.houseMembers.get(proposal.houseId).delete(proposal.targetUserId)
      }
    } else {
      proposal.status = 'failed'
    }
    
    storage.votes.set(proposalId, proposal)
    return tally.majority
  }

  async canVote(proposalId, userId) {
    const proposal = storage.votes.get(proposalId)
    if (!proposal || proposal.status !== 'active') return false
    
    // Cannot vote if you're the target
    if (userId === proposal.targetUserId) return false
    
    // Must be a house member
    const memberIds = storage.houseMembers.get(proposal.houseId)
    return memberIds ? memberIds.has(userId) : false
  }
}

export class MemoryInviteRepo extends InviteRepo {
  async create(inviteData) {
    const invite = {
      id: uuidv4(),
      code: uuidv4().replace(/-/g, '').substring(0, 12),
      ...inviteData,
      createdAt: new Date(),
      usesCount: 0,
      active: true
    }
    storage.invites.set(invite.id, invite)
    return invite
  }

  async getByCode(code) {
    for (const invite of storage.invites.values()) {
      if (invite.code === code && invite.active) {
        // Check expiry
        if (invite.expiresAt && new Date() > invite.expiresAt) {
          invite.active = false
          storage.invites.set(invite.id, invite)
          return null
        }
        return invite
      }
    }
    return null
  }

  async accept(code, userId) {
    const invite = await this.getByCode(code)
    if (!invite) return false
    
    // Check max uses
    if (invite.maxUses && invite.usesCount >= invite.maxUses) {
      return false
    }
    
    // Increment use count
    invite.usesCount++
    
    // Deactivate if max uses reached
    if (invite.maxUses && invite.usesCount >= invite.maxUses) {
      invite.active = false
    }
    
    storage.invites.set(invite.id, invite)
    return true
  }

  async invalidate(inviteId) {
    const invite = storage.invites.get(inviteId)
    if (!invite) return false
    
    invite.active = false
    storage.invites.set(inviteId, invite)
    return true
  }

  async listByHouse(houseId) {
    return Array.from(storage.invites.values())
      .filter(invite => invite.houseId === houseId && invite.active)
  }

  async incrementUse(inviteId) {
    const invite = storage.invites.get(inviteId)
    if (!invite) return false
    
    invite.usesCount++
    storage.invites.set(inviteId, invite)
    return true
  }
}

export class MemoryBugReportRepo extends BugReportRepo {
  async create(reportData) {
    const report = {
      id: uuidv4(),
      ticketId: `SH-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ...reportData,
      createdAt: new Date(),
      status: 'open'
    }
    storage.bugReports.set(report.id, report)
    return report
  }

  async getById(ticketId) {
    for (const report of storage.bugReports.values()) {
      if (report.ticketId === ticketId) return report
    }
    return null
  }

  async listByUser(userId) {
    return Array.from(storage.bugReports.values())
      .filter(report => report.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  async updateStatus(ticketId, status) {
    for (const [id, report] of storage.bugReports.entries()) {
      if (report.ticketId === ticketId) {
        report.status = status
        storage.bugReports.set(id, report)
        return true
      }
    }
    return false
  }
}

export class MemoryMediaRepo extends MediaRepo {
  async saveImage(file, options = {}) {
    const media = {
      id: uuidv4(),
      filename: file.name || 'upload.jpg',
      mimeType: file.type || 'image/jpeg',
      size: file.size || 0,
      // In production, this would be S3 URL. For in-memory, use data URL
      url: options.dataUrl || `/api/media/${uuidv4()}.jpg`,
      createdAt: new Date()
    }
    storage.media.set(media.id, media)
    return media
  }

  async deleteImage(id) {
    return storage.media.delete(id)
  }

  async getImageUrl(id) {
    const media = storage.media.get(id)
    return media ? media.url : null
  }
}

export class MemoryEngagementRepo extends EngagementRepo {
  async create(engagementData) {
    const engagement = {
      id: uuidv4(),
      ...engagementData,
      createdAt: new Date()
    }
    storage.engagements.set(engagement.id, engagement)
    return engagement
  }

  async checkDedup(userId, postId, type, windowHours = 24) {
    const windowStart = new Date(Date.now() - windowHours * 60 * 60 * 1000)
    
    for (const engagement of storage.engagements.values()) {
      if (engagement.userId === userId && 
          engagement.postId === postId && 
          engagement.type === type &&
          new Date(engagement.createdAt) > windowStart) {
        return false // Found recent engagement
      }
    }
    return true // No recent engagement found
  }

  async getByUser(userId) {
    return Array.from(storage.engagements.values())
      .filter(engagement => engagement.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  async getBreakdown(userId) {
    const engagements = await this.getByUser(userId)
    const breakdown = {}
    
    for (const engagement of engagements) {
      if (!breakdown[engagement.type]) {
        breakdown[engagement.type] = { total: 0, count: 0 }
      }
      breakdown[engagement.type].total += engagement.points
      breakdown[engagement.type].count += 1
    }
    
    return breakdown
  }
}

export class MemoryClipRepo extends ClipRepo {
  async create(clipData) {
    const clip = {
      id: uuidv4(),
      ...clipData,
      createdAt: new Date()
    }
    storage.clips.set(clip.id, clip)
    return clip
  }

  async getById(id) {
    return storage.clips.get(id) || null
  }

  async listByPost(postId) {
    return Array.from(storage.clips.values())
      .filter(clip => clip.postId === postId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  async listByCreator(creatorId) {
    return Array.from(storage.clips.values())
      .filter(clip => clip.creatorUserId === creatorId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  async delete(id, userId) {
    const clip = storage.clips.get(id)
    if (!clip || clip.creatorUserId !== userId) return false
    
    return storage.clips.delete(id)
  }
}

// Export repository instances
export const userRepo = new MemoryUserRepo()
export const houseRepo = new MemoryHouseRepo()
export const postRepo = new MemoryPostRepo()
export const voteRepo = new MemoryVoteRepo()
export const inviteRepo = new MemoryInviteRepo()
export const bugReportRepo = new MemoryBugReportRepo()
export const mediaRepo = new MemoryMediaRepo()
export const engagementRepo = new MemoryEngagementRepo()
export const clipRepo = new MemoryClipRepo()