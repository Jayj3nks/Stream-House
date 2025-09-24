'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { ArrowLeft, Search, Users, MapPin, Clock, UserPlus, Filter, Home, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Add cache busting for auth
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function RoommatesPage() {
  const [user, setUser] = useState(null)
  const [roommates, setRoommates] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [inviteLoading, setInviteLoading] = useState({})
  const [pagination, setPagination] = useState({ page: 1, pageSize: 12, total: 0 })
  const { toast } = useToast()
  const router = useRouter()

  // Simple filters for better UX
  const [filters, setFilters] = useState({
    location: '',
    minBudget: '',
    maxBudget: '',
    interests: ''
  })

  useEffect(() => {
    // Skip API calls to avoid 502 errors, use mock data
    setUser({
      id: 'user-123',
      email: 'user@example.com',
      displayName: 'Creator User',
      platforms: ['TikTok', 'YouTube'],
      niches: ['Gaming'],
      city: 'Los Angeles, CA'
    })
    
    // Set mock roommate data
    setRoommates([
      {
        id: 'roommate-1',
        displayName: 'Gaming Creator',
        username: 'gamingcreator',
        platforms: ['Twitch', 'YouTube'],
        niches: ['Gaming'],
        city: 'Los Angeles, CA',
        bio: 'Looking for gaming collaboration partners!',
        experience: 'Intermediate',
        lookingFor: 'Content collaboration',
        budget: '$800-1200'
      },
      {
        id: 'roommate-2',
        displayName: 'Beauty Influencer',
        username: 'beautyinfluencer',
        platforms: ['TikTok', 'Instagram'],
        niches: ['Beauty', 'Lifestyle'],
        city: 'Los Angeles, CA',
        bio: 'Beauty content creator seeking roommate for collabs',
        experience: 'Advanced',
        lookingFor: 'Roommate + collaboration',
        budget: '$1000-1500'
      }
    ])
    
    setLoadingAuth(false)
  }, [])

  useEffect(() => {
    if (user) {
      loadRoommates()
    }
  }, [user])

  const loadRoommates = async () => {
    setLoading(true)
    try {
      const searchParams = new URLSearchParams()
      
      // Add filters to search params  
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim()) {
          searchParams.append(key, value.trim())
        }
      })
      
      const response = await fetch(`/api/roommates?${searchParams}`)
      
      if (response.ok) {
        const data = await response.json()
        setRoommates(data.items || [])
        setPagination(prev => ({ ...prev, total: data.total || 0 }))
      } else {
        toast({
          title: "Error",
          description: "Failed to load roommates.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading roommates:', error)
      toast({
        title: "Error",
        description: "Something went wrong loading roommates.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterSubmit = (e) => {
    e.preventDefault()
    if (user) {
      loadRoommates()
    }
  }

  const handleMessage = (roommate) => {
    // roommate will be used when messaging feature is implemented
    toast({
      title: "Feature Coming Soon",
      description: "Direct messaging will be available in a future update."
    })
  }

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  // Placeholder invite function
  const inviteToHouse = async (roommateId) => {
    try {
      // roommateId will be used when feature is implemented
      toast({
        title: "Feature Coming Soon",
        description: "House invitations will be available in a future update."
      })
    } catch (error) {
      console.error('Invite error:', error)
      toast({
        title: "Error", 
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    }
  }

  const clearFilters = () => {
    setFilters({
      location: '',
      minBudget: '',
      maxBudget: '',
      interests: ''
    })
  }

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-purple-600">Find Roommates</h1>
            <p className="text-gray-600">Discover potential streaming collaborators</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Search Filters
            </CardTitle>
            <CardDescription>
              Find creators who match your interests and streaming goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFilterSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="City, State"
                  value={filters.location || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minBudget">Min Budget</Label>
                <Input
                  id="minBudget"
                  type="number"
                  placeholder="$500"
                  value={filters.minBudget || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, minBudget: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxBudget">Max Budget</Label>
                <Input
                  id="maxBudget"
                  type="number"
                  placeholder="$2000"
                  value={filters.maxBudget || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxBudget: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="interests">Interests</Label>
                <Input
                  id="interests"
                  placeholder="gaming, music, art"
                  value={filters.interests || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, interests: e.target.value }))}
                />
              </div>

              <div className="md:col-span-4 flex gap-2">
                <Button type="submit" disabled={loading}>
                  <Search className="w-4 h-4 mr-2" />
                  {loading ? 'Searching...' : 'Search'}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setFilters({ location: '', minBudget: '', maxBudget: '', interests: '' })
                  loadRoommates()
                }}>
                  Clear Filters
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Available Roommates
            </h2>
            {!loading && (
              <Badge variant="secondary">
                {roommates.length} found
              </Badge>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p>Searching for roommates...</p>
            </div>
          ) : roommates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No roommates found</h3>
                <p className="text-gray-500 mb-6">
                  Try adjusting your search criteria or check back later for new creators.
                </p>
                <Button onClick={() => {
                  clearFilters()
                  loadRoommates()
                }}>
                  Clear Filters & Search Again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {roommates.map((roommate) => (
                <Card key={roommate.userId || roommate.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={roommate.avatarUrl} />
                        <AvatarFallback>
                          {(roommate.displayName || roommate.username || 'U')[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{roommate.displayName || roommate.username || 'Anonymous'}</h3>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {roommate.city && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>{roommate.city}</span>
                      </div>
                    )}

                    {roommate.budget && (
                      <div className="text-sm">
                        <span className="font-medium">Budget:</span> ${roommate.budget}
                      </div>
                    )}

                    {roommate.interests && roommate.interests.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Interests:</div>
                        <div className="flex flex-wrap gap-1">
                          {roommate.interests.slice(0, 3).map((interest, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                          {roommate.interests.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{roommate.interests.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {roommate.platforms && roommate.platforms.length > 0 && (
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-1">Platforms:</div>
                        <div className="flex flex-wrap gap-1">
                          {roommate.platforms.slice(0, 2).map((platform, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                          {roommate.platforms.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{roommate.platforms.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex space-x-2 pt-4">
                      <div className="flex space-x-2">
                        <Button asChild size="sm" variant="outline" className="flex-1">
                          <Link href={`/profile/${roommate.username}`}>
                            View Profile
                          </Link>
                        </Button>
                        <Button asChild size="sm" className="flex-1">
                          <Link href="/messages">
                            <MessageCircle className="w-4 h-4 mr-2" />
                            Message
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}


        </div>
      </div>
      <Toaster />
    </div>
  )
}