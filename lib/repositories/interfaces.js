// Repository Interfaces for Streamer House
// Clean abstraction layer for data access

export class UserRepo {
  async getById(id) { throw new Error('Not implemented') }
  async getByUsername(username) { throw new Error('Not implemented') }
  async getByEmail(email) { throw new Error('Not implemented') }
  async create(userData) { throw new Error('Not implemented') }
  async update(id, updates) { throw new Error('Not implemented') }
  async updateProfile(id, profileData) { throw new Error('Not implemented') }
  async setAvatar(id, avatarUrl) { throw new Error('Not implemented') }
  async deleteAvatar(id) { throw new Error('Not implemented') }
  async listForRoommateSearch(filters) { throw new Error('Not implemented') }
  async updateRoommateSearchVisibility(id, visible) { throw new Error('Not implemented') }
  async addPoints(id, points) { throw new Error('Not implemented') }
}

export class HouseRepo {
  async getById(id) { throw new Error('Not implemented') }
  async create(houseData) { throw new Error('Not implemented') }
  async listMembers(houseId) { throw new Error('Not implemented') }
  async addMember(houseId, userId) { throw new Error('Not implemented') }
  async removeMember(houseId, userId) { throw new Error('Not implemented') }
  async transferOwner(houseId, newOwnerId) { throw new Error('Not implemented') }
  async leave(houseId, userId) { throw new Error('Not implemented') }
  async archive(houseId) { throw new Error('Not implemented') }
  async getByUserId(userId) { throw new Error('Not implemented') }
  async listOwnedByUser(userId) { throw new Error('Not implemented') }
  async isMember(houseId, userId) { throw new Error('Not implemented') }
}

export class PostRepo {
  async create(postData) { throw new Error('Not implemented') }
  async getById(id) { throw new Error('Not implemented') }
  async listByHouse(houseId, options) { throw new Error('Not implemented') }
  async update(id, updates) { throw new Error('Not implemented') }
  async delete(id, userId) { throw new Error('Not implemented') }
  async addCollaborators(postId, collaboratorIds) { throw new Error('Not implemented') }
  async isOwner(postId, userId) { throw new Error('Not implemented') }
}

export class VoteRepo {
  async createKickProposal(houseId, targetUserId, initiatorId, reason) { throw new Error('Not implemented') }
  async vote(proposalId, voterId, vote) { throw new Error('Not implemented') }
  async getProposal(proposalId) { throw new Error('Not implemented') }
  async listActiveProposals(houseId) { throw new Error('Not implemented') }
  async tally(proposalId) { throw new Error('Not implemented') }
  async executeKick(proposalId) { throw new Error('Not implemented') }
  async canVote(proposalId, userId) { throw new Error('Not implemented') }
}

export class InviteRepo {
  async create(inviteData) { throw new Error('Not implemented') }
  async getByCode(code) { throw new Error('Not implemented') }
  async accept(code, userId) { throw new Error('Not implemented') }
  async invalidate(inviteId) { throw new Error('Not implemented') }
  async listByHouse(houseId) { throw new Error('Not implemented') }
  async incrementUse(inviteId) { throw new Error('Not implemented') }
}

export class BugReportRepo {
  async create(reportData) { throw new Error('Not implemented') }
  async getById(ticketId) { throw new Error('Not implemented') }
  async listByUser(userId) { throw new Error('Not implemented') }
  async updateStatus(ticketId, status) { throw new Error('Not implemented') }
}

export class MediaRepo {
  async saveImage(file, options) { throw new Error('Not implemented') }
  async deleteImage(id) { throw new Error('Not implemented') }
  async getImageUrl(id) { throw new Error('Not implemented') }
}

export class EngagementRepo {
  async create(engagementData) { throw new Error('Not implemented') }
  async checkDedup(userId, postId, type, windowHours) { throw new Error('Not implemented') }
  async getByUser(userId) { throw new Error('Not implemented') }
  async listByUser(userId) { throw new Error('Not implemented') }
  async listByUserAndPost(userId, postId) { throw new Error('Not implemented') }
  async listByUserAndCanonical(userId, canonicalUrl) { throw new Error('Not implemented') }
  async getBreakdown(userId) { throw new Error('Not implemented') }
}

export class ClipRepo {
  async create(clipData) { throw new Error('Not implemented') }
  async getById(id) { throw new Error('Not implemented') }
  async listByPost(postId) { throw new Error('Not implemented') }
  async listByCreator(creatorId) { throw new Error('Not implemented') }
  async delete(id, userId) { throw new Error('Not implemented') }
}