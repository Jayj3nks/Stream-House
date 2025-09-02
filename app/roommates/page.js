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
import { ArrowLeft, Search, Users, MapPin, Clock, UserPlus, Filter } from 'lucide-react'

export default function RoommatesPage() {
  const [user, setUser] = useState(null)
  const [roommates, setRoommates] = useState([])
  const [filteredRoommates, setFilteredRoommates] = useState([])
  const [loading, setLoading] = useState(false)
  const [inviteLoading, setInviteLoading] = useState({})
  const { toast } = useToast()

  // Filters
  const [filters, setFilters] = useState({
    niche: '',
    platform: '',
    city: '',
    hasSchedule: '',
    searchQuery: ''
  })

  useEffect(() => {
    loadUserData()
    loadRoommates()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [roommates, filters])

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/'
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      } else {
        window.location.href = '/'
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const loadRoommates = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/roommates', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRoommates(data)
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

  const applyFilters = () => {
    let filtered = [...roommates]

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase()
      filtered = filtered.filter(roommate => 
        roommate.displayName.toLowerCase().includes(query) ||
        roommate.bio?.toLowerCase().includes(query) ||
        roommate.niches?.some(niche => niche.toLowerCase().includes(query)) ||
        roommate.games?.some(game => game.toLowerCase().includes(query))
      )
    }

    if (filters.niche) {
      filtered = filtered.filter(roommate => 
        roommate.niches?.includes(filters.niche)
      )
    }

    if (filters.platform) {
      filtered = filtered.filter(roommate => 
        roommate.platforms?.includes(filters.platform)
      )
    }

    if (filters.city) {
      filtered = filtered.filter(roommate => 
        roommate.city?.toLowerCase().includes(filters.city.toLowerCase())
      )
    }

    if (filters.hasSchedule !== '') {
      const hasSchedule = filters.hasSchedule === 'true'
      filtered = filtered.filter(roommate => 
        roommate.hasSchedule === hasSchedule
      )
    }

    setFilteredRoommates(filtered)
  }

  const inviteToHouse = async (roommateId) => {
    setInviteLoading(prev => ({ ...prev, [roommateId]: true }))
    
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          inviteeUserId: roommateId,
          type: 'internal'
        })
      })

      if (response.ok) {
        toast({
          title: "Invite sent!",
          description: "Your house invitation has been sent."
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to send invite.",
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
      setInviteLoading(prev => ({ ...prev, [roommateId]: false }))
    }
  }

  const clearFilters = () => {
    setFilters({
      niche: '',
      platform: '',
      city: '',
      hasSchedule: '',
      searchQuery: ''
    })
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
              Find creators who match your interests and schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by name, bio, niche..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="niche">Niche</Label>
                <Select value={filters.niche} onValueChange={(value) => setFilters(prev => ({ ...prev, niche: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any niche" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any niche</SelectItem>
                    <SelectItem value="Gaming">Gaming</SelectItem>
                    <SelectItem value="Fitness">Fitness</SelectItem>
                    <SelectItem value="Beauty">Beauty</SelectItem>
                    <SelectItem value="Cooking">Cooking</SelectItem>
                    <SelectItem value="Music">Music</SelectItem>
                    <SelectItem value="Dance">Dance</SelectItem>
                    <SelectItem value="Comedy">Comedy</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Tech">Tech</SelectItem>
                    <SelectItem value="Lifestyle">Lifestyle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="platform">Platform</Label>
                <Select value={filters.platform} onValueChange={(value) => setFilters(prev => ({ ...prev, platform: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any platform" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any platform</SelectItem>
                    <SelectItem value="TikTok">TikTok</SelectItem>
                    <SelectItem value="YouTube">YouTube</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Twitch">Twitch</SelectItem>
                    <SelectItem value="Twitter/X">Twitter/X</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="Search by city..."
                  value={filters.city}
                  onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="schedule">Schedule</Label>
                <Select value={filters.hasSchedule} onValueChange={(value) => setFilters(prev => ({ ...prev, hasSchedule: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any schedule" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any schedule</SelectItem>
                    <SelectItem value="true">Has regular schedule</SelectItem>
                    <SelectItem value="false">Flexible schedule</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters} className="w-full">
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Available Roommates ({filteredRoommates.length})
            </h2>
            <Badge variant="secondary" className="flex items-center space-x-1">
              <Search className="h-3 w-3" />
              <span>{filteredRoommates.length} found</span>
            </Badge>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p>Loading roommates...</p>
            </div>
          ) : filteredRoommates.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No roommates found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters or check back later for new creators.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRoommates.map((roommate) => (
                <Card key={roommate.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={roommate.profilePictureUrl} />
                        <AvatarFallback>
                          {roommate.displayName?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-semibold">{roommate.displayName}</h3>
                        <p className="text-sm text-muted-foreground">
                          {roommate.totalPoints || 0} points
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {roommate.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {roommate.bio}
                      </p>
                    )}

                    {roommate.city && (
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="h-4 w-4" />
                        <span>{roommate.city}</span>
                      </div>
                    )}

                    {roommate.hasSchedule && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Clock className="h-4 w-4" />
                        <span>Regular schedule</span>
                      </div>
                    )}

                    {/* Platforms */}
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

                    {/* Niches */}
                    {roommate.niches && roommate.niches.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">NICHES</p>
                        <div className="flex flex-wrap gap-1">
                          {roommate.niches.slice(0, 3).map((niche) => (
                            <Badge key={niche} variant="secondary" className="text-xs">
                              {niche}
                            </Badge>
                          ))}
                          {roommate.niches.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{roommate.niches.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Gaming */}
                    {roommate.games && roommate.games.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">GAMES</p>
                        <div className="flex flex-wrap gap-1">
                          {roommate.games.slice(0, 2).map((game) => (
                            <Badge key={game} variant="outline" className="text-xs">
                              {game}
                            </Badge>
                          ))}
                          {roommate.games.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{roommate.games.length - 2} more
                            </Badge>
                          )}
                        </div>
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
                        onClick={() => inviteToHouse(roommate.id)}
                        disabled={inviteLoading[roommate.id]}
                        size="sm"
                        className="flex-1"
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        {inviteLoading[roommate.id] ? "Inviting..." : "Invite"}
                      </Button>
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