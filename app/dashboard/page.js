'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { MessageSquare, Home, Users, Plus, Settings, LogOut } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Add cache busting
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [myHouses, setMyHouses] = useState([])
  const [activeHouse, setActiveHouse] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      // Use working endpoint instead of /api/auth/me
      const response = await fetch('/api/auth-check')
      if (response.ok) {
        const data = await response.json()
        if (data.authenticated) {
          // handle either { user } or raw user
          setUser(data?.user ?? data)
          await loadMyHouses()
        } else {
          router.push('/')
        }
      } else {
        router.push('/')
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  const loadMyHouses = async () => {
    try {
      const response = await fetch('/api/users/me/houses')
      if (response.ok) {
        const data = await response.json()
        const houses = Array.isArray(data) ? data : (data?.houses ?? [])
        setMyHouses(houses)

        // Set first house as active if available
        if (houses.length > 0) {
          setActiveHouse(houses[0])
          loadMessages(houses[0].id)
        }
      }
    } catch (error) {
      console.error('Error loading houses:', error)
    }
  }

  const loadMessages = async (houseId) => {
    try {
      const response = await fetch(`/api/messages?houseId=${houseId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeHouse) return

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          houseId: activeHouse.id,
          text: newMessage
        })
      })

      if (response.ok) {
        setNewMessage('')
        loadMessages(activeHouse.id) // Reload messages
        toast({
          title: "Message sent!",
          description: "Your message has been posted to the house."
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-purple-600">Streamer House</h1>
            <p className="text-gray-600">Welcome back, {user.displayName || user.username}!</p>
          </div>
          <div className="flex items-center gap-4">
            <Avatar>
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback>{user.displayName?.[0] || user.username?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 mb-6">
          <Button variant="default">
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </Button>

          <Button variant="outline" asChild>
            <Link href="/roommates">
              <Users className="w-4 h-4 mr-2" />
              Find Roommates
            </Link>
          </Button>

          <Button variant="outline" asChild>
            <Link href="/settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Houses Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  My Houses
                  <Button size="sm" variant="outline" asChild>
                    <Link href="/house/create">
                      <Plus className="w-4 h-4" />
                    </Link>
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myHouses.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-500 mb-4">No houses yet</p>
                    <Button asChild>
                      <Link href="/house/create">Create Your First House</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {myHouses.map((house) => (
                      <div
                        key={house.id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          activeHouse?.id === house.id
                            ? 'bg-purple-100 border-purple-200 border-2'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => {
                          setActiveHouse(house)
                          loadMessages(house.id)
                        }}
                      >
                        <div className="font-medium">{house.name}</div>
                        <div className="text-sm text-gray-500">
                          {house.members?.length || 0} members
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeHouse ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2" />
                    {activeHouse.name} - Message Board
                  </CardTitle>
                  <CardDescription>
                    Chat with your house members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {/* Messages */}
                  <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                    {messages.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No messages yet. Be the first to start the conversation!
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div key={message.id} className="flex items-start space-x-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback>{message.username?.[0] || 'U'}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm">{message.username || 'Anonymous'}</span>
                              <span className="text-xs text-gray-500">
                                {new Date(message.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-1">{message.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <Separator className="mb-4" />

                  {/* Message Input */}
                  <form onSubmit={sendMessage} className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Write a message to your house..."
                      className="flex-1 min-h-[80px]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage(e)
                        }
                      }}
                    />
                    <Button type="submit" disabled={!newMessage.trim()}>
                      Send
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Home className="w-16 h-16 text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">Welcome to Dashboard</h3>
                  <p className="text-gray-500 text-center mb-6">
                    Create or join a house to start collaborating with other streamers!
                  </p>
                  <Button asChild>
                    <Link href="/house/create">Create Your First House</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  )
}
