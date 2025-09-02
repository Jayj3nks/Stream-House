'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Plus, Users, Target, Trophy, Search, Settings, ExternalLink, Scissors, UserPlus, Play } from 'lucide-react'

export default function App() {
  const [user, setUser] = useState(null)
  const [currentSquad, setCurrentSquad] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAuth, setShowAuth] = useState(true)
  const { toast } = useToast()

  // Auth state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [displayName, setDisplayName] = useState('')

  // New post state
  const [newPostUrl, setNewPostUrl] = useState('')
  const [showNewPost, setShowNewPost] = useState(false)

  // Squad creation
  const [squadName, setSquadName] = useState('')
  const [showCreateSquad, setShowCreateSquad] = useState(false)

  // Clip creation
  const [showCreateClip, setShowCreateClip] = useState({})
  const [clipUrl, setClipUrl] = useState('')
  const [selectedPostId, setSelectedPostId] = useState(null)

  // Collaboration
  const [showAddCollaborators, setShowAddCollaborators] = useState({})
  const [collaboratorEmails, setCollaboratorEmails] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      loadUserData(token)
    }
  }, [])

  const loadUserData = async (token) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setShowAuth(false)
        loadSquadData(userData.id, token)
      } else {
        localStorage.removeItem('token')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  const loadSquadData = async (userId, token) => {
    try {
      const response = await fetch(`/api/squads/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const squad = await response.json()
        setCurrentSquad(squad)
        if (squad) {
          loadSquadPosts(squad.id, token)
        }
      }
    } catch (error) {
      console.error('Error loading squad data:', error)
    }
  }

  const loadSquadPosts = async (squadId, token) => {
    try {
      const response = await fetch(`/api/posts/squad/${squadId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const postsData = await response.json()
        setPosts(postsData)
      }
    } catch (error) {
      console.error('Error loading posts:', error)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/login'
      const body = isSignUp 
        ? { email, password, displayName } 
        : { email, password }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('token', data.token)
        setUser(data.user)
        setShowAuth(false)
        toast({
          title: isSignUp ? "Account created!" : "Welcome back!",
          description: `You now have ${data.user.totalPoints || 0} points.`
        })
        loadSquadData(data.user.id, data.token)
      } else {
        toast({
          title: "Error",
          description: data.error,
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

  const createSquad = async () => {
    if (!squadName.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/squads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: squadName, ownerId: user.id })
      })

      if (response.ok) {
        const squad = await response.json()
        setCurrentSquad(squad)
        setSquadName('')
        setShowCreateSquad(false)
        toast({
          title: "Squad created!",
          description: `${squadName} is ready for collaborations.`
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create squad.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const addPost = async () => {
    if (!newPostUrl.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          url: newPostUrl,
          squadId: currentSquad?.id
        })
      })

      if (response.ok) {
        const newPost = await response.json()
        setPosts(prev => [newPost, ...prev])
        setNewPostUrl('')
        setShowNewPost(false)
        toast({
          title: "Post shared!",
          description: "Your content is now live in the squad."
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share post.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEngage = (postId) => {
    // Open engage redirect in new tab
    const engageUrl = `/api/r/${postId}?u=${user.id}`
    window.open(engageUrl, '_blank')
    
    toast({
      title: "Engagement credited!",
      description: "+1 point for engaging with content."
    })

    // Update user points optimistically
    setUser(prev => ({
      ...prev,
      totalPoints: (prev.totalPoints || 0) + 1
    }))
  }

  const createClip = async (postId) => {
    if (!clipUrl.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/clips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          postId,
          clipUrl,
          source: 'url'
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update post clip count
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return { ...post, clipCount: (post.clipCount || 0) + 1 }
          }
          return post
        }))

        // Update user points
        setUser(prev => ({
          ...prev,
          totalPoints: (prev.totalPoints || 0) + 2
        }))

        setClipUrl('')
        setShowCreateClip(prev => ({ ...prev, [postId]: false }))
        toast({
          title: "Clip saved!",
          description: "+2 points for creating a clip."
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create clip.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const addCollaborators = async (postId) => {
    if (!collaboratorEmails.trim()) return

    // For demo, we'll just mark it as collaboration
    // In real app, you'd resolve emails to user IDs
    setLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          collaboratorUserIds: [] // Demo: empty for now
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update post to show as collaboration
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return { ...post, isCollaboration: true }
          }
          return post
        }))

        // Update user points
        if (data.pointsAwarded > 0) {
          setUser(prev => ({
            ...prev,
            totalPoints: (prev.totalPoints || 0) + 3
          }))
        }

        setCollaboratorEmails('')
        setShowAddCollaborators(prev => ({ ...prev, [postId]: false }))
        toast({
          title: "Collaboration saved!",
          description: data.pointsAwarded > 0 ? "+3 points to collaborators." : "Already marked as collaboration."
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add collaborators.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setCurrentSquad(null)
    setPosts([])
    setShowAuth(true)
  }

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-purple-600">CreatorSquad v2</CardTitle>
            <CardDescription>
              {isSignUp ? "Create your account" : "Welcome back!"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
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
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              )}
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
                {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Sign In")}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Button 
                variant="link" 
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
              </Button>
              {!isSignUp && (
                <div className="mt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/signup'}
                    className="w-full"
                  >
                    Create Detailed Profile
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Toaster />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-purple-600">CreatorSquad v2</h1>
            {currentSquad && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Users className="h-3 w-3" />
                <span>{currentSquad.name}</span>
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="outline" className="flex items-center space-x-1">
              <Trophy className="h-3 w-3" />
              <span>{user?.totalPoints || 0} points</span>
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/collaborations'}
            >
              <Search className="h-4 w-4 mr-2" />
              Find Collabs
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/settings'}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = `/profile/${user?.username}`}
            >
              <Users className="h-4 w-4 mr-2" />
              Profile
            </Button>
            <Avatar>
              <AvatarFallback>{user?.displayName?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" onClick={logout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {!currentSquad ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Create Your Squad</CardTitle>
              <CardDescription>
                Start building your creator community
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showCreateSquad ? (
                <Button onClick={() => setShowCreateSquad(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Squad
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="squadName">Squad Name</Label>
                    <Input
                      id="squadName"
                      value={squadName}
                      onChange={(e) => setSquadName(e.target.value)}
                      placeholder="e.g., Fitness Creators"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={createSquad} disabled={loading} className="flex-1">
                      Create
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateSquad(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Feed */}
            <div className="lg:col-span-3 space-y-6">
              {/* Add New Post */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Plus className="h-5 w-5" />
                    <span>Share Content</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!showNewPost ? (
                    <Button onClick={() => setShowNewPost(true)} className="w-full">
                      Share Your Content
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="postUrl">Content URL</Label>
                        <Input
                          id="postUrl"
                          value={newPostUrl}
                          onChange={(e) => setNewPostUrl(e.target.value)}
                          placeholder="https://tiktok.com/@yourhandle/video/..."
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={addPost} disabled={loading} className="flex-1">
                          Share Post
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowNewPost(false)}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Posts Feed */}
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Avatar>
                            <AvatarFallback>{post.authorName?.[0]?.toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{post.authorName}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(post.createdAt).toLocaleDateString()} • {post.provider}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{post.provider}</Badge>
                          {post.isCollaboration && (
                            <Badge className="bg-purple-100 text-purple-800">Collab</Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-start space-x-4">
                        {post.thumbnailUrl && (
                          <img 
                            src={post.thumbnailUrl} 
                            alt={post.title}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-medium mb-2">{post.title}</h3>
                          {post.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {post.description.slice(0, 150)}...
                            </p>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="flex space-x-2">
                          {/* Primary Engage Button */}
                          <Button
                            onClick={() => handleEngage(post.id)}
                            className="flex items-center space-x-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>Engage (+1 pt)</span>
                          </Button>

                          {/* Create Clip Button (only if not owner) */}
                          {post.ownerUserId !== user.id && (
                            <Button
                              variant="outline"
                              onClick={() => setShowCreateClip(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                              className="flex items-center space-x-2"
                            >
                              <Scissors className="h-4 w-4" />
                              <span>Create Clip (+2 pts)</span>
                            </Button>
                          )}

                          {/* Mark as Collaboration (only if owner) */}
                          {post.ownerUserId === user.id && !post.isCollaboration && (
                            <Button
                              variant="outline"
                              onClick={() => setShowAddCollaborators(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                              className="flex items-center space-x-2"
                            >
                              <UserPlus className="h-4 w-4" />
                              <span>Add Collaborators (+3 pts)</span>
                            </Button>
                          )}
                        </div>

                        {/* Clip Counter */}
                        {(post.clipCount || 0) > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex items-center space-x-1"
                          >
                            <Play className="h-4 w-4" />
                            <span>Clips: {post.clipCount}</span>
                          </Button>
                        )}
                      </div>

                      {/* Clip Creation Form */}
                      {showCreateClip[post.id] && (
                        <div className="space-y-3 p-4 bg-muted rounded-lg">
                          <div className="space-y-2">
                            <Label htmlFor={`clipUrl-${post.id}`}>Clip URL</Label>
                            <Input
                              id={`clipUrl-${post.id}`}
                              value={clipUrl}
                              onChange={(e) => setClipUrl(e.target.value)}
                              placeholder="https://tiktok.com/@you/video/your-clip"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              onClick={() => createClip(post.id)} 
                              disabled={loading || !clipUrl.trim()}
                              size="sm"
                            >
                              Save Clip
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setShowCreateClip(prev => ({ ...prev, [post.id]: false }))}
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Add Collaborators Form */}
                      {showAddCollaborators[post.id] && (
                        <div className="space-y-3 p-4 bg-muted rounded-lg">
                          <div className="space-y-2">
                            <Label htmlFor={`collabEmails-${post.id}`}>Collaborator Emails</Label>
                            <Input
                              id={`collabEmails-${post.id}`}
                              value={collaboratorEmails}
                              onChange={(e) => setCollaboratorEmails(e.target.value)}
                              placeholder="user1@email.com, user2@email.com"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              onClick={() => addCollaborators(post.id)} 
                              disabled={loading}
                              size="sm"
                            >
                              Add Collaborators
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => setShowAddCollaborators(prev => ({ ...prev, [post.id]: false }))}
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {posts.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                      <p className="text-muted-foreground">
                        Share your first post to get the squad engaged!
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Points Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    <span>Your Points</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600 mb-4">
                    {user?.totalPoints || 0}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>🔗 Engage = +1 point</p>
                    <p>✂️ Create Clip = +2 points</p>
                    <p>🤝 Collaborate = +3 points</p>
                  </div>
                </CardContent>
              </Card>

              {/* Squad Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Squad Stats</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Members</span>
                      <span className="font-medium">{currentSquad?.memberCount || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Posts Today</span>
                      <span className="font-medium">{posts.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Total Clips</span>
                      <span className="font-medium">
                        {posts.reduce((acc, post) => acc + (post.clipCount || 0), 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Quick Actions</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = `/profile/${user?.username}`}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View My Profile
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/collaborations'}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Find Collaborators
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
      <Toaster />
    </div>
  )
}