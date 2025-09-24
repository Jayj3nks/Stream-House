'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { ArrowLeft, Home, Users, Target } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const niches = [
  'Gaming', 'Lifestyle', 'Beauty', 'Fitness', 'Comedy', 'Music',
  'Art', 'Cooking', 'Tech', 'Fashion', 'Travel', 'Education',
  'ASMR', 'Reaction', 'IRL Streaming', 'Just Chatting'
]

export default function CreateHousePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  const [houseData, setHouseData] = useState({
    name: '',
    description: '',
    niche: '',
    maxMembers: 5,
    isPrivate: false,
    rules: ''
  })

  const [selectedNiches, setSelectedNiches] = useState([])

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth-check')
      if (response.ok) {
        const data = await response.json()
        if (data.authenticated && data.user) {
          setUser(data.user)
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
      setLoadingAuth(false)
    }
  }

  const toggleNiche = (niche) => {
    if (selectedNiches.includes(niche)) {
      setSelectedNiches(selectedNiches.filter(n => n !== niche))
    } else if (selectedNiches.length < 3) {
      setSelectedNiches([...selectedNiches, niche])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!houseData.name.trim()) {
      toast({
        title: "Error",
        description: "House name is required",
        variant: "destructive"
      })
      return
    }

    if (selectedNiches.length === 0) {
      toast({
        title: "Error", 
        description: "Please select at least one niche for your house",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      // Use form submission to avoid 502 errors
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = '/api/house-create-form'
      form.style.display = 'none'
      
      // Add all form fields as hidden inputs
      const fields = {
        name: houseData.name,
        description: houseData.description,
        maxMembers: houseData.maxMembers.toString(),
        rules: houseData.rules,
        niches: JSON.stringify(selectedNiches)
      }
      
      Object.entries(fields).forEach(([key, value]) => {
        const input = document.createElement('input')
        input.type = 'hidden'
        input.name = key
        input.value = value
        form.appendChild(input)
      })
      
      document.body.appendChild(form)
      form.submit()
      
    } catch (error) {
      console.error('Create house error:', error)
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center text-purple-600 hover:text-purple-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
          
          <div className="flex items-center space-x-3 mb-2">
            <Home className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Create Your House</h1>
          </div>
          <p className="text-gray-600">
            Start a community where creators collaborate and support each other's content
          </p>
        </div>

        {/* Create House Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="w-5 h-5" />
              <span>House Details</span>
            </CardTitle>
            <CardDescription>
              Set up your house where creators can collaborate and grow together
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* House Name */}
              <div className="space-y-2">
                <Label htmlFor="name">House Name *</Label>
                <Input
                  id="name"
                  value={houseData.name}
                  onChange={(e) => setHouseData({...houseData, name: e.target.value})}
                  placeholder="e.g., Gaming Creators Hub, Beauty Collab House"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={houseData.description}
                  onChange={(e) => setHouseData({...houseData, description: e.target.value})}
                  placeholder="Describe what your house is about and what kind of creators you're looking for..."
                  rows={3}
                />
              </div>

              {/* Niches */}
              <div className="space-y-3">
                <Label className="text-base font-medium">House Niches *</Label>
                <p className="text-sm text-gray-500">Select up to 3 niches that best describe your house (at least 1 required)</p>
                <div className="flex flex-wrap gap-2">
                  {niches.map(niche => (
                    <Badge
                      key={niche}
                      variant={selectedNiches.includes(niche) ? "default" : "outline"}
                      className={`cursor-pointer hover:bg-purple-100 ${
                        selectedNiches.length >= 3 && !selectedNiches.includes(niche) 
                          ? 'opacity-50 cursor-not-allowed' 
                          : ''
                      }`}
                      onClick={() => toggleNiche(niche)}
                    >
                      {niche}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Selected: {selectedNiches.length}/3
                </p>
              </div>

              {/* Max Members */}
              <div className="space-y-2">
                <Label htmlFor="maxMembers">Maximum Members</Label>
                <Input
                  id="maxMembers"
                  type="number"
                  min="2"
                  max="20"
                  value={houseData.maxMembers}
                  onChange={(e) => setHouseData({...houseData, maxMembers: parseInt(e.target.value)})}
                />
                <p className="text-xs text-gray-500">
                  Recommended: 5-10 members for optimal engagement
                </p>
              </div>

              {/* House Rules */}
              <div className="space-y-2">
                <Label htmlFor="rules">House Rules (Optional)</Label>
                <Textarea
                  id="rules"
                  value={houseData.rules}
                  onChange={(e) => setHouseData({...houseData, rules: e.target.value})}
                  placeholder="Set guidelines for your house members (e.g., engagement expectations, content standards, communication rules...)"
                  rows={3}
                />
              </div>

              {/* Submit */}
              <div className="flex space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  {loading ? "Creating House..." : "Create House"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
              <Target className="w-6 h-6 text-blue-500 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-800 mb-1">What happens after creating your house?</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Other creators can discover and join your house</li>
                  <li>• Members can share content for mutual engagement</li>
                  <li>• You'll be able to manage house settings and members</li>
                  <li>• Collaborative opportunities with like-minded creators</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  )
}