'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ArrowLeft, Send, Search, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function MessagesPage() {
  const [user, setUser] = useState(null)
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Set mock user data
    setUser({
      id: 'user-123',
      displayName: 'Creator User',
      email: 'user@example.com'
    })

    // Set mock conversations
    setConversations([
      {
        id: 'conv-1',
        user: {
          id: 'user-1',
          displayName: 'Gaming Creator',
          username: 'gamingcreator',
          platforms: ['Twitch', 'YouTube']
        },
        lastMessage: 'Hey! Interested in that collab we discussed?',
        timestamp: '2 min ago',
        unread: true
      },
      {
        id: 'conv-2',
        user: {
          id: 'user-2',
          displayName: 'Beauty Influencer',
          username: 'beautyinfluencer',
          platforms: ['TikTok', 'Instagram']
        },
        lastMessage: 'Thanks for the engagement on my latest post!',
        timestamp: '1 hour ago',
        unread: false
      },
      {
        id: 'conv-3',
        user: {
          id: 'user-3',
          displayName: 'Tech Reviewer',
          username: 'techreviewer',
          platforms: ['YouTube']
        },
        lastMessage: 'When are you free for that tech review collab?',
        timestamp: 'Yesterday',
        unread: false
      }
    ])
    
    setLoading(false)
  }, [])

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation)
    
    // Load mock messages for selected conversation
    const mockMessages = [
      {
        id: 1,
        senderId: conversation.user.id,
        senderName: conversation.user.displayName,
        message: 'Hey there! I saw your content and really love your style.',
        timestamp: '10:30 AM',
        isOwn: false
      },
      {
        id: 2,
        senderId: 'user-123',
        senderName: 'Creator User',
        message: 'Thank you so much! I really appreciate that. Your gaming content is amazing too!',
        timestamp: '10:45 AM',
        isOwn: true
      },
      {
        id: 3,
        senderId: conversation.user.id,
        senderName: conversation.user.displayName,
        message: conversation.lastMessage,
        timestamp: '11:15 AM',
        isOwn: false
      }
    ]
    
    setMessages(mockMessages)
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedConversation) return
    
    const message = {
      id: messages.length + 1,
      senderId: 'user-123',
      senderName: 'Creator User',
      message: newMessage,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      isOwn: true
    }
    
    setMessages([...messages, message])
    setNewMessage('')
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
            <div className="flex items-center">
              <Link 
                href="/dashboard"
                className="inline-flex items-center text-purple-600 hover:text-purple-700 mr-6"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            </div>
            
            <Link href="/dashboard" className="text-2xl font-bold text-purple-600">
              Streamer House
            </Link>
          </div>
        </div>
      </header>

      {/* Messages Layout */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
          {/* Conversations List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="w-5 h-5 mr-2" />
                Conversations
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Search conversations..." 
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="space-y-1">
                  {conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 border-b transition-colors ${
                        selectedConversation?.id === conversation.id ? 'bg-purple-50 border-purple-200' : ''
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {conversation.user.displayName.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-gray-900 truncate">
                              {conversation.user.displayName}
                            </p>
                            <span className="text-xs text-gray-500">
                              {conversation.timestamp}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mb-1">
                            {conversation.user.platforms.map((platform) => (
                              <Badge key={platform} variant="outline" className="text-xs">
                                {platform}
                              </Badge>
                            ))}
                          </div>
                          <p className={`text-sm truncate ${
                            conversation.unread ? 'font-medium text-gray-900' : 'text-gray-600'
                          }`}>
                            {conversation.lastMessage}
                          </p>
                        </div>
                        {conversation.unread && (
                          <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="lg:col-span-2 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="pb-3">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarFallback>
                        {selectedConversation.user.displayName.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{selectedConversation.user.displayName}</CardTitle>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {selectedConversation.user.platforms.map((platform) => (
                          <Badge key={platform} variant="outline" className="text-xs">
                            {platform}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 flex flex-col p-0">
                  <ScrollArea className="flex-1 px-4 pb-4">
                    <div className="space-y-4">
                      {messages.map((message) => (
                        <div 
                          key={message.id} 
                          className={`flex flex-col space-y-1 ${
                            message.isOwn ? 'items-end' : 'items-start'
                          }`}
                        >
                          <div className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            message.isOwn 
                              ? 'bg-purple-600 text-white' 
                              : 'bg-gray-100 text-gray-900'
                          }`}>
                            {!message.isOwn && (
                              <div className="font-semibold text-xs mb-1 text-purple-600">
                                {message.senderName}
                              </div>
                            )}
                            <div className="text-sm">{message.message}</div>
                          </div>
                          <div className="text-xs text-gray-500">
                            {message.timestamp}
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  
                  {/* Message Input */}
                  <div className="border-t p-4">
                    <form onSubmit={handleSendMessage} className="flex space-x-3">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder={`Message ${selectedConversation.user.displayName}...`}
                        className="flex-1"
                      />
                      <Button type="submit" disabled={!newMessage.trim()}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-600">
                    Choose a conversation from the left to start messaging
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}