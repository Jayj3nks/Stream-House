'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { Shield, User, Mail, Key, ArrowLeft, Upload, Camera } from 'lucide-react'

export default function SettingsPage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const { toast } = useToast()

  // Profile picture upload
  const [uploadingPicture, setUploadingPicture] = useState(false)

  // Roommate search opt-in toggle
  const [appearInRoommateSearch, setAppearInRoommateSearch] = useState(false)

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    emailCode: ''
  })
  const [passwordStep, setPasswordStep] = useState(1) // 1: current password, 2: email verification, 3: new password

  // Username change form
  const [usernameForm, setUsernameForm] = useState({
    newUsername: '',
    password: ''
  })

  // Email change form
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: '',
    confirmationCode: ''
  })
  const [emailStep, setEmailStep] = useState(1) // 1: new email + password, 2: confirmation code

  useEffect(() => {
    // Handle hash routing
    const hash = window.location.hash.slice(1)
    if (['profile', 'account', 'security', 'privacy'].includes(hash)) {
      setActiveTab(hash)
    }

    loadUserData()
  }, [])

  // Update URL hash when tab changes
  useEffect(() => {
    window.location.hash = activeTab
  }, [activeTab])

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        window.location.href = '/?next=/settings'
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
        setUsernameForm({ ...usernameForm, newUsername: userData.displayName })
        setEmailForm({ ...emailForm, newEmail: userData.email })
        setAppearInRoommateSearch(userData.roommateSearchVisible || false)
      } else if (response.status === 401) {
        // Redirect to login with next parameter
        window.location.href = '/login?next=/settings'
      } else {
        toast({
          title: "Error",
          description: "Failed to load user data.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('Error loading user data:', error)
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleProfilePictureUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive"
      })
      return
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 2MB.",
        variant: "destructive"
      })
      return
    }

    setUploadingPicture(true)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setUser(prev => ({ ...prev, avatarUrl: data.url }))
        toast({
          title: "Profile picture updated",
          description: "Your new profile picture has been saved."
        })
      } else {
        const error = await response.json()
        toast({
          title: "Upload failed",
          description: error.error || "Failed to upload profile picture.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setUploadingPicture(false)
    }
  }

  const updateRoommateSearchSetting = async (enabled) => {
    setLoading(true)
    try {
      const response = await fetch('/api/settings/roommate-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ appearInRoommateSearch: enabled })
      })

      if (response.ok) {
        setAppearInRoommateSearch(enabled)
        setUser(prev => ({ ...prev, roommateSearchVisible: enabled }))
        toast({
          title: "Settings updated",
          description: enabled ? "You'll now appear in roommate search." : "You're now hidden from roommate search."
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to update setting.",
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

  const handlePasswordChange = async (step) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      let endpoint = ''
      let body = {}

      if (step === 1) {
        // Verify current password and send email code
        endpoint = '/api/settings/password/verify'
        body = { currentPassword: passwordForm.currentPassword }
      } else if (step === 2) {
        // Verify email code
        endpoint = '/api/settings/password/verify-code'
        body = { emailCode: passwordForm.emailCode }
      } else if (step === 3) {
        // Change password
        endpoint = '/api/settings/password/change'
        body = { 
          newPassword: passwordForm.newPassword,
          emailCode: passwordForm.emailCode
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok) {
        if (step === 1) {
          setPasswordStep(2)
          toast({
            title: "Verification code sent",
            description: "Check your email for the security code."
          })
        } else if (step === 2) {
          setPasswordStep(3)
          toast({
            title: "Code verified",
            description: "Now enter your new password."
          })
        } else if (step === 3) {
          setPasswordForm({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            emailCode: ''
          })
          setPasswordStep(1)
          toast({
            title: "Password changed successfully",
            description: "Your password has been updated."
          })
        }
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

  const handleUsernameChange = async () => {
    if (!usernameForm.newUsername.trim() || !usernameForm.password) {
      toast({
        title: "Error",
        description: "Please fill in all fields.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const response = await fetch('/api/settings/username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          newUsername: usernameForm.newUsername,
          password: usernameForm.password
        })
      })

      const data = await response.json()

      if (response.ok) {
        setUser(prev => ({ ...prev, displayName: data.displayName, username: data.username }))
        setUsernameForm({ ...usernameForm, password: '' })
        toast({
          title: "Username updated",
          description: "Your display name has been changed successfully."
        })
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

  const handleEmailChange = async (step) => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      let endpoint = ''
      let body = {}

      if (step === 1) {
        // Send confirmation code to new email
        endpoint = '/api/settings/email/send-code'
        body = {
          newEmail: emailForm.newEmail,
          password: emailForm.password
        }
      } else if (step === 2) {
        // Confirm email change
        endpoint = '/api/settings/email/confirm'
        body = {
          newEmail: emailForm.newEmail,
          confirmationCode: emailForm.confirmationCode
        }
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })

      const data = await response.json()

      if (response.ok) {
        if (step === 1) {
          setEmailStep(2)
          toast({
            title: "Confirmation code sent",
            description: `Check ${emailForm.newEmail} for the confirmation code.`
          })
        } else if (step === 2) {
          setUser(prev => ({ ...prev, email: emailForm.newEmail }))
          setEmailForm({
            newEmail: emailForm.newEmail,
            password: '',
            confirmationCode: ''
          })
          setEmailStep(1)
          toast({
            title: "Email updated successfully",
            description: "Your email address has been changed."
          })
        }
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p>Loading settings...</p>
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
            <h1 className="text-2xl font-bold text-purple-600">Account Settings</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="privacy">Privacy</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Profile Picture */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Camera className="h-5 w-5" />
                  <span>Profile Picture</span>
                </CardTitle>
                <CardDescription>
                  Update your profile picture (max 2MB, PNG/JPEG/WebP)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-4">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback className="text-2xl">
                      {user.displayName?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <Button disabled={uploadingPicture} asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploadingPicture ? "Uploading..." : "Upload New Picture"}
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="avatar-upload"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleProfilePictureUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground">
                      PNG, JPEG, WebP up to 2MB
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Display Name */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Display Name</span>
                </CardTitle>
                <CardDescription>
                  Change how other creators see your name
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newUsername">New Display Name</Label>
                  <Input
                    id="newUsername"
                    value={usernameForm.newUsername}
                    onChange={(e) => setUsernameForm({...usernameForm, newUsername: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usernamePassword">Confirm with Password</Label>
                  <Input
                    id="usernamePassword"
                    type="password"
                    value={usernameForm.password}
                    onChange={(e) => setUsernameForm({...usernameForm, password: e.target.value})}
                  />
                </div>
                <Button 
                  onClick={handleUsernameChange} 
                  disabled={loading || !usernameForm.newUsername.trim() || !usernameForm.password}
                >
                  {loading ? "Updating..." : "Update Display Name"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Mail className="h-5 w-5" />
                  <span>Email Address</span>
                </CardTitle>
                <CardDescription>
                  Update your email address (requires confirmation)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {emailStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentEmail">Current Email</Label>
                      <Input
                        id="currentEmail"
                        value={user.email}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newEmail">New Email Address</Label>
                      <Input
                        id="newEmail"
                        type="email"
                        value={emailForm.newEmail}
                        onChange={(e) => setEmailForm({...emailForm, newEmail: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emailPassword">Confirm with Password</Label>
                      <Input
                        id="emailPassword"
                        type="password"
                        value={emailForm.password}
                        onChange={(e) => setEmailForm({...emailForm, password: e.target.value})}
                      />
                    </div>
                    <Button 
                      onClick={() => handleEmailChange(1)} 
                      disabled={loading || !emailForm.newEmail || !emailForm.password}
                    >
                      {loading ? "Sending..." : "Send Confirmation Code"}
                    </Button>
                  </div>
                )}

                {emailStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="confirmationCode">Confirmation Code</Label>
                      <Input
                        id="confirmationCode"
                        value={emailForm.confirmationCode}
                        onChange={(e) => setEmailForm({...emailForm, confirmationCode: e.target.value})}
                        placeholder="Enter code sent to new email"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => handleEmailChange(2)} 
                        disabled={loading || !emailForm.confirmationCode}
                      >
                        {loading ? "Confirming..." : "Confirm Email Change"}
                      </Button>
                      <Button variant="outline" onClick={() => setEmailStep(1)}>
                        Back
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Change Password</span>
                </CardTitle>
                <CardDescription>
                  Update your password (requires email confirmation)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {passwordStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current Password</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                      />
                    </div>
                    <Button 
                      onClick={() => handlePasswordChange(1)} 
                      disabled={loading || !passwordForm.currentPassword}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      {loading ? "Verifying..." : "Verify & Send Code"}
                    </Button>
                  </div>
                )}

                {passwordStep === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emailCode">Email Verification Code</Label>
                      <Input
                        id="emailCode"
                        value={passwordForm.emailCode}
                        onChange={(e) => setPasswordForm({...passwordForm, emailCode: e.target.value})}
                        placeholder="Enter code from email"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => handlePasswordChange(2)} 
                        disabled={loading || !passwordForm.emailCode}
                      >
                        {loading ? "Verifying..." : "Verify Code"}
                      </Button>
                      <Button variant="outline" onClick={() => setPasswordStep(1)}>
                        Back
                      </Button>
                    </div>
                  </div>
                )}

                {passwordStep === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        onClick={() => handlePasswordChange(3)} 
                        disabled={loading || !passwordForm.newPassword || passwordForm.newPassword !== passwordForm.confirmPassword}
                      >
                        {loading ? "Updating..." : "Update Password"}
                      </Button>
                      <Button variant="outline" onClick={() => setPasswordStep(2)}>
                        Back
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Roommate Search</CardTitle>
                <CardDescription>
                  Control whether you appear in the roommate finder for other creators to discover
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="roommate-search">Appear in roommate search</Label>
                    <p className="text-sm text-muted-foreground">
                      When enabled, other creators can find and invite you to their house
                    </p>
                  </div>
                  <Switch
                    id="roommate-search"
                    checked={appearInRoommateSearch}
                    onCheckedChange={updateRoommateSearchSetting}
                    disabled={loading}
                  />
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