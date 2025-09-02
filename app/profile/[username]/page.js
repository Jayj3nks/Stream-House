'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { ArrowLeft, ExternalLink, Scissors, Play, Trophy, Users, Calendar } from 'lucide-react'

export default function ProfilePage({ params }) {
  const { username } = params
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState(null)
  const { toast } = useToast()

  useEffect(() => {
    loadCurrentUser()
    loadProfile()
  }, [username])

  const loadCurrentUser = async () => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        const response = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (response.ok) {
          const userData = await response.json()
          setCurrentUser(userData)
        }
      }
    } catch (error) {
      console.error('Error loading current user:', error)
    }
  }

  const loadProfile = async () => {
    try {
      const response = await fetch(`/api/users/${username}`)
      if (response.ok) {
        const profileData = await response.json()
        setProfile(profileData)
      } else {
        toast({
          title: "Profile not found",
          description: "The user profile you're looking for doesn't exist.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading profile:', error)
      toast({
        title: "Error",
        description: "Failed to load profile.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEngage = (postId) => {
    if (!currentUser) {
      toast({
        title: "Login required",
        description: "Please login to engage with content.",
        variant: "destructive"
      })
      return
    }

    // Open engage redirect in new tab
    const engageUrl = `/api/r/${postId}?u=${currentUser.id}`
    window.open(engageUrl, '_blank')
    
    toast({
      title: "Engagement credited!",
      description: "+1 point for engaging with content."
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Profile not found</h3>
            <p className="text-muted-foreground">
              The user you're looking for doesn't exist.
            </p>
            <Button 
              onClick={() => window.location.href = '/'}
              className="mt-4"
            >
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isOwnProfile = currentUser?.username === username

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => window.location.href = '/'}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Squad
            </Button>
            <h1 className="text-2xl font-bold text-purple-600">Creator Profile</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile.user.profilePictureUrl} />
                  <AvatarFallback className="text-2xl">
                    {profile.user.displayName?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{profile.user.displayName}</h2>
                  <p className="text-muted-foreground">@{profile.user.username}</p>
                  {profile.user.bio && (
                    <p className="mt-2 text-sm">{profile.user.bio}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Joined {new Date(profile.user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-600">
                  {profile.user.totalPoints}
                </div>
                <p className="text-sm text-muted-foreground">Total Points</p>
                
                {/* Points Summary */}
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <div className="text-lg font-bold text-blue-600">
                      {profile.pointsBreakdown.engage?.total || 0}
                    </div>
                    <p className="text-xs text-blue-600">Engage</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded-lg">
                    <div className="text-lg font-bold text-green-600">
                      {profile.pointsBreakdown.clip?.total || 0}
                    </div>
                    <p className="text-xs text-green-600">Clips</p>
                  </div>
                  <div className="bg-purple-50 p-2 rounded-lg">
                    <div className="text-lg font-bold text-purple-600">
                      {profile.pointsBreakdown.collab?.total || 0}
                    </div>
                    <p className="text-xs text-purple-600">Collabs</p>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="posts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="posts">Posts</TabsTrigger>
            <TabsTrigger value="clips">Clips Made</TabsTrigger>
            <TabsTrigger value="points">Points Breakdown</TabsTrigger>
          </TabsList>

          {/* Posts Tab */}
          <TabsContent value="posts" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Posted Content</h3>
              <Badge variant="secondary">{profile.posts.length} posts</Badge>
            </div>

            {profile.posts.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <ExternalLink className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile ? "Share your first post to get started!" : "This user hasn't shared any content yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.posts.map((post) => (
                  <Card key={post.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{post.provider}</Badge>
                        {post.isCollaboration && (
                          <Badge className="bg-purple-100 text-purple-800">Collab</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {post.thumbnailUrl && (
                        <img 
                          src={post.thumbnailUrl} 
                          alt={post.title}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <h4 className="font-medium text-sm line-clamp-2">{post.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(post.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="flex items-center justify-between pt-3">
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleEngage(post.id)}
                            className="flex items-center space-x-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Engage</span>
                          </Button>
                          
                          {/* Upload/Create Clip button for other members */}
                          {!isOwnProfile && currentUser && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.location.href = `/clip/create?postId=${post.id}`}
                              className="flex items-center space-x-1"
                            >
                              <Scissors className="h-3 w-3" />
                              <span>Create Clip</span>
                            </Button>
                          )}
                        </div>
                        
                        {(post.clipCount || 0) > 0 && (
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <Play className="h-3 w-3" />
                            <span>{post.clipCount} clips</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Clips Tab */}
          <TabsContent value="clips" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Clips Created</h3>
              <Badge variant="secondary">{profile.clipsMade.length} clips</Badge>
            </div>

            {profile.clipsMade.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Scissors className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No clips yet</h3>
                  <p className="text-muted-foreground">
                    {isOwnProfile ? "Create clips of other members' content to earn 2 points each!" : "This user hasn't created any clips yet."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {profile.clipsMade.map((clip) => (
                  <Card key={clip.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="space-y-3 pt-4">
                      {clip.originalPost?.thumbnailUrl && (
                        <img 
                          src={clip.originalPost.thumbnailUrl} 
                          alt={clip.originalPost.title}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      )}
                      <div>
                        <h4 className="font-medium text-sm">Clip of: {clip.originalPost?.title}</h4>
                        <Badge variant="outline" className="mt-1 text-xs">
                          {clip.originalPost?.provider}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Created {new Date(clip.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      
                      {clip.clipUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(clip.clipUrl, '_blank')}
                          className="w-full"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          View Clip
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Points Tab */}
          <TabsContent value="points" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Points Breakdown</h3>
              <Badge variant="secondary">{profile.user.totalPoints} total points</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <ExternalLink className="h-5 w-5" />
                    <span>Engagements</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {profile.pointsBreakdown.engage?.total || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {profile.pointsBreakdown.engage?.count || 0} engagements × 1 point
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Scissors className="h-5 w-5" />
                    <span>Clips</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {profile.pointsBreakdown.clip?.total || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {profile.pointsBreakdown.clip?.count || 0} clips × 2 points
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Collaborations</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {profile.pointsBreakdown.collab?.total || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {profile.pointsBreakdown.collab?.count || 0} collaborations × 3 points
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5" />
                  <span>Achievement Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{profile.posts.length}</div>
                    <p className="text-sm text-muted-foreground">Posts Created</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{profile.clipsMade.length}</div>
                    <p className="text-sm text-muted-foreground">Clips Made</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {profile.posts.reduce((acc, post) => acc + (post.clipCount || 0), 0)}
                    </div>
                    <p className="text-sm text-muted-foreground">Clips Inspired</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">
                      {profile.posts.filter(post => post.isCollaboration).length}
                    </div>
                    <p className="text-sm text-muted-foreground">Collaborations</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Toaster />
    </div>
  )
}