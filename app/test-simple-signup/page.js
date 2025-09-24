'use client'

import { useState } from 'react'

export default function SimpleSignupTest() {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const formData = {
      email: 'testsimple@example.com',
      displayName: 'Test Simple User',
      password: 'testsimple123',
      platforms: ['TikTok'],
      niches: ['Gaming'],
      games: [],
      city: 'Los Angeles, CA',
      timeZone: 'America/Los_Angeles',
      hasSchedule: false,
      schedule: {},
      bio: 'Test simple user'
    }
    
    try {
      console.log('Starting signup request...')
      
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      })
      
      console.log('Response received:', response.status, response.statusText)
      
      const responseText = await response.text()
      console.log('Raw response:', responseText)
      
      if (response.ok) {
        try {
          const data = JSON.parse(responseText)
          console.log('Parsed data:', data)
          setResult(`SUCCESS: Account created for ${data.user.email}`)
          
          // Try redirect
          setTimeout(() => {
            window.location.href = '/dashboard'
          }, 1000)
        } catch (parseError) {
          console.error('JSON parse error:', parseError)
          setResult(`PARSE ERROR: ${parseError.message}`)
        }
      } else {
        setResult(`ERROR: ${response.status} - ${responseText}`)
      }
    } catch (error) {
      console.error('Network error:', error)
      setResult(`NETWORK ERROR: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-center mb-6">Simple Signup Test</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-600">
            This will attempt to create an account with predefined data.
          </p>
          
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Creating Account...' : 'Test Signup'}
          </button>
        </form>
        
        {result && (
          <div className="mt-4 p-4 bg-gray-100 rounded text-sm">
            <strong>Result:</strong><br/>
            {result}
          </div>
        )}
        
        <div className="mt-4 text-center">
          <a href="/" className="text-blue-600 hover:underline">
            Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}