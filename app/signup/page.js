'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { ArrowLeft, ArrowRight, User, Gamepad2, MapPin, FileText } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const platforms = [
  'TikTok', 'YouTube', 'Twitch', 'Instagram', 'Twitter/X', 'Discord',
  'Facebook Gaming', 'Kick', 'Rumble', 'OnlyFans', 'Fansly'
]

const niches = [
  'Gaming', 'Lifestyle', 'Beauty', 'Fitness', 'Comedy', 'Music',
  'Art', 'Cooking', 'Tech', 'Fashion', 'Travel', 'Education',
  'ASMR', 'Reaction', 'IRL Streaming', 'Just Chatting'
]

const popularGames = [
  'League of Legends', 'Valorant', 'Fortnite', 'Apex Legends', 'Call of Duty',
  'Minecraft', 'Among Us', 'Fall Guys', 'Rocket League', 'Overwatch 2',
  'World of Warcraft', 'Grand Theft Auto V', 'Counter-Strike 2', 'Dota 2'
]

const timeZones = [
  'America/Los_Angeles', 'America/Denver', 'America/Chicago', 'America/New_York',
  'America/Toronto', 'Europe/London', 'Europe/Paris', 'Europe/Berlin',
  'Asia/Tokyo', 'Asia/Shanghai', 'Australia/Sydney'
]

import { createAccount } from '../actions/signup'

export default function SignupPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const router = useRouter()

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    platforms: [],
    niches: [],
    games: [],
    city: '',
    timeZone: 'America/Los_Angeles',
    hasSchedule: false,
    schedule: {},
    bio: ''
  })

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.displayName) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields: email, password, and display name.",
        variant: "destructive"
      })
      return false
    }

    if (formData.password.length < 8) {
      toast({
        title: "Validation Error", 
        description: "Password must be at least 8 characters long.",
        variant: "destructive"
      })
      return false
    }

    if (formData.platforms.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one platform.",
        variant: "destructive"
      })
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setLoading(true)
    
    try {
      console.log('Submitting signup data:', formData)
      
      toast({
        title: "Creating Account...",
        description: "Please wait while we set up your account."
      })
      
      // Call server action directly - this bypasses the 502 proxy issue
      const result = await createAccount(formData)
      
      if (result?.error) {
        toast({
          title: "Error",
          description: result.error,
          variant: "destructive"
        })
      } else if (result?.success) {
        toast({
          title: "Welcome to Streamer House!",
          description: "Your account has been created successfully."
        })
        
        console.log('Account created successfully:', result.user)
        
        // Now login to set the cookie properly via API
        console.log('Logging in to set authentication cookie...')
        try {
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              email: formData.email,
              password: formData.password
            })
          })
          
          if (loginResponse.ok) {
            console.log('Login successful, waiting for cookie to propagate...')
            // Wait longer for cookie to propagate properly
            setTimeout(() => {
              console.log('Redirecting to dashboard...')
              window.location.replace('/dashboard')
            }, 2000) // Increased delay
          } else {
            console.error('Login after signup failed')
            toast({
              title: "Account Created",
              description: "Please sign in with your new account.",
              variant: "default"
            })
            setTimeout(() => {
              window.location.replace('/')
            }, 2000)
          }
        } catch (loginError) {
          console.error('Login error:', loginError)
          toast({
            title: "Account Created",
            description: "Please sign in with your new account.",
            variant: "default"
          })
          setTimeout(() => {
            window.location.replace('/')
          }, 2000)
        }
      } else {
        console.log('Unexpected result:', result)
        toast({
          title: "Account Created", 
          description: "Please sign in with your new account.",
          variant: "default"
        })
        
        setTimeout(() => {
          window.location.href = '/'
        }, 2000)
      }
      
    } catch (error) {
      console.error('Outer error:', error)
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const canProceedToNextStep = () => {
    switch (step) {
      case 1:
        return formData.email && formData.password && formData.displayName
      case 2:
        return formData.platforms.length > 0
      case 3:
        return true
      case 4:
        return true
      default:
        return false
    }
  }

  const nextStep = () => {
    if (!canProceedToNextStep()) {
      let message = "Please fill in all required fields"
      if (step === 1) {
        message = "Please fill in email, password, and display name"
      } else if (step === 2) {
        message = "Please select at least one platform"
      }
      
      toast({
        title: "Required Fields Missing",
        description: message,
        variant: "destructive"
      })
      return
    }
    setStep(step + 1)
  }
  const prevStep = () => setStep(step - 1)

  const toggleArrayItem = (array, item) => {
    if (array.includes(item)) {
      return array.filter(x => x !== item)
    } else {
      return [...array, item]
    }
  }

  const renderStep1 = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <User className="w-5 h-5 text-purple-600" />
          <CardTitle>Basic Information</CardTitle>
        </div>
        <CardDescription>
          Let's start with your basic details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            placeholder="your@email.com"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name *</Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) => setFormData({...formData, displayName: e.target.value})}
            placeholder="How you'd like to be known"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            placeholder="At least 8 characters"
            required
          />
          <p className="text-xs text-gray-500">Must be at least 8 characters long</p>
        </div>
      </CardContent>
    </Card>
  )

  const renderStep2 = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Gamepad2 className="w-5 h-5 text-purple-600" />
          <CardTitle>Platforms & Niches</CardTitle>
        </div>
        <CardDescription>
          Choose the platforms you create content on and your niches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label className="text-base font-medium">Platforms *</Label>
          <p className="text-sm text-gray-500 mb-3">Select all platforms you create content on</p>
          <div className="flex flex-wrap gap-2">
            {platforms.map(platform => (
              <Badge
                key={platform}
                variant={formData.platforms.includes(platform) ? "default" : "outline"}
                className="cursor-pointer hover:bg-purple-100"
                onClick={() => setFormData({
                  ...formData,
                  platforms: toggleArrayItem(formData.platforms, platform)
                })}
              >
                {platform}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-base font-medium">Content Niches</Label>
          <p className="text-sm text-gray-500 mb-3">What type of content do you create?</p>
          <div className="flex flex-wrap gap-2">
            {niches.map(niche => (
              <Badge
                key={niche}
                variant={formData.niches.includes(niche) ? "default" : "outline"}
                className="cursor-pointer hover:bg-blue-100"
                onClick={() => setFormData({
                  ...formData,
                  niches: toggleArrayItem(formData.niches, niche)
                })}
              >
                {niche}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <Label className="text-base font-medium">Games (Optional)</Label>
          <p className="text-sm text-gray-500 mb-3">Which games do you play or stream?</p>
          <div className="flex flex-wrap gap-2">
            {popularGames.map(game => (
              <Badge
                key={game}
                variant={formData.games.includes(game) ? "default" : "outline"}
                className="cursor-pointer hover:bg-green-100"
                onClick={() => setFormData({
                  ...formData,
                  games: toggleArrayItem(formData.games, game)
                })}
              >
                {game}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderStep3 = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-purple-600" />
          <CardTitle>Location & Schedule</CardTitle>
        </div>
        <CardDescription>
          Help us connect you with creators in your area and timezone
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="city">City/Location (Optional)</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => setFormData({...formData, city: e.target.value})}
            placeholder="Los Angeles, CA"
          />
          <p className="text-xs text-gray-500">This helps us find roommates and local collaborations</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="timeZone">Time Zone</Label>
          <select
            id="timeZone"
            value={formData.timeZone}
            onChange={(e) => setFormData({...formData, timeZone: e.target.value})}
            className="w-full p-2 border rounded-md"
          >
            {timeZones.map(tz => (
              <option key={tz} value={tz}>
                {tz.replace('_', ' ').replace('/', ' - ')}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasSchedule"
              checked={formData.hasSchedule}
              onCheckedChange={(checked) => setFormData({...formData, hasSchedule: checked})}
            />
            <Label htmlFor="hasSchedule">I have a regular streaming/content schedule</Label>
          </div>
          <p className="text-xs text-gray-500">We can help match you with creators who have compatible schedules</p>
        </div>
      </CardContent>
    </Card>
  )

  const renderStep4 = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <FileText className="w-5 h-5 text-purple-600" />
          <CardTitle>About You</CardTitle>
        </div>
        <CardDescription>
          Tell us a bit about yourself and your content creation goals
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="bio">Bio (Optional)</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData({...formData, bio: e.target.value.slice(0, 500)})}
            placeholder="Tell us about your content, goals, or what you're looking for in the creator community..."
            rows={4}
          />
          <p className="text-xs text-gray-500">{formData.bio.length}/500 characters</p>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-semibold text-purple-800 mb-2">🎉 You're almost done!</h4>
          <p className="text-sm text-purple-700">
            After creating your account, you'll be able to join houses, find roommates, 
            and connect with other creators in your niche and location.
          </p>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-purple-600 hover:text-purple-700">
            Streamer House
          </Link>
          <p className="text-gray-600 mt-2">Join the creator community</p>
          
          {/* Progress indicator */}
          <div className="flex justify-center mt-6 mb-8">
            <div className="flex items-center space-x-4">
              {[1, 2, 3, 4].map((num) => (
                <div key={num} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    num <= step 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {num}
                  </div>
                  {num < 4 && (
                    <div className={`w-12 h-0.5 ${
                      num < step ? 'bg-purple-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-sm text-gray-500">Step {step} of 4</p>
        </div>

        {/* Form Steps */}
        <div className="flex justify-center">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8 max-w-2xl mx-auto">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={step === 1}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Previous</span>
          </Button>

          {step < 4 ? (
            <Button
              onClick={nextStep}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          )}
        </div>

        {/* Login link */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/" className="text-purple-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
      <Toaster />
    </div>
  )
}