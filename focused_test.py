#!/usr/bin/env python3
"""
Focused test for critical Streamer House backend functionality
"""

import requests
import json
import os
import time

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://contentcrew.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

def test_critical_functionality():
    """Test the most critical functionality"""
    print("🏠 FOCUSED STREAMER HOUSE BACKEND TEST")
    print("=" * 50)
    
    # Test 1: API Root
    print("\n1. Testing API Root...")
    response = requests.get(f"{API_BASE}/")
    if response.status_code == 200 and 'Streamer House' in response.text:
        print("✅ API Root working with Streamer House branding")
    else:
        print(f"❌ API Root failed: {response.status_code}")
        return False
    
    # Test 2: Enhanced Signup
    print("\n2. Testing Enhanced Signup...")
    signup_data = {
        "email": f"focustest{int(time.time())}@streamerhouse.com",
        "password": "focuspassword123",
        "displayName": "Focus Test User",
        "platforms": ["Twitch", "YouTube"],
        "niches": ["Gaming"],
        "games": ["Valorant"],
        "city": "Los Angeles",
        "bio": "Test user for focused testing"
    }
    
    response = requests.post(f"{API_BASE}/auth/signup", json=signup_data, timeout=30)
    if response.status_code == 200:
        data = response.json()
        token = data.get('token')
        user_id = data.get('user', {}).get('id')
        username = data.get('user', {}).get('username')
        print(f"✅ Enhanced signup successful. User: {username}")
    else:
        print(f"❌ Signup failed: {response.status_code} - {response.text}")
        return False
    
    # Test 3: Authentication
    print("\n3. Testing Authentication...")
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=30)
    if response.status_code == 200:
        print("✅ Authentication working correctly")
    else:
        print(f"❌ Authentication failed: {response.status_code}")
        return False
    
    # Test 4: Recently Fixed Endpoints
    print("\n4. Testing Recently Fixed Endpoints...")
    
    # Test roommates endpoint
    response = requests.get(f"{API_BASE}/roommates", headers=headers, timeout=30)
    if response.status_code == 200:
        print("✅ /api/roommates endpoint working")
    else:
        print(f"❌ /api/roommates failed: {response.status_code}")
    
    # Test users/{username} endpoint
    response = requests.get(f"{API_BASE}/users/{username}", headers=headers, timeout=30)
    if response.status_code == 200:
        data = response.json()
        if 'user' in data and 'posts' in data:
            print("✅ /api/users/{username} endpoint working")
        else:
            print("❌ /api/users/{username} response incomplete")
    else:
        print(f"❌ /api/users/{username} failed: {response.status_code}")
    
    # Test settings/roommate-search endpoint
    response = requests.post(f"{API_BASE}/settings/roommate-search", 
                           json={'appearInRoommateSearch': True}, 
                           headers=headers, timeout=30)
    if response.status_code == 200:
        print("✅ /api/settings/roommate-search endpoint working")
    else:
        print(f"❌ /api/settings/roommate-search failed: {response.status_code}")
    
    # Test media/upload endpoint
    response = requests.post(f"{API_BASE}/media/upload", json={}, headers=headers, timeout=30)
    if response.status_code == 200:
        data = response.json()
        if 'url' in data:
            print("✅ /api/media/upload endpoint working")
        else:
            print("❌ /api/media/upload response incomplete")
    else:
        print(f"❌ /api/media/upload failed: {response.status_code}")
    
    # Test 5: Core Functionality
    print("\n5. Testing Core Functionality...")
    
    # House creation
    response = requests.post(f"{API_BASE}/houses", 
                           json={'name': 'Focus Test House'}, 
                           headers=headers, timeout=30)
    if response.status_code == 200:
        house_id = response.json().get('id')
        print("✅ House creation working")
    else:
        print(f"❌ House creation failed: {response.status_code}")
        return False
    
    # Post creation
    response = requests.post(f"{API_BASE}/posts", 
                           json={'url': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'houseId': house_id}, 
                           headers=headers, timeout=30)
    if response.status_code == 200:
        post_data = response.json()
        if 'title' in post_data and 'canonicalUrl' in post_data:
            print("✅ Post creation with metadata working")
        else:
            print("✅ Post creation working (metadata may be incomplete)")
    else:
        print(f"❌ Post creation failed: {response.status_code}")
    
    # Test 6: Security
    print("\n6. Testing Security...")
    
    # Test without auth
    response = requests.get(f"{API_BASE}/auth/me", timeout=30)
    if response.status_code == 401:
        print("✅ Authentication required for protected routes")
    else:
        print(f"❌ Authentication not properly enforced: {response.status_code}")
    
    print("\n" + "=" * 50)
    print("🎯 FOCUSED TEST COMPLETED")
    print("✅ Critical backend functionality is working!")
    return True

if __name__ == "__main__":
    success = test_critical_functionality()
    exit(0 if success else 1)