'use client'

import { useState } from 'react'
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { ArrowLeft, MessageSquare, Bug, Lightbulb, AlertTriangle, Upload } from 'lucide-react'

export default function HelpPage() {
  const [loading, setLoading] = useState(false)
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    type: '',
    title: '',
    description: '',
    email: '',
    screenshotUrl: ''
  })

  const handleScreenshotUpload = async (event) => {
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

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive"
      })
      return
    }

    setUploadingScreenshot(true)

    try {
      const formDataUpload = new FormData()
      formDataUpload.append('screenshot', file)

      const response = await fetch('/api/media/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataUpload
      })

      if (response.ok) {
        const data = await response.json()
        setFormData(prev => ({ ...prev, screenshotUrl: data.url }))
        toast({
          title: "Screenshot uploaded",
          description: "Screenshot has been attached to your report."
        })
      } else {
        const error = await response.json()
        toast({
          title: "Upload failed",
          description: error.error || "Failed to upload screenshot.",
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
      setUploadingScreenshot(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.type || !formData.title || !formData.description) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/bug-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const data = await response.json()
        toast({
          title: "Report submitted",
          description: `Thank you! Your report has been submitted with ID: ${data.ticketId}`
        })
        
        // Reset form
        setFormData({
          type: '',
          title: '',
          description: '',
          email: '',
          screenshotUrl: ''
        })
      } else {
        const error = await response.json()
        toast({
          title: "Submission failed",
          description: error.error || "Failed to submit report.",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Submission failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type) => {
    switch (type) {
      case 'bug':
        return <Bug className="h-4 w-4" />
      case 'feature':
        return <Lightbulb className="h-4 w-4" />
      case 'abuse':
        return <AlertTriangle className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getTypeColor = (type) => {
    switch (type) {
      case 'bug':
        return 'text-red-600'
      case 'feature':
        return 'text-blue-600'
      case 'abuse':
        return 'text-orange-600'
      default:
        return 'text-gray-600'
    }
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
            <h1 className="text-2xl font-bold text-purple-600">Help & Support</h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5" />
              <span>Submit Report</span>
            </CardTitle>
            <CardDescription>
              Report bugs, request features, or report abuse. We'll get back to you soon!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Report Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Report Type *</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">
                      <div className="flex items-center space-x-2">
                        <Bug className="h-4 w-4 text-red-600" />
                        <span>Bug Report</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="feature">
                      <div className="flex items-center space-x-2">
                        <Lightbulb className="h-4 w-4 text-blue-600" />
                        <span>Feature Request</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="abuse">
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                        <span>Report Abuse</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="other">
                      <div className="flex items-center space-x-2">
                        <MessageSquare className="h-4 w-4 text-gray-600" />
                        <span>Other</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Brief description of the issue or request"
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide detailed information about the issue, steps to reproduce, or feature request details"
                  rows={5}
                  required
                />
              </div>

              {/* Email (optional) */}
              <div className="space-y-2">
                <Label htmlFor="email">Contact Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Leave blank to use your account email"
                />
              </div>

              {/* Screenshot Upload */}
              <div className="space-y-2">
                <Label htmlFor="screenshot">Screenshot (optional)</Label>
                <div className="flex items-center space-x-4">
                  <Label htmlFor="screenshot-upload" className="cursor-pointer">
                    <Button variant="outline" disabled={uploadingScreenshot} asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadingScreenshot ? "Uploading..." : "Upload Screenshot"}
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="screenshot-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleScreenshotUpload}
                    className="hidden"
                  />
                  {formData.screenshotUrl && (
                    <span className="text-sm text-green-600">✓ Screenshot attached</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, GIF up to 10MB. Screenshots help us understand the issue better.
                </p>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={loading || !formData.type || !formData.title || !formData.description}
                className="w-full"
              >
                {loading ? "Submitting..." : "Submit Report"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Help Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Need Quick Help?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <Bug className="h-8 w-8 mx-auto mb-2 text-red-600" />
                <h3 className="font-medium mb-1">Bug Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Something not working? Let us know!
                </p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <h3 className="font-medium mb-1">Feature Requests</h3>
                <p className="text-sm text-muted-foreground">
                  Have an idea? We'd love to hear it!
                </p>
              </div>
              
              <div className="text-center p-4 border rounded-lg">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <h3 className="font-medium mb-1">Report Abuse</h3>
                <p className="text-sm text-muted-foreground">
                  Keep our community safe.
                </p>
              </div>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-medium mb-2">Tips for Better Reports:</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Be specific about what you were trying to do</li>
                <li>• Include steps to reproduce the issue</li>
                <li>• Attach screenshots when possible</li>
                <li>• Mention which browser/device you're using</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
      <Toaster />
    </div>
  )
}