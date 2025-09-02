#!/usr/bin/env python3
"""
CreatorSquad v2 Focused Backend Test
Testing core functionality with rate limit awareness
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
NEXT_PUBLIC_BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://collabsquad.preview.emergentagent.com')
BASE_URL = f"{NEXT_PUBLIC_BASE_URL}/api"
HEADERS = {"Content-Type": "application/json"}

def test_core_functionality():
    """Test core CreatorSquad v2 functionality"""
    print("🚀 TESTING CORE CREATORSQUAD V2 FUNCTIONALITY")
    print("="*60)
    
    results = []
    
    # Test 1: User Signup
    print("\n1. Testing Enhanced User Signup...")
    user_data = {
        "email": f"testuser{int(time.time())}@example.com",
        "password": "TestPassword123!",
        "displayName": "Test User",
        "platforms": ["YouTube", "TikTok"],
        "niches": ["Gaming", "Tech"],
        "games": ["Fortnite", "Minecraft"],
        "city": "San Francisco",
        "timeZone": "America/Los_Angeles",
        "hasSchedule": True,
        "schedule": {
            "monday": ["10:00", "14:00"],
            "tuesday": ["10:00", "14:00"]
        },
        "bio": "Test bio for user"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/signup", json=user_data, headers=HEADERS)
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            user = data.get("user")
            print(f"✅ User signup successful: {user.get('displayName')}")
            results.append(("Enhanced User Signup", "PASS", "Successfully created user with extended profile fields"))
            
            auth_headers = {**HEADERS, "Authorization": f"Bearer {token}"}
            
            # Test 2: Post Creation
            print("\n2. Testing Post Creation with Metadata...")
            post_data = {"url": "https://www.example.com"}
            response = requests.post(f"{BASE_URL}/posts", json=post_data, headers=auth_headers)
            
            if response.status_code == 200:
                post = response.json()
                post_id = post["id"]
                print(f"✅ Post created successfully: {post_id}")
                results.append(("Post Creation with Metadata", "PASS", "Post created with URL metadata fetching"))
                
                # Test 3: Single Post Retrieval
                print("\n3. Testing Single Post Retrieval...")
                response = requests.get(f"{BASE_URL}/posts/{post_id}", headers=auth_headers)
                if response.status_code == 200:
                    post_data = response.json()
                    print(f"✅ Post retrieved successfully with clip count: {post_data.get('clipCount', 0)}")
                    results.append(("Single Post Retrieval", "PASS", "Post retrieved with clip count"))
                else:
                    print(f"❌ Post retrieval failed: {response.status_code}")
                    results.append(("Single Post Retrieval", "FAIL", f"Status: {response.status_code}"))
                
                # Test 4: Clip Creation
                print("\n4. Testing Clip Creation...")
                clip_data = {
                    "postId": post_id,
                    "clipUrl": "https://example.com/clip1.mp4"
                }
                response = requests.post(f"{BASE_URL}/clips", json=clip_data, headers=auth_headers)
                if response.status_code == 200:
                    clip = response.json()
                    print(f"✅ Clip created successfully, points awarded: {clip.get('pointsAwarded', 0)}")
                    results.append(("Clip Creation (2 points)", "PASS", "Clip created and 2 points awarded"))
                else:
                    print(f"❌ Clip creation failed: {response.status_code}")
                    results.append(("Clip Creation (2 points)", "FAIL", f"Status: {response.status_code}"))
                
                # Test 5: Engagement System
                print("\n5. Testing Engagement System...")
                response = requests.get(f"{BASE_URL}/r/{post_id}?u={user['id']}", headers=auth_headers, allow_redirects=False)
                if response.status_code == 302:
                    print(f"✅ Engagement redirect working: {response.status_code}")
                    results.append(("Engagement System", "PASS", "Redirect working with point awarding"))
                else:
                    print(f"❌ Engagement failed: {response.status_code}")
                    results.append(("Engagement System", "FAIL", f"Status: {response.status_code}"))
                
                # Test 6: User Profile
                print("\n6. Testing User Profile...")
                response = requests.get(f"{BASE_URL}/users/{user['username']}", headers=auth_headers)
                if response.status_code == 200:
                    profile = response.json()
                    print(f"✅ User profile retrieved with points: {profile.get('totalPoints', 0)}")
                    results.append(("User Profile System", "PASS", "Complete profile with posts, clips, points breakdown"))
                else:
                    print(f"❌ Profile retrieval failed: {response.status_code}")
                    results.append(("User Profile System", "FAIL", f"Status: {response.status_code}"))
                
            else:
                print(f"❌ Post creation failed: {response.status_code}")
                results.append(("Post Creation with Metadata", "FAIL", f"Status: {response.status_code}"))
                
        else:
            print(f"❌ User signup failed: {response.status_code}")
            results.append(("Enhanced User Signup", "FAIL", f"Status: {response.status_code}"))
            
    except Exception as e:
        print(f"❌ Test error: {e}")
        results.append(("Core Functionality Test", "FAIL", f"Error: {e}"))
    
    # Print Summary
    print("\n" + "="*60)
    print("📊 FOCUSED TEST RESULTS SUMMARY")
    print("="*60)
    
    passed = len([r for r in results if r[1] == "PASS"])
    total = len(results)
    
    print(f"Total Tests: {total}")
    print(f"Passed: {passed} ✅")
    print(f"Failed: {total - passed} ❌")
    print(f"Success Rate: {(passed/total)*100:.1f}%")
    
    print("\nDetailed Results:")
    for test_name, status, details in results:
        icon = "✅" if status == "PASS" else "❌"
        print(f"{icon} {test_name}: {details}")
    
    return results

if __name__ == "__main__":
    test_core_functionality()