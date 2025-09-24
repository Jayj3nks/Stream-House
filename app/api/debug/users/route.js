import { NextResponse } from 'next/server'
import { userRepo } from '../../../../lib/repositories/memory/index.js'

export async function GET() {
  try {
    // Get all users from the storage (for debugging)
    const storage = userRepo.constructor.prototype.constructor.storage || {}
    const users = []
    
    // Try to access users through the repo
    for (let i = 0; i < 10; i++) {
      try {
        const user = await userRepo.getById(`test-${i}`)
        if (user) users.push(user)
      } catch (e) {
        // ignore
      }
    }
    
    // Also try to get the storage directly if possible
    let storageInfo = 'Unable to access storage directly'
    try {
      // Access the private storage through the repository
      const repo = userRepo
      if (repo && repo.constructor && repo.constructor.storage) {
        storageInfo = `Storage has ${repo.constructor.storage.users?.size || 0} users`
      }
    } catch (e) {
      storageInfo = `Storage access error: ${e.message}`
    }
    
    return NextResponse.json({
      message: "Debug endpoint for user repository",
      userCount: users.length,
      storageInfo,
      users: users.slice(0, 5) // Only show first 5 for privacy
    })
    
  } catch (error) {
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}