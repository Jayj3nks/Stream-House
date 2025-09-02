#!/usr/bin/env python3
"""
Debug specific issues found in backend testing
"""

import requests
import json
import os

BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://contentcrew.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

def get_auth_token():
    """Get auth token by logging in"""
    login_data = {
        "email": "testuser@streamerhouse.com",
        "password": "securepassword123"
    }
    
    response = requests.post(f"{API_BASE}/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json()['token']
    else:
        # Try signup if login fails
        signup_data = {
            "email": "debuguser@streamerhouse.com",
            "password": "securepassword123",
            "displayName": "Debug User",
            "platforms": ["Twitch"],
            "niches": ["Gaming"],
            "games": ["Test Game"],
            "city": "Test City",
            "bio": "Debug user"
        }
        
        response = requests.post(f"{API_BASE}/auth/signup", json=signup_data)
        if response.status_code == 200:
            return response.json()['token']
    
    return None

def debug_post_creation():
    """Debug post creation issues"""
    token = get_auth_token()
    if not token:
        print("❌ Could not get auth token")
        return
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Get user info
    user_response = requests.get(f"{API_BASE}/auth/me", headers=headers)
    if user_response.status_code != 200:
        print("❌ Could not get user info")
        return
    
    user = user_response.json()
    print(f"✅ Authenticated as: {user['displayName']} (ID: {user['id']})")
    
    # Get or create house
    house_response = requests.get(f"{API_BASE}/houses/user/{user['id']}", headers=headers)
    
    if house_response.status_code == 200 and house_response.json():
        house = house_response.json()
        print(f"✅ Found existing house: {house['name']} (ID: {house['id']})")
    else:
        # Create house
        house_data = {"name": "Debug Test House"}
        house_response = requests.post(f"{API_BASE}/houses", json=house_data, headers=headers)
        
        if house_response.status_code == 200:
            house = house_response.json()
            print(f"✅ Created new house: {house['name']} (ID: {house['id']})")
        else:
            print(f"❌ Could not create house: {house_response.status_code} - {house_response.json()}")
            return
    
    # Test multiple post creation
    test_urls = [
        "https://example.com/test1",
        "https://www.youtube.com/watch?v=test123",
        "https://httpbin.org/json"
    ]
    
    posts_created = []
    
    for i, url in enumerate(test_urls):
        post_data = {
            "url": url,
            "houseId": house['id']
        }
        
        print(f"\n🔍 Testing post creation {i+1}: {url}")
        response = requests.post(f"{API_BASE}/posts", json=post_data, headers=headers)
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            post = response.json()
            posts_created.append(post)
            print(f"   ✅ Post created: {post['id']}")
            print(f"   Title: {post.get('title', 'N/A')}")
            print(f"   Canonical URL: {post.get('canonicalUrl', 'N/A')}")
        else:
            error = response.json() if response.content else {}
            print(f"   ❌ Failed: {error}")
    
    print(f"\n📊 Successfully created {len(posts_created)} posts")
    
    # Test engage redirect if we have posts
    if len(posts_created) >= 2:
        test_post = posts_created[1]  # Use second post
        print(f"\n🔍 Testing engage redirect for post: {test_post['id']}")
        
        engage_url = f"{API_BASE}/r/{test_post['id']}?u={user['id']}"
        print(f"   Engage URL: {engage_url}")
        
        response = requests.get(engage_url, allow_redirects=False)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 302:
            print(f"   ✅ Redirect working to: {response.headers.get('Location', 'N/A')}")
        elif response.status_code == 200:
            print(f"   ✅ Engage processed successfully")
        else:
            error = response.json() if response.content else {}
            print(f"   ❌ Engage failed: {error}")
    
    # Test clip creation
    if len(posts_created) >= 1:
        test_post = posts_created[0]
        print(f"\n🔍 Testing clip creation for post: {test_post['id']}")
        
        clip_data = {
            "postId": test_post['id'],
            "clipUrl": "https://clips.twitch.tv/debug-clip"
        }
        
        response = requests.post(f"{API_BASE}/clips", json=clip_data, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            clip = response.json()
            print(f"   ✅ Clip created: {clip}")
        elif response.status_code == 400:
            error = response.json()
            print(f"   ✅ Clip creation properly blocked: {error['error']}")
        else:
            error = response.json() if response.content else {}
            print(f"   ❌ Unexpected clip response: {error}")

if __name__ == "__main__":
    print("🔍 Debug Testing Streamer House Backend Issues")
    print("=" * 50)
    debug_post_creation()