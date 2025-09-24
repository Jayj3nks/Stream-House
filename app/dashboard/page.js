'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Home, Users, MessageCircle, Settings, LogOut, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [houses, setHouses] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Load user data without API calls to avoid 502 issues
    // In a real app, this would come from server-side rendering or a working API
    setUser({
      id: 'user-id',
      email: 'user@example.com',
      displayName: 'Creator User',
      platforms: ['TikTok', 'YouTube'],
      niches: ['Gaming']
    })
    setHouses([]) // Start with empty houses
    setLoading(false)
  }, [])

  const handleLogout = async () => {
    try {
      // Create a form to submit logout
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/logout-form'
      form.style.display = 'none'
      document.body.appendChild(form)
      form.submit()
    } catch (error) {
      console.error('Logout error:', error)
      // Fallback - just redirect to home
      window.location.href = '/'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="text-2xl font-bold text-purple-600">
              Streamer House
            </Link>
            
            <nav className="flex items-center space-x-6">
              <Link href="/dashboard" className="text-gray-700 hover:text-purple-600 font-medium">
                Dashboard
              </Link>
              <Link href="/roommates" className="text-gray-700 hover:text-purple-600 font-medium">
                Roommates
              </Link>
              <Link href="/settings" className="text-gray-700 hover:text-purple-600 font-medium">
                Settings
              </Link>
              <Button
                variant="ghost"
                onClick={handleLogout}
                className="text-gray-700 hover:text-purple-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.displayName || 'Creator'}! 👋
          </h1>
          <p className="text-gray-600">
            Manage your houses, connect with creators, and grow your community.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Home className="w-8 h-8 text-purple-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">My Houses</h3>
                  <p className="text-2xl font-bold text-purple-600">{houses.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Connections</h3>
                  <p className="text-2xl font-bold text-blue-600">0</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageCircle className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">Messages</h3>
                  <p className="text-2xl font-bold text-green-600">0</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your Houses Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Your Houses</CardTitle>
                <CardDescription>
                  Houses you own or are a member of
                </CardDescription>
              </div>
              <Button asChild>
                <Link href="/house/create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create House
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {houses.length === 0 ? (
              <div className="text-center py-12">
                <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No houses yet</h3>
                <p className="text-gray-600 mb-6">
                  Start building your creator community by creating your first house.
                </p>
                <Button asChild>
                  <Link href="/house/create">
                    Create Your First House
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {houses.map((house) => (
                  <Card key={house.id} className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-900">{house.name}</h4>
                        <Badge variant="outline">{house.memberCount} members</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {house.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {house.niches?.map((niche) => (
                          <Badge key={niche} variant="secondary" className="text-xs">
                            {niche}
                          </Badge>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" className="w-full">
                        View House
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Find Roommates</CardTitle>
              <CardDescription>
                Connect with local creators for collaborations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Discover creators in your area who are looking for roommates and collaboration opportunities.
              </p>
              <Button asChild className="w-full">
                <Link href="/roommates">
                  Browse Roommates
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Your Profile</CardTitle>
              <CardDescription>
                Manage your creator profile and settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex flex-wrap gap-1">
                  {user?.platforms?.map((platform) => (
                    <Badge key={platform} variant="outline">
                      {platform}
                    </Badge>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1">
                  {user?.niches?.map((niche) => (
                    <Badge key={niche} variant="secondary">
                      {niche}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link href="/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}