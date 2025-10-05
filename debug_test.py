#!/usr/bin/env python3
"""
Debug test to check specific API endpoints
"""

import requests
import json
import os

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://api-dynamic-fix.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

def test_auth_endpoints():
    """Test authentication endpoints"""
    print("Testing authentication endpoints...")
    
    # Test without auth
    response = requests.get(f"{API_BASE}/auth/me")
    print(f"GET /auth/me without auth: {response.status_code} - {response.text}")
    
    # Test signup
    signup_data = {
        "email": "debugtest@streamerhouse.com",
        "password": "debugpassword123",
        "displayName": "Debug Test User"
    }
    
    response = requests.post(f"{API_BASE}/auth/signup", json=signup_data)
    print(f"POST /auth/signup: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        token = data.get('token')
        print(f"Token received: {token[:20]}..." if token else "No token")
        
        # Test with auth
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.get(f"{API_BASE}/auth/me", headers=headers)
        print(f"GET /auth/me with auth: {response.status_code}")
        
        # Test protected endpoint
        response = requests.post(f"{API_BASE}/houses", json={"name": "Test House"}, headers=headers)
        print(f"POST /houses with auth: {response.status_code}")
        
        # Test protected endpoint without auth
        response = requests.post(f"{API_BASE}/houses", json={"name": "Test House"})
        print(f"POST /houses without auth: {response.status_code}")
        
    else:
        print(f"Signup failed: {response.text}")

def test_media_upload():
    """Test media upload endpoint"""
    print("\nTesting media upload...")
    
    # First get auth token
    signup_data = {
        "email": "mediatest@streamerhouse.com",
        "password": "mediapassword123",
        "displayName": "Media Test User"
    }
    
    response = requests.post(f"{API_BASE}/auth/signup", json=signup_data)
    if response.status_code == 200:
        token = response.json().get('token')
        headers = {'Authorization': f'Bearer {token}'}
        
        # Test media upload
        response = requests.post(f"{API_BASE}/media/upload", json={}, headers=headers)
        print(f"POST /media/upload: {response.status_code} - {response.text}")
    else:
        print(f"Could not get auth token: {response.status_code}")

if __name__ == "__main__":
    test_auth_endpoints()
    test_media_upload()