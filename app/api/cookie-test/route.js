export const dynamic = "force-dynamic";

import { NextResponse } from 'next/server'

export async function GET(request) {
  console.log('Cookie test: All cookies:', request.cookies.getAll())
  console.log('Cookie test: access_token:', request.cookies.get("access_token")?.value)
  
  return NextResponse.json({
    allCookies: request.cookies.getAll(),
    accessToken: request.cookies.get("access_token")?.value,
    headers: Object.fromEntries(request.headers.entries())
  })
}

export async function POST(request) {
  console.log('Setting test cookie...')
  
  const response = NextResponse.json({ 
    message: "Test cookie set",
    timestamp: new Date().toISOString()
  })
  
  response.cookies.set("test_cookie", "test_value_123", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  })
  
  console.log('Test cookie set in response')
  
  return response
}