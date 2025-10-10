export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'
import { connectDB, getDb } from '../../../lib/mongodb.js'

export async function GET() {
  const startTime = Date.now()
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {},
    responseTime: 0
  }

  try {
    // Check environment variables
    const requiredEnvVars = ['MONGO_URL', 'DB_NAME', 'JWT_SECRET', 'NEXT_PUBLIC_BASE_URL']
    const missingEnvVars = requiredEnvVars.filter(key => !process.env[key])
    
    health.checks.environment = {
      status: missingEnvVars.length === 0 ? 'pass' : 'fail',
      requiredVars: requiredEnvVars,
      missing: missingEnvVars,
      message: missingEnvVars.length === 0 ? 'All required environment variables present' : `Missing: ${missingEnvVars.join(', ')}`
    }

    // Check MongoDB connection
    try {
      const client = await connectDB()
      const db = await getDb()
      
      // Test database operation
      await db.admin().ping()
      
      health.checks.mongodb = {
        status: 'pass',
        message: 'MongoDB connection successful',
        database: process.env.DB_NAME
      }
    } catch (mongoError) {
      console.error('Health check MongoDB error:', mongoError)
      health.checks.mongodb = {
        status: 'fail',
        message: 'MongoDB connection failed',
        error: mongoError.message
      }
      health.status = 'error'
    }

    // Check JWT secret
    health.checks.jwt = {
      status: process.env.JWT_SECRET ? 'pass' : 'fail',
      message: process.env.JWT_SECRET ? 'JWT secret configured' : 'JWT secret missing'
    }

    // Calculate response time
    health.responseTime = Date.now() - startTime

    // Determine overall status
    const hasFailures = Object.values(health.checks).some(check => check.status === 'fail')
    if (hasFailures && health.status === 'ok') {
      health.status = 'degraded'
    }

    const statusCode = health.status === 'ok' ? 200 : health.status === 'degraded' ? 207 : 503

    return NextResponse.json(health, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Health check error:', error)
    
    health.status = 'error'
    health.checks.general = {
      status: 'fail',
      message: 'Health check failed',
      error: error.message
    }
    health.responseTime = Date.now() - startTime

    return NextResponse.json(health, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache', 
        'Expires': '0'
      }
    })
  }
}