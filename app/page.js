'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Plus, Heart, MessageCircle, Share, Users, Target, Trophy, Calendar, Bell, Search } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'

export default function App() {
  const [user, setUser] = useState(null)
  const [currentSquad, setCurrentSquad] = useState(null)
  const [posts, setPosts] = useState([])
  const [userCredits, setUserCredits] = useState(0)
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

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Verify token and load user data
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
        loadUserCredits(userData.id, token)
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

  const loadUserCredits = async (userId, token) => {
    try {
      const response = await fetch(`/api/credits/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const creditsData = await response.json()
        setUserCredits(creditsData.balance)
      }
    } catch (error) {
      console.error('Error loading credits:', error)
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
          description: "You've successfully logged in."
        })
        loadSquadData(data.user.id, data.token)
        loadUserCredits(data.user.id, data.token)
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
    if (!newPostUrl.trim() || !currentSquad) return

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
          squadId: currentSquad.id,
          userId: user.id
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

  const handleEngagement = async (postId, type, postUrl, platform) => {
    try {
      // First track the click
      const clickResponse = await fetch('/api/engagements/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          postId,
          userId: user.id,
          type,
          redirectUrl: postUrl
        })
      })

      if (clickResponse.ok) {
        // Open the native platform post
        window.open(postUrl, '_blank')
        
        // Show verification dialog after a delay
        setTimeout(() => {
          const userConfirmed = window.confirm(
            `Did you successfully ${type === 'like' ? 'like' : type === 'comment' ? 'comment on' : 'share'} this ${platform} post?\n\nClick OK to earn credits, or Cancel if you didn't engage.`
          )
          
          if (userConfirmed) {
            // Verify engagement and award credits
            verifyEngagement(postId, type, postUrl)
          }
        }, 3000) // 3 second delay to allow platform interaction
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to track engagement.",
        variant: "destructive"
      })
    }
  }

  const verifyEngagement = async (postId, type, postUrl) => {
    try {
      const response = await fetch('/api/engagements/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          postId,
          userId: user.id,
          type,
          verificationData: { url: postUrl, timestamp: new Date().toISOString() }
        })
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update posts with new engagement
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              engagements: [...(post.engagements || []), data.engagement]
            }
          }
          return post
        }))

        // Update credits
        setUserCredits(prev => prev + data.creditsEarned)

        toast({
          title: `+${data.creditsEarned} credits earned!`,
          description: `Thanks for ${type === 'like' ? 'liking' : type === 'comment' ? 'commenting on' : 'sharing'} this ${post.platform} post!`
        })
      } else {
        const errorData = await response.json()
        if (errorData.error.includes('already earned')) {
          toast({
            title: "Already earned credits",
            description: "You've already earned credits for this engagement today.",
            variant: "default"
          })
        } else {
          throw new Error(errorData.error)
        }
      }
    } catch (error) {
      toast({
        title: "Verification failed",
        description: "Could not verify your engagement. No credits awarded.",
        variant: "destructive"
      })
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setCurrentSquad(null)
    setPosts([])
    setUserCredits(0)
    setShowAuth(true)
  }

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-purple-600">CreatorSquad</CardTitle>
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
            <h1 className="text-2xl font-bold text-purple-600">CreatorSquad</h1>
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
              <span>{userCredits} credits</span>
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.href = '/collaborations'}
            >
              <Search className="h-4 w-4 mr-2" />
              Find Collabs
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
                    <span>Drop New Post</span>
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
                {posts.map((post) => {
                  const engagements = post.engagements || []
                  const likesCount = engagements.filter(e => e.type === 'like').length
                  const commentsCount = engagements.filter(e => e.type === 'comment').length
                  const sharesCount = engagements.filter(e => e.type === 'share').length
                  const totalEngagements = engagements.length
                  const targetEngagements = currentSquad?.memberCount ? currentSquad.memberCount - 1 : 5
                  const progress = Math.min((totalEngagements / targetEngagements) * 100, 100)

                  return (
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
                                {new Date(post.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{post.platform}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h3 className="font-medium mb-2">{post.title}</h3>
                          <Button variant="outline" size="sm" asChild>
                            <a href={post.url} target="_blank" rel="noopener noreferrer">
                              Open Content
                            </a>
                          </Button>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Team Engagement</span>
                            <span>{totalEngagements}/{targetEngagements}</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between">
                          <div className="flex space-x-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEngagement(post.id, 'like')}
                              className="flex items-center space-x-1"
                            >
                              <Heart className="h-4 w-4" />
                              <span>{likesCount}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEngagement(post.id, 'comment')}
                              className="flex items-center space-x-1"
                            >
                              <MessageCircle className="h-4 w-4" />
                              <span>{commentsCount}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEngagement(post.id, 'share')}
                              className="flex items-center space-x-1"
                            >
                              <Share className="h-4 w-4" />
                              <span>{sharesCount}</span>
                            </Button>
                          </div>
                          {progress >= 100 && (
                            <Badge variant="success" className="bg-green-100 text-green-800">
                              Complete!
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}

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
              {/* Credits Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Trophy className="h-5 w-5" />
                    <span>Your Credits</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {userCredits}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>💜 Like = +1 credit</p>
                    <p>💬 Comment = +2 credits</p>
                    <p>🔄 Share = +3 credits</p>
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
                      <span className="text-sm">Total Engagements</span>
                      <span className="font-medium">
                        {posts.reduce((acc, post) => acc + (post.engagements?.length || 0), 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Accountability */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Daily Goals</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm">Engagements Today</span>
                      <span className="font-medium">
                        {posts.reduce((acc, post) => {
                          const userEngagements = post.engagements?.filter(e => e.userId === user.id).length || 0
                          return acc + userEngagements
                        }, 0)} / 5
                      </span>
                    </div>
                    <Progress 
                      value={Math.min((posts.reduce((acc, post) => {
                        const userEngagements = post.engagements?.filter(e => e.userId === user.id).length || 0
                        return acc + userEngagements
                      }, 0) / 5) * 100, 100)} 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground">
                      Keep supporting your squad to maintain your streak!
                    </p>
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