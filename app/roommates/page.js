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
import { ArrowLeft, Search, Users, MapPin, Clock, UserPlus, Filter, Home } from 'lucide-react'
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
    niche: '',
    platforms: '',
    timezone: '',
    region: '',
    experience: '',
    q: ''
  })

  useEffect(() => {
    loadUserData()
  }, [])

  useEffect(() => {
    if (user) {
      loadRoommates()
    }
  }, [user])

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      router.push('/')
    } finally {
      setLoadingAuth(false)
    }
  }

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
      niche: '',
      platforms: '',
      timezone: '',
      region: '',
      experience: '',
      q: ''
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => window.location.href = '/'}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to House
            </Button>
            <h1 className="text-2xl font-bold text-purple-600">Find Roommates</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Filters */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Filter Roommates</span>
            </CardTitle>
            <CardDescription>
              Find creators who match your interests and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by username..."
                  value={filters.q}
                  onChange={(e) => handleFilterChange('q', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="niche">Niche</Label>
                <Select value={filters.niche} onValueChange={(value) => handleFilterChange('niche', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any niche" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any niche</SelectItem>
                    <SelectItem value="gaming">Gaming</SelectItem>
                    <SelectItem value="fitness">Fitness</SelectItem>
                    <SelectItem value="beauty">Beauty</SelectItem>
                    <SelectItem value="cooking">Cooking</SelectItem>
                    <SelectItem value="music">Music</SelectItem>
                    <SelectItem value="dance">Dance</SelectItem>
                    <SelectItem value="comedy">Comedy</SelectItem>
                    <SelectItem value="education">Education</SelectItem>
                    <SelectItem value="tech">Tech</SelectItem>
                    <SelectItem value="lifestyle">Lifestyle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="platforms">Platforms</Label>
                <Select value={filters.platforms} onValueChange={(value) => handleFilterChange('platforms', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any platform</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="twitch">Twitch</SelectItem>
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={filters.timezone} onValueChange={(value) => handleFilterChange('timezone', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any timezone</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">GMT</SelectItem>
                    <SelectItem value="Europe/Paris">Central European Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="region">Region</Label>
                <Select value={filters.region} onValueChange={(value) => handleFilterChange('region', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any region</SelectItem>
                    <SelectItem value="US-East">US East</SelectItem>
                    <SelectItem value="US-West">US West</SelectItem>
                    <SelectItem value="US-Central">US Central</SelectItem>
                    <SelectItem value="Europe">Europe</SelectItem>
                    <SelectItem value="Asia">Asia</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Experience</Label>
                <Select value={filters.experience} onValueChange={(value) => handleFilterChange('experience', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any experience</SelectItem>
                    <SelectItem value="novice">Novice</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="mt-4">
              <Button variant="outline" onClick={clearFilters}>
                Clear All Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Available Roommates
            </h2>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Search className="h-3 w-3" />
              <span>{pagination.total} found</span>
            </Badge>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p>Loading roommates...</p>
            </div>
          ) : roommates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No roommates found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your filters or check back later for new creators.
                </p>
                <Button onClick={clearFilters}>
                  Clear Filters
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {roommates.map((roommate) => (
                <Card key={roommate.userId} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={roommate.avatarUrl} />
                        <AvatarFallback>
                          {roommate.username?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{roommate.username}</h3>
                        {roommate.experience && (
                          <Badge variant="outline" className="text-xs">
                            {roommate.experience}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {roommate.niche && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">NICHE</p>
                        <Badge variant="secondary" className="text-xs">
                          {roommate.niche}
                        </Badge>
                      </div>
                    )}

                    {roommate.platforms && roommate.platforms.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">PLATFORMS</p>
                        <div className="flex flex-wrap gap-1">
                          {roommate.platforms.slice(0, 3).map((platform) => (
                            <Badge key={platform} variant="outline" className="text-xs">
                              {platform}
                            </Badge>
                          ))}
                          {roommate.platforms.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{roommate.platforms.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {(roommate.timezone || roommate.region) && (
                      <div className="flex items-center text-sm text-muted-foreground space-x-2">
                        {roommate.region && (
                          <span className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3" />
                            <span>{roommate.region}</span>
                          </span>
                        )}
                        {roommate.timezone && (
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{roommate.timezone?.replace('America/', '').replace('_', ' ')}</span>
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex space-x-2 pt-2">
                      <Button
                        onClick={() => window.location.href = `/profile/${roommate.username}`}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        View Profile
                      </Button>
                      <Button
                        onClick={() => inviteToHouse(roommate.userId)}
                        disabled={inviteLoading[roommate.userId]}
                        size="sm"
                        className="flex-1"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        {inviteLoading[roommate.userId] ? "Inviting..." : "Invite"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && roommates.length > 0 && Math.ceil(pagination.total / pagination.pageSize) > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-8">
              <Button
                variant="outline"
                disabled={pagination.page === 1}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
              <Button
                variant="outline"
                disabled={pagination.page >= Math.ceil(pagination.total / pagination.pageSize)}
                onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>
      <Toaster />
    </div>
  )
}