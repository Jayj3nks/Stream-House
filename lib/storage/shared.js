// Shared persistent storage for server actions and API routes
import fs from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_DIR = '/app/data/streamhouse'
const USERS_FILE = path.join(STORAGE_DIR, 'users.json')

// Ensure storage directory exists
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true })
}

// Initialize users file if it doesn't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, '{}')
}

class SharedStorage {
  readUsers() {
    try {
      const data = fs.readFileSync(USERS_FILE, 'utf8')
      return JSON.parse(data)
    } catch (error) {
      console.error('Error reading users:', error)
      return {}
    }
  }

  writeUsers(users) {
    try {
      fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2))
      return true
    } catch (error) {
      console.error('Error writing users:', error)
      return false
    }
  }

  createUser(userData) {
    const users = this.readUsers()
    const user = {
      id: uuidv4(),
      ...userData,
      createdAt: new Date().toISOString(),
      avatarUrl: null,
      totalPoints: 0,
      roommateOptIn: true, // Default privacy setting ON
      roommatePlatforms: [],
      roommateNiche: null,
      roommateTimezone: null,
      roommateRegion: null,
      roommateExperience: null
    }
    
    users[user.id] = user
    
    if (this.writeUsers(users)) {
      return user
    }
    return null
  }

  getUserById(id) {
    const users = this.readUsers()
    return users[id] || null
  }

  getUserByEmail(email) {
    const users = this.readUsers()
    for (const user of Object.values(users)) {
      if (user.email === email) return user
    }
    return null
  }

  getUserByUsername(username) {
    const users = this.readUsers()
    const lowerUsername = username.toLowerCase()
    for (const user of Object.values(users)) {
      if (user.username.toLowerCase() === lowerUsername) return user
    }
    return null
  }

  updateUser(id, updates) {
    const users = this.readUsers()
    if (!users[id]) return null
    
    users[id] = { ...users[id], ...updates }
    
    if (this.writeUsers(users)) {
      return users[id]
    }
    return null
  }

  getAllUsers() {
    return Object.values(this.readUsers())
  }
}

export const sharedStorage = new SharedStorage()