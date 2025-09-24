import { NextResponse } from 'next/server'

export async function POST() {
  const response = NextResponse.redirect('https://fixmyapp.preview.emergentagent.com/', 302)
  
  response.cookies.set("access_token", "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  })
  
  return response
}