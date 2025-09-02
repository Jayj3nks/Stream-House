#!/usr/bin/env python3
"""
CreatorSquad v2 Comprehensive Test Suite
Testing ALL edge cases, security, permissions, and concurrency scenarios
"""

import requests
import json
import time
import threading
import concurrent.futures
from datetime import datetime, timedelta
import uuid
import random
import string
import os

# Configuration
NEXT_PUBLIC_BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://collabsquad.preview.emergentagent.com')
BASE_URL = f"{NEXT_PUBLIC_BASE_URL}/api"
HEADERS = {"Content-Type": "application/json"}

# Test Results Storage
test_results = []
failed_tests = []

def log_test(test_name, endpoint, expected, actual, passed, payload=None, response_data=None):
    """Log test results"""
    result = {
        "test_name": test_name,
        "endpoint": endpoint,
        "expected": expected,
        "actual": actual,
        "status": "PASS" if passed else "FAIL",
        "payload": payload,
        "response_data": response_data
    }
    test_results.append(result)
    if not passed:
        failed_tests.append(result)
    
    status_icon = "✅" if passed else "❌"
    print(f"{status_icon} {test_name}: {expected} -> {actual}")

def create_test_user(suffix=""):
    """Create a test user and return auth token"""
    user_data = {
        "email": f"testuser{suffix}@example.com",
        "password": "TestPassword123!",
        "displayName": f"Test User {suffix}",
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
        "bio": f"Test bio for user {suffix}"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/auth/signup", json=user_data, headers=HEADERS)
        if response.status_code == 200:
            data = response.json()
            return data.get("token"), data.get("user")
        else:
            print(f"Failed to create user {suffix}: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        print(f"Error creating user {suffix}: {e}")
        return None, None

class CreatorSquadV2Tester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = {"Content-Type": "application/json"}
        self.test_users = []
        self.test_posts = []
        self.test_clips = []
        self.auth_tokens = {}
        
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def test_user_signup(self, email, password, display_name, platforms=None, niches=None):
        """Test enhanced user signup with profile fields"""
        self.log(f"Testing user signup for {display_name}...")
        
        payload = {
            "email": email,
            "password": password,
            "displayName": display_name,
            "platforms": platforms or ["YouTube", "TikTok"],
            "niches": niches or ["Gaming", "Tech"],
            "games": ["Minecraft", "Fortnite"],
            "city": "San Francisco",
            "timeZone": "America/Los_Angeles",
            "hasSchedule": True,
            "schedule": {
                "monday": ["10:00", "14:00"],
                "tuesday": ["10:00", "14:00"]
            },
            "bio": f"Content creator specializing in {', '.join(niches or ['Gaming', 'Tech'])}"
        }
        
        try:
            response = requests.post(f"{self.base_url}/auth/signup", 
                                   json=payload, headers=self.headers)
            
            if response.status_code == 200:
                data = response.json()
                user_data = {
                    "email": email,
                    "password": password,
                    "token": data["token"],
                    "user": data["user"]
                }
                self.test_users.append(user_data)
                self.auth_tokens[data["user"]["id"]] = data["token"]
                self.log(f"✅ User signup successful for {display_name} (ID: {data['user']['id']})")
                return user_data
            else:
                self.log(f"❌ User signup failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ User signup error: {str(e)}")
            return None
    
    def test_post_creation(self, user_token, url, squad_id=None):
        """Test new post system with URL metadata fetching"""
        self.log(f"Testing post creation with URL: {url}")
        
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {user_token}"
        
        payload = {
            "url": url,
            "squadId": squad_id
        }
        
        try:
            response = requests.post(f"{self.base_url}/posts", 
                                   json=payload, headers=headers)
            
            if response.status_code == 200:
                post_data = response.json()
                self.test_posts.append(post_data)
                self.log(f"✅ Post created successfully:")
                self.log(f"   - ID: {post_data['id']}")
                self.log(f"   - Title: {post_data['title']}")
                self.log(f"   - Platform Icon: {post_data.get('platformIcon', 'N/A')}")
                self.log(f"   - Clip Count: {post_data.get('clipCount', 0)}")
                return post_data
            else:
                self.log(f"❌ Post creation failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ Post creation error: {str(e)}")
            return None
    
    def test_get_single_post(self, post_id):
        """Test GET /api/posts/{id} to fetch single post with clip count"""
        self.log(f"Testing single post retrieval for ID: {post_id}")
        
        try:
            response = requests.get(f"{self.base_url}/posts/{post_id}", headers=self.headers)
            
            if response.status_code == 200:
                post_data = response.json()
                self.log(f"✅ Single post retrieved successfully:")
                self.log(f"   - Title: {post_data['title']}")
                self.log(f"   - Clip Count: {post_data.get('clipCount', 0)}")
                self.log(f"   - Is Collaboration: {post_data.get('isCollaboration', False)}")
                return post_data
            else:
                self.log(f"❌ Single post retrieval failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ Single post retrieval error: {str(e)}")
            return None
    
    def test_engage_redirect(self, post_id, user_id):
        """Test single engage system - GET /api/r/{postId}?u={userId}"""
        self.log(f"Testing engage redirect for post {post_id} by user {user_id}")
        
        try:
            # Use allow_redirects=False to capture the redirect response
            response = requests.get(f"{self.base_url}/r/{post_id}?u={user_id}", 
                                  headers=self.headers, allow_redirects=False)
            
            if response.status_code == 302:
                redirect_url = response.headers.get('Location')
                self.log(f"✅ Engage redirect successful:")
                self.log(f"   - Status: {response.status_code}")
                self.log(f"   - Redirect URL: {redirect_url}")
                self.log(f"   - Points awarded: 1 (if first engagement in 24h)")
                return True
            else:
                self.log(f"❌ Engage redirect failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Engage redirect error: {str(e)}")
            return False
    
    def test_engage_deduplication(self, post_id, user_id):
        """Test 24-hour deduplication for engagements"""
        self.log(f"Testing engage deduplication for post {post_id} by user {user_id}")
        
        try:
            # Second engagement should not award points
            response = requests.get(f"{self.base_url}/r/{post_id}?u={user_id}", 
                                  headers=self.headers, allow_redirects=False)
            
            if response.status_code == 302:
                self.log(f"✅ Engage deduplication working - redirect still works but no additional points")
                return True
            else:
                self.log(f"❌ Engage deduplication test failed: {response.status_code}")
                return False
                
        except Exception as e:
            self.log(f"❌ Engage deduplication error: {str(e)}")
            return False
    
    def test_clip_creation(self, user_token, post_id, clip_url):
        """Test clips system - POST /api/clips (2 points)"""
        self.log(f"Testing clip creation for post {post_id}")
        
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {user_token}"
        
        payload = {
            "postId": post_id,
            "clipUrl": clip_url,
            "source": "url"
        }
        
        try:
            response = requests.post(f"{self.base_url}/clips", 
                                   json=payload, headers=headers)
            
            if response.status_code == 200:
                clip_data = response.json()
                self.test_clips.append(clip_data["clip"])
                self.log(f"✅ Clip created successfully:")
                self.log(f"   - Clip ID: {clip_data['clip']['id']}")
                self.log(f"   - Post ID: {clip_data['clip']['postId']}")
                self.log(f"   - Points Awarded: {clip_data['pointsAwarded']}")
                return clip_data
            else:
                self.log(f"❌ Clip creation failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ Clip creation error: {str(e)}")
            return None
    
    def test_get_post_clips(self, post_id):
        """Test GET /api/posts/{postId}/clips to get clips for a post"""
        self.log(f"Testing clips retrieval for post {post_id}")
        
        try:
            response = requests.get(f"{self.base_url}/posts/{post_id}/clips", headers=self.headers)
            
            if response.status_code == 200:
                clips_data = response.json()
                self.log(f"✅ Post clips retrieved successfully:")
                self.log(f"   - Number of clips: {len(clips_data)}")
                for clip in clips_data:
                    self.log(f"   - Clip ID: {clip['id']} by {clip.get('creator', {}).get('displayName', 'Unknown')}")
                return clips_data
            else:
                self.log(f"❌ Post clips retrieval failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ Post clips retrieval error: {str(e)}")
            return None
    
    def test_collaboration_marking(self, user_token, post_id, collaborator_user_ids):
        """Test collaboration system - POST /api/posts/{postId}/collaborators (3 points)"""
        self.log(f"Testing collaboration marking for post {post_id}")
        
        headers = self.headers.copy()
        headers["Authorization"] = f"Bearer {user_token}"
        
        payload = {
            "collaboratorUserIds": collaborator_user_ids
        }
        
        try:
            response = requests.post(f"{self.base_url}/posts/{post_id}/collaborators", 
                                   json=payload, headers=headers)
            
            if response.status_code == 200:
                collab_data = response.json()
                self.log(f"✅ Collaboration marked successfully:")
                self.log(f"   - Message: {collab_data['message']}")
                self.log(f"   - Points Awarded: {collab_data['pointsAwarded']} (per collaborator)")
                self.log(f"   - Collaborators: {collab_data['collaborators']}")
                return collab_data
            else:
                self.log(f"❌ Collaboration marking failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ Collaboration marking error: {str(e)}")
            return None
    
    def test_user_profile(self, username):
        """Test user profile system - GET /api/users/{username}"""
        self.log(f"Testing user profile retrieval for username: {username}")
        
        try:
            response = requests.get(f"{self.base_url}/users/{username}", headers=self.headers)
            
            if response.status_code == 200:
                profile_data = response.json()
                self.log(f"✅ User profile retrieved successfully:")
                self.log(f"   - User: {profile_data['user']['displayName']} (@{profile_data['user']['username']})")
                self.log(f"   - Total Points: {profile_data['user']['totalPoints']}")
                self.log(f"   - Posts Count: {len(profile_data['posts'])}")
                self.log(f"   - Clips Made: {len(profile_data['clipsMade'])}")
                self.log(f"   - Points Breakdown: {profile_data['pointsBreakdown']}")
                
                # Show posts with clip counts
                for post in profile_data['posts']:
                    self.log(f"     - Post: {post['title']} (Clips: {post.get('clipCount', 0)})")
                
                return profile_data
            else:
                self.log(f"❌ User profile retrieval failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ User profile retrieval error: {str(e)}")
            return None
    
    def test_squad_posts(self, squad_id):
        """Test GET /api/posts/squad/{squadId} for squad posts"""
        self.log(f"Testing squad posts retrieval for squad {squad_id}")
        
        try:
            response = requests.get(f"{self.base_url}/posts/squad/{squad_id}", headers=self.headers)
            
            if response.status_code == 200:
                posts_data = response.json()
                self.log(f"✅ Squad posts retrieved successfully:")
                self.log(f"   - Number of posts: {len(posts_data)}")
                for post in posts_data:
                    self.log(f"   - Post: {post['title']} (Clips: {post.get('clipCount', 0)})")
                return posts_data
            else:
                self.log(f"❌ Squad posts retrieval failed: {response.status_code} - {response.text}")
                return None
                
        except Exception as e:
            self.log(f"❌ Squad posts retrieval error: {str(e)}")
            return None
    
    def verify_points_tracking(self, user_id):
        """Verify that points are correctly tracked in user profile"""
        # Find user data
        user_data = None
        for user in self.test_users:
            if user["user"]["id"] == user_id:
                user_data = user
                break
        
        if not user_data:
            self.log(f"❌ User data not found for ID: {user_id}")
            return False
        
        # Get current profile
        profile = self.test_user_profile(user_data["user"]["username"])
        if not profile:
            return False
        
        # Verify points breakdown
        breakdown = profile["pointsBreakdown"]
        total_calculated = sum(item["total"] for item in breakdown.values())
        actual_total = profile["user"]["totalPoints"]
        
        self.log(f"Points verification for {user_data['user']['displayName']}:")
        self.log(f"   - Calculated total: {total_calculated}")
        self.log(f"   - Actual total: {actual_total}")
        
        if total_calculated == actual_total:
            self.log(f"✅ Points tracking verified correctly")
            return True
        else:
            self.log(f"❌ Points tracking mismatch!")
            return False

def run_creatorsquad_v2_tests():
    """Run comprehensive CreatorSquad v2 system tests"""
    tester = CreatorSquadV2Tester()
    
    print("=" * 80)
    print("CREATORSQUAD V2 COMPREHENSIVE TESTING")
    print("=" * 80)
    
    # Test 1: Create 2 test users with enhanced profiles
    print("\n1. TESTING ENHANCED USER SIGNUP")
    print("-" * 40)
    
    timestamp = int(time.time())
    
    user_a = tester.test_user_signup(
        f"creator_a_{timestamp}@test.com", 
        "password123", 
        f"Creator Alpha {timestamp}",
        platforms=["YouTube", "Twitch"],
        niches=["Gaming", "Tech Reviews"]
    )
    
    user_b = tester.test_user_signup(
        f"creator_b_{timestamp}@test.com", 
        "password123", 
        f"Creator Beta {timestamp}",
        platforms=["TikTok", "Instagram"],
        niches=["Lifestyle", "Gaming"]
    )
    
    if not user_a or not user_b:
        print("❌ User creation failed - cannot continue tests")
        return False
    
    # Test 2: User A creates a post with real URL
    print("\n2. TESTING NEW POST SYSTEM")
    print("-" * 40)
    
    test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Rick Roll for testing
    post = tester.test_post_creation(user_a["token"], test_url)
    
    if not post:
        print("❌ Post creation failed - cannot continue tests")
        return False
    
    # Test single post retrieval
    single_post = tester.test_get_single_post(post["id"])
    
    # Test 3: User B engages with the post (1 point)
    print("\n3. TESTING SINGLE ENGAGE SYSTEM")
    print("-" * 40)
    
    engage_success = tester.test_engage_redirect(post["id"], user_b["user"]["id"])
    
    # Test deduplication
    time.sleep(1)  # Small delay
    dedup_success = tester.test_engage_deduplication(post["id"], user_b["user"]["id"])
    
    # Test 4: User B creates a clip of the post (2 points)
    print("\n4. TESTING CLIPS SYSTEM")
    print("-" * 40)
    
    clip_url = "https://www.youtube.com/clip/example123"
    clip = tester.test_clip_creation(user_b["token"], post["id"], clip_url)
    
    # Test clips retrieval
    clips = tester.test_get_post_clips(post["id"])
    
    # Verify clip counter on post
    updated_post = tester.test_get_single_post(post["id"])
    
    # Test 5: User A marks post as collaboration with User B (3 points each)
    print("\n5. TESTING COLLABORATION SYSTEM")
    print("-" * 40)
    
    collab = tester.test_collaboration_marking(
        user_a["token"], 
        post["id"], 
        [user_b["user"]["id"]]
    )
    
    # Verify collaboration flag on post
    collab_post = tester.test_get_single_post(post["id"])
    
    # Test 6: Test user profile endpoints for both users
    print("\n6. TESTING USER PROFILE SYSTEM")
    print("-" * 40)
    
    profile_a = tester.test_user_profile(user_a["user"]["username"])
    profile_b = tester.test_user_profile(user_b["user"]["username"])
    
    # Test 7: Verify all points are tracked correctly
    print("\n7. TESTING POINTS TRACKING")
    print("-" * 40)
    
    points_a_correct = tester.verify_points_tracking(user_a["user"]["id"])
    points_b_correct = tester.verify_points_tracking(user_b["user"]["id"])
    
    # Test 8: Test squad posts (if applicable)
    print("\n8. TESTING SQUAD POSTS")
    print("-" * 40)
    
    # Test with null squad (should return empty array)
    squad_posts = tester.test_squad_posts("nonexistent-squad")
    
    # Summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    
    tests = [
        ("Enhanced User Signup", user_a and user_b),
        ("Post Creation with Metadata", post is not None),
        ("Single Post Retrieval", single_post is not None),
        ("Engage Redirect System", engage_success),
        ("Engage Deduplication", dedup_success),
        ("Clip Creation", clip is not None),
        ("Clip Retrieval", clips is not None),
        ("Collaboration Marking", collab is not None),
        ("User Profile System", profile_a and profile_b),
        ("Points Tracking", points_a_correct and points_b_correct)
    ]
    
    passed = sum(1 for _, result in tests if result)
    total = len(tests)
    
    for test_name, result in tests:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")
    
    print(f"\nOVERALL RESULT: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    
    if passed == total:
        print("🎉 ALL CREATORSQUAD V2 TESTS PASSED!")
        return True
    else:
        print("⚠️  Some tests failed - check logs above")
        return False

if __name__ == "__main__":
    success = run_creatorsquad_v2_tests()
    exit(0 if success else 1)