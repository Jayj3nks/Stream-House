'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Home, Users, Zap } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  // Check if already authenticated
  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        // User is already authenticated, redirect to dashboard
        router.push('/dashboard')
        return
      }
    } catch (error) {
      console.log('Not authenticated, showing login')
    } finally {
      setChecking(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Welcome back!",
          description: "You have been logged in successfully."
        })
        
        // Wait briefly for cookie to be set, then redirect
        setTimeout(() => {
          router.push('/dashboard')
        }, 100)
      } else {
        toast({
          title: "Error",
          description: data.error || "Invalid credentials",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-purple-600 mb-4">
            Streamer House
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Join creator communities, collaborate, and grow together
          </p>
          
          <div className="flex justify-center space-x-8 mb-12">
            <div className="text-center">
              <Home className="w-12 h-12 text-purple-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-800">Join Houses</h3>
              <p className="text-sm text-gray-600">Connect with like-minded creators</p>
            </div>
            <div className="text-center">
              <Users className="w-12 h-12 text-blue-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-800">Find Roommates</h3>
              <p className="text-sm text-gray-600">Collaborate with local creators</p>
            </div>
            <div className="text-center">
              <Zap className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <h3 className="font-semibold text-gray-800">Boost Content</h3>
              <p className="text-sm text-gray-600">Support each other's posts</p>
            </div>
          </div>
        </div>

        {/* Login/Signup Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Login Card */}
          <Card>
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                Welcome back! Sign in to your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Signing In..." : "Sign In"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Signup Card */}
          <Card>
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>
                New to Streamer House? Join the community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Create your creator profile with platforms, niches, schedule, and more to find the perfect collaborators.
                </p>
                
                <Button asChild className="w-full">
                  <Link href="/signup">
                    Create Your Account
                  </Link>
                </Button>
                
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Join thousands of creators building together
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Features */}
        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-8">Why Creators Love Streamer House</h2>
          
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-purple-600 mb-2">Smart Matching</h3>
              <p className="text-sm text-gray-600">
                Get matched with creators based on your platforms, niches, games, and location
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-blue-600 mb-2">House Communities</h3>
              <p className="text-sm text-gray-600">
                Join or create houses where members support each other's content
              </p>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-green-600 mb-2">Local Collabs</h3>
              <p className="text-sm text-gray-600">
                Find roommates and local creators for in-person collaborations
              </p>
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  )
}