'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { ArrowLeft, ArrowRight, MapPin, Clock, Users, Gamepad2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const NICHES = [
  'Gaming', 'Fitness', 'Beauty', 'Cooking', 'Music', 'Dance', 'Comedy', 'Education', 
  'Tech', 'Lifestyle', 'Travel', 'Art', 'Fashion', 'Business', 'Sports', 'Pets'
]

const GAMES = [
  'Fortnite', 'League of Legends', 'Valorant', 'Minecraft', 'Call of Duty', 'Apex Legends',
  'Among Us', 'Roblox', 'FIFA', 'Pokémon', 'Just Chatting', 'IRL Streaming', 'Art/Drawing',
  'Music Production', 'Variety Gaming'
]

const PLATFORMS = [
  'TikTok', 'YouTube', 'Instagram', 'Twitch', 'Twitter/X', 'Facebook', 'Snapchat'
]

const TIME_SLOTS = [
  '6:00 AM', '7:00 AM', '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
  '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM', '11:00 PM'
]

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)

  // Form data
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    displayName: '',
    platforms: [],
    niches: [],
    games: [],
    city: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    hasSchedule: true,
    schedule: {},
    bio: ''
  })

  const handlePlatformToggle = (platform) => {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }))
  }

  const handleNicheToggle = (niche) => {
    setFormData(prev => ({
      ...prev,
      niches: prev.niches.includes(niche)
        ? prev.niches.filter(n => n !== niche)
        : [...prev.niches, niche]
    }))
  }

  const handleGameToggle = (game) => {
    setFormData(prev => ({
      ...prev,
      games: prev.games.includes(game)
        ? prev.games.filter(g => g !== game)
        : [...prev.games, game]
    }))
  }

  const handleScheduleToggle = (day, timeSlot) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...prev.schedule,
        [day]: prev.schedule[day]?.includes(timeSlot)
          ? prev.schedule[day].filter(t => t !== timeSlot)
          : [...(prev.schedule[day] || []), timeSlot]
      }
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        localStorage.setItem('token', data.token)
        toast({
          title: "Welcome to Streamer House!",
          description: "Your account has been created successfully."
        })
        router.push('/')
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

  const nextStep = () => setStep(step + 1)
  const prevStep = () => setStep(step - 1)

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-purple-600">Create Account</CardTitle>
          <CardDescription>
            Step {step} of 4 - Set up your creator profile
          </CardDescription>
          <div className="flex justify-center mt-4">
            {[1, 2, 3, 4].map((stepNum) => (
              <div
                key={stepNum}
                className={`w-3 h-3 rounded-full mx-1 ${
                  stepNum <= step ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                  placeholder="How should other creators know you?"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Platforms & Niches
              </h3>
              
              <div className="space-y-3">
                <Label>Which platforms do you create content on?</Label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => (
                    <Badge
                      key={platform}
                      variant={formData.platforms.includes(platform) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handlePlatformToggle(platform)}
                    >
                      {platform}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>What niches do you create content in?</Label>
                <div className="flex flex-wrap gap-2">
                  {NICHES.map((niche) => (
                    <Badge
                      key={niche}
                      variant={formData.niches.includes(niche) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => handleNicheToggle(niche)}
                    >
                      {niche}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Which games do you play/stream? (Gaming creators)</Label>
                <div className="flex flex-wrap gap-2">
                  {GAMES.map((game) => (
                    <Badge
                      key={game}
                      variant={formData.games.includes(game) ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => handleGameToggle(game)}
                    >
                      {game}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <MapPin className="mr-2 h-5 w-5" />
                Location & Schedule
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="city">City/Location (for local collabs)</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({...formData, city: e.target.value})}
                  placeholder="e.g., Los Angeles, CA"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeZone">Time Zone</Label>
                <Select 
                  value={formData.timeZone} 
                  onValueChange={(value) => setFormData({...formData, timeZone: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">GMT</SelectItem>
                    <SelectItem value="Europe/Paris">Central European Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="hasSchedule"
                    checked={formData.hasSchedule}
                    onCheckedChange={(checked) => setFormData({...formData, hasSchedule: checked})}
                  />
                  <Label htmlFor="hasSchedule" className="flex items-center">
                    <Clock className="mr-1 h-4 w-4" />
                    I have a regular streaming/posting schedule
                  </Label>
                </div>
              </div>

              {formData.hasSchedule && (
                <div className="space-y-3">
                  <Label>When do you typically stream/post?</Label>
                  <div className="space-y-2">
                    {DAYS.map((day) => (
                      <div key={day} className="space-y-2">
                        <p className="text-sm font-medium">{day}</p>
                        <div className="flex flex-wrap gap-1">
                          {TIME_SLOTS.map((timeSlot) => (
                            <Badge
                              key={`${day}-${timeSlot}`}
                              variant={formData.schedule[day]?.includes(timeSlot) ? "default" : "outline"}
                              className="cursor-pointer text-xs"
                              onClick={() => handleScheduleToggle(day, timeSlot)}
                            >
                              {timeSlot}
                            </Badge>
                          ))}
                        </div>
                      </div>  
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">About You</h3>
              <div className="space-y-2">
                <Label htmlFor="bio">Tell us about yourself (optional)</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  placeholder="Share a bit about your content, goals, or what makes you unique..."
                  rows={4}
                />
              </div>
              
              {!formData.hasSchedule && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-blue-800">
                    No problem! You'll still be matched with creators based on your niches, 
                    games, and location for flexible collaboration opportunities.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between mt-6">
            {step > 1 && (
              <Button variant="outline" onClick={prevStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
            
            {step < 4 ? (
              <Button onClick={nextStep} className="ml-auto">
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="ml-auto">
                {loading ? "Creating Account..." : "Complete Signup"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      <Toaster />
    </div>
  )
}