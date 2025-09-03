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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Plus, Users, Target, Trophy, Search, Settings, ExternalLink, Scissors, UserPlus, Play, Trash2, Home, MessageSquare, UserMinus } from 'lucide-react'

export default function App() {
  const [user, setUser] = useState(null)
  const [myHouses, setMyHouses] = useState([])
  const [activeHouse, setActiveHouse] = useState(null)
  const [houseSummary, setHouseSummary] = useState({ count: 0, canCreate: true, max: 5 })
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [showAuth, setShowAuth] = useState(true)
  const { toast } = useToast()

  // Auth state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // New post state
  const [newPostUrl, setNewPostUrl] = useState('')
  const [showNewPost, setShowNewPost] = useState(false)

  // House creation
  const [houseName, setHouseName] = useState('')
  const [showCreateHouse, setShowCreateHouse] = useState(false)

  // Clip creation
  const [showCreateClip, setShowCreateClip] = useState({})
  const [clipUrl, setClipUrl] = useState('')

  // Collaboration
  const [showAddCollaborators, setShowAddCollaborators] = useState({})
  const [selectedCollaborators, setSelectedCollaborators] = useState([])

  // Kick vote state
  const [showKickVote, setShowKickVote] = useState(false)
  const [kickTarget, setKickTarget] = useState('')

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        // User is authenticated, redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        setShowAuth(true)
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      setShowAuth(true)
    }
  }

  // Keep the old function for backward compatibility but it won't be used
  const loadUserData = async (token) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setShowAuth(false)
        await loadMyHouses(token)
        await loadHouseSummary(token)
        await loadActiveHouse(token)
      } else {
        localStorage.removeItem('token')
        setShowAuth(true)
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      localStorage.removeItem('token')
      setShowAuth(true)
    }
  }

  const loadMyHouses = async (token) => {
    try {
      const response = await fetch('/api/users/me/houses', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
      })
      if (response.ok) {
        const houses = await response.json()
        setMyHouses(houses)
      }
    } catch (error) {
      console.error('Error loading houses:', error)
    }
  }

  const loadHouseSummary = async (token) => {
    try {
      const response = await fetch('/api/users/me/houses/summary', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
      })
      if (response.ok) {
        const summary = await response.json()
        setHouseSummary(summary)
      }
    } catch (error) {
      console.error('Error loading house summary:', error)
    }
  }

  const loadActiveHouse = async (token) => {
    try {
      const response = await fetch('/api/session/active-house', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
      })
      if (response.ok) {
        const data = await response.json()
        if (data.houseId) {
          // Find the house in our list
          const house = myHouses.find(h => h.houseId === data.houseId)
          if (house) {
            setActiveHouse(house)
            loadHouseFeed(token)
          }
        } else {
          // No active house - will be handled by dashboard logic
          setActiveHouse(null)
        }
      }
    } catch (error) {
      console.error('Error loading active house:', error)
    }
  }

  const loadHouseFeed = async (token) => {
    if (!activeHouse) return
    
    try {
      const response = await fetch('/api/house/feed', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
      })
      if (response.ok) {
        const postsData = await response.json()
        setPosts(postsData)
      }
    } catch (error) {
      console.error('Error loading house feed:', error)
    }
  }

  const setActiveHouseHandler = async (house) => {
    try {
      const response = await fetch('/api/session/active-house', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ houseId: house.houseId })
      })

      if (response.ok) {
        setActiveHouse(house)
        // Update houses list to reflect active status
        setMyHouses(prev => prev.map(h => ({
          ...h,
          isActive: h.houseId === house.houseId
        })))
        // Load feed for new active house
        loadHouseFeed()
        toast({
          title: "House switched",
          description: `Now posting to ${house.name}`
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch house.",
        variant: "destructive"
      })
    }
  }

  const handleAuth = async (e) => {
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
        localStorage.setItem('token', data.token)
        setUser(data.user)
        setShowAuth(false)
        toast({
          title: "Welcome back!",
          description: `You now have ${data.user.totalPoints || 0} points.`
        })
        await loadMyHouses(data.token)
        await loadHouseSummary(data.token)
        await loadActiveHouse(data.token)
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

  const createHouse = async () => {
    if (!houseName.trim()) return

    setLoading(true)
    try {
      const response = await fetch('/api/houses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ name: houseName })
      })

      const data = await response.json()

      if (response.ok) {
        setHouseName('')
        setShowCreateHouse(false)
        
        // Reload houses and summary
        await loadMyHouses()
        await loadHouseSummary()
        
        // The backend automatically sets this as active house
        // Create a temporary house object for immediate UI update
        const newHouse = {
          houseId: data.id,
          name: data.name,
          role: 'owner',
          membersCount: 1,
          activePosts24h: 0,
          isActive: true
        }
        
        // Update the houses list to mark this as active
        setMyHouses(prev => prev.map(h => ({
          ...h,
          isActive: h.houseId === data.id
        })))
        
        setActiveHouse(newHouse)
        
        // Load the feed for the new house
        loadHouseFeed()
        
        toast({
          title: "House created!",
          description: `${houseName} is ready for collaborations.`
        })
      } else if (response.status === 409 && data.code === 'HOUSE_LIMIT_REACHED') {
        toast({
          title: "House limit reached",
          description: `You can only create ${data.max} houses.`,
          variant: "destructive"
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create house.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create house.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const addPost = async () => {
    if (!newPostUrl.trim() || !activeHouse) return

    setLoading(true)
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ url: newPostUrl })
      })

      if (response.ok) {
        const newPost = await response.json()
        setPosts(prev => [newPost, ...prev])
        setNewPostUrl('')
        setShowNewPost(false)
        toast({
          title: "Post shared!",
          description: "Your content is now live in the house."
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

  const handleEngage = (postId, ownerId) => {
    // Owner engage guard - hide engage on own posts
    if (ownerId === user.id) {
      toast({
        title: "Cannot engage",
        description: "You cannot engage with your own posts.",
        variant: "destructive"
      })
      return
    }

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
        
        setPosts(prev => prev.map(post => {
          if (post.id === postId) {
            return { ...post, clipCount: (post.clipCount || 0) + 1 }
          }
          return post
        }))

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

  const deletePost = async (postId) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        setPosts(prev => prev.filter(post => post.id !== postId))
        toast({
          title: "Post deleted",
          description: "Your post has been removed."
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    setMyHouses([])
    setActiveHouse(null)
    setPosts([])
    setShowAuth(true)
  }

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-purple-600">Streamer House</CardTitle>
            <CardDescription>
              Welcome back to the house!
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
                {loading ? "Processing..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                Don't have an account?
              </p>
              <Button 
                variant="default" 
                onClick={() => window.location.href = '/signup'}
                className="w-full"
              >
                Create Account
              </Button>
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-purple-600">Streamer House</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="flex items-center space-x-1">
                <Trophy className="h-3 w-3" />
                <span>{user?.totalPoints || 0} points</span>
              </Badge>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.href = '/roommates'}
              >
                <Search className="h-4 w-4 mr-2" />
                Find Roommates
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
                <AvatarImage src={user?.avatarUrl} />
                <AvatarFallback>{user?.displayName?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={logout}>
                Logout
              </Button>
            </div>
          </div>

          {/* My Houses Switcher */}
          {myHouses.length > 0 && (
            <div className="mt-4 flex items-center space-x-4">
              <span className="text-sm font-medium text-muted-foreground">My Houses:</span>
              <div className="flex flex-wrap gap-2">
                {myHouses.map((house) => (
                  <button
                    key={house.houseId}
                    onClick={() => setActiveHouseHandler(house)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm transition-colors ${
                      house.isActive 
                        ? 'bg-purple-100 text-purple-800 border-2 border-purple-300' 
                        : 'bg-muted hover:bg-muted/80 border-2 border-transparent'
                    }`}
                  >
                    <Avatar className="w-5 h-5">
                      <AvatarImage src={house.avatarUrl} />
                      <AvatarFallback className="text-xs">{house.name[0]}</AvatarFallback>
                    </Avatar>
                    <span>{house.name}</span>
                    {house.activePosts24h > 0 && (
                      <Badge variant="secondary" className="text-xs ml-1">
                        {house.activePosts24h}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
              
              {/* Create House Button */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowCreateHouse(true)}
                disabled={!houseSummary.canCreate}
                title={!houseSummary.canCreate ? `Limit reached (${houseSummary.max})` : ''}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create House {!houseSummary.canCreate && `(${houseSummary.count}/${houseSummary.max})`}
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {myHouses.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Create Your First House</CardTitle>
              <CardDescription>
                Start building your creator community
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!showCreateHouse ? (
                <Button onClick={() => setShowCreateHouse(true)} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create House
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="houseName">House Name</Label>
                    <Input
                      id="houseName"
                      value={houseName}
                      onChange={(e) => setHouseName(e.target.value)}
                      placeholder="e.g., Fitness Creators"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button onClick={createHouse} disabled={loading} className="flex-1">
                      Create
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateHouse(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : !activeHouse ? (
          <Card className="max-w-md mx-auto">
            <CardHeader className="text-center">
              <CardTitle>Select Active House</CardTitle>
              <CardDescription>
                Choose which house to post to
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {myHouses.map((house) => (
                  <Button
                    key={house.houseId}
                    variant="outline"
                    onClick={() => setActiveHouseHandler(house)}
                    className="w-full justify-start"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    {house.name}
                  </Button>
                ))}
              </div>
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
                  <CardDescription>
                    Posting to: <strong>{activeHouse.name}</strong>
                  </CardDescription>
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
                            <AvatarImage src={post.authorAvatar} />
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
                          {/* Owner Actions */}
                          {post.ownerUserId === user.id ? (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => window.open(post.canonicalUrl, '_blank')}
                                className="flex items-center space-x-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                <span>Open</span>
                              </Button>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Delete</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Post</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete this post? This action cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deletePost(post.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          ) : (
                            /* Non-owner Actions */
                            <>
                              <Button
                                onClick={() => handleEngage(post.id, post.ownerUserId)}
                                className="flex items-center space-x-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                <span>Engage (+1 pt)</span>
                              </Button>

                              <Button
                                variant="outline"
                                onClick={() => window.open(post.canonicalUrl, '_blank')}
                                className="flex items-center space-x-2"
                              >
                                <ExternalLink className="h-4 w-4" />
                                <span>Open</span>
                              </Button>

                              <Button
                                variant="outline"
                                onClick={() => setShowCreateClip(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                                className="flex items-center space-x-2"
                              >
                                <Scissors className="h-4 w-4" />
                                <span>Create Clip (+2 pts)</span>
                              </Button>
                            </>
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
                    </CardContent>
                  </Card>
                ))}

                {posts.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-12">
                      <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-medium mb-2">No posts yet</h3>
                      <p className="text-muted-foreground">
                        Share your first post to get the house engaged!
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

              {/* House Stats */}
              {activeHouse && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Home className="h-5 w-5" />
                      <span>House Stats</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm">Members</span>
                        <span className="font-medium">{activeHouse.membersCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Posts Today</span>
                        <span className="font-medium">{activeHouse.activePosts24h}</span>
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
              )}

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
                      onClick={() => window.location.href = '/roommates'}
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Find Roommates
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      onClick={() => window.location.href = '/help'}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Help & Support
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Create House Dialog */}
      {showCreateHouse && myHouses.length > 0 && (
        <AlertDialog open={showCreateHouse} onOpenChange={setShowCreateHouse}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Create New House</AlertDialogTitle>
              <AlertDialogDescription>
                Create a house for creator collaboration ({houseSummary.count}/{houseSummary.max} used)
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newHouseName">House Name</Label>
                <Input
                  id="newHouseName"
                  value={houseName}
                  onChange={(e) => setHouseName(e.target.value)}
                  placeholder="e.g., Gaming Creators"
                />
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={createHouse} disabled={!houseName.trim() || loading}>
                {loading ? "Creating..." : "Create House"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
      
      <Toaster />
    </div>
  )
}