#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for CreatorSquad
Tests all authentication, squad, post, engagement, and credits endpoints
"""

import requests
import json
import time
import os
from datetime import datetime

# Get base URL from environment
BASE_URL = "http://localhost:3000/api"

class CreatorSquadAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token = None
        self.test_user_id = None
        self.test_squad_id = None
        self.test_post_id = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'CreatorSquad-Test-Client/1.0'
        })
        
    def log_test(self, test_name, success, message, response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"\n{status} {test_name}")
        print(f"   {message}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        return success
    
    def make_request(self, method, endpoint, data=None, auth_required=False):
        """Make HTTP request with proper headers"""
        url = f"{self.base_url}{endpoint}"
        headers = {}
        
        if auth_required and self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
            
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            return response
        except Exception as e:
            print(f"Request failed: {str(e)}")
            return None

    def test_api_root(self):
        """Test API root endpoint"""
        print("\n" + "="*60)
        print("TESTING API ROOT ENDPOINT")
        print("="*60)
        
        response = self.make_request('GET', '/')
        if response and response.status_code == 200:
            data = response.json()
            return self.log_test(
                "API Root Endpoint", 
                True, 
                f"API is accessible. Message: {data.get('message', 'No message')}"
            )
        else:
            return self.log_test(
                "API Root Endpoint", 
                False, 
                f"Failed to access API root. Status: {response.status_code if response else 'No response'}"
            )

    def test_user_signup(self):
        """Test user signup endpoint"""
        print("\n" + "="*60)
        print("TESTING USER AUTHENTICATION - SIGNUP")
        print("="*60)
        
        # Generate unique test data
        timestamp = int(time.time())
        test_data = {
            "email": f"testuser{timestamp}@example.com",
            "password": "SecurePassword123!",
            "displayName": f"Test User {timestamp}"
        }
        
        response = self.make_request('POST', '/auth/signup', test_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'user' in data:
                self.auth_token = data['token']
                self.test_user_id = data['user']['id']
                return self.log_test(
                    "User Signup", 
                    True, 
                    f"User created successfully. ID: {self.test_user_id}"
                )
            else:
                return self.log_test(
                    "User Signup", 
                    False, 
                    "Response missing token or user data", 
                    data
                )
        else:
            return self.log_test(
                "User Signup", 
                False, 
                f"Signup failed. Status: {response.status_code if response else 'No response'}", 
                response.json() if response else None
            )

    def test_enhanced_user_signup(self):
        """Test enhanced user signup with collaboration profile fields"""
        print("\n" + "="*60)
        print("TESTING ENHANCED USER SIGNUP - COLLABORATION PROFILE")
        print("="*60)
        
        # Generate unique test data with extended profile
        timestamp = int(time.time())
        test_data = {
            "email": f"collab_user_{timestamp}@example.com",
            "password": "CollabPassword123!",
            "displayName": f"Collab User {timestamp}",
            "platforms": ["YouTube", "TikTok", "Instagram"],
            "niches": ["Gaming", "Fitness"],
            "games": ["Fortnite", "Minecraft"],
            "city": "Los Angeles",
            "timeZone": "America/Los_Angeles",
            "hasSchedule": True,
            "schedule": {
                "monday": ["10:00", "14:00", "18:00"],
                "tuesday": ["10:00", "14:00"],
                "wednesday": ["10:00", "18:00"]
            },
            "bio": "Content creator focused on gaming and fitness collaborations"
        }
        
        response = self.make_request('POST', '/auth/signup', test_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'user' in data:
                user = data['user']
                # Verify all extended fields are stored
                expected_fields = ['platforms', 'niches', 'games', 'city', 'timeZone', 'hasSchedule', 'schedule', 'bio']
                missing_fields = [field for field in expected_fields if field not in user]
                
                if not missing_fields:
                    return self.log_test(
                        "Enhanced User Signup", 
                        True, 
                        f"Enhanced user created successfully. Platforms: {user['platforms']}, Niches: {user['niches']}, Games: {user['games']}"
                    )
                else:
                    return self.log_test(
                        "Enhanced User Signup", 
                        False, 
                        f"Missing extended profile fields: {missing_fields}", 
                        user
                    )
            else:
                return self.log_test(
                    "Enhanced User Signup", 
                    False, 
                    "Response missing token or user data", 
                    data
                )
        else:
            return self.log_test(
                "Enhanced User Signup", 
                False, 
                f"Enhanced signup failed. Status: {response.status_code if response else 'No response'}", 
                response.json() if response else None
            )

    def test_user_login(self):
        """Test user login endpoint"""
        print("\n" + "="*60)
        print("TESTING USER AUTHENTICATION - LOGIN")
        print("="*60)
        
        # First create a user to login with
        timestamp = int(time.time())
        signup_data = {
            "email": f"logintest{timestamp}@example.com",
            "password": "LoginPassword123!",
            "displayName": f"Login Test User {timestamp}"
        }
        
        # Create user
        signup_response = self.make_request('POST', '/auth/signup', signup_data)
        if not signup_response or signup_response.status_code != 200:
            return self.log_test(
                "User Login (Setup)", 
                False, 
                "Failed to create test user for login test"
            )
        
        # Now test login
        login_data = {
            "email": signup_data["email"],
            "password": signup_data["password"]
        }
        
        response = self.make_request('POST', '/auth/login', login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'user' in data:
                return self.log_test(
                    "User Login", 
                    True, 
                    f"Login successful. User: {data['user']['displayName']}"
                )
            else:
                return self.log_test(
                    "User Login", 
                    False, 
                    "Response missing token or user data", 
                    data
                )
        else:
            return self.log_test(
                "User Login", 
                False, 
                f"Login failed. Status: {response.status_code if response else 'No response'}", 
                response.json() if response else None
            )

    def test_get_current_user(self):
        """Test get current user endpoint"""
        print("\n" + "="*60)
        print("TESTING USER AUTHENTICATION - GET CURRENT USER")
        print("="*60)
        
        if not self.auth_token:
            return self.log_test(
                "Get Current User", 
                False, 
                "No auth token available. Run signup test first."
            )
        
        response = self.make_request('GET', '/auth/me', auth_required=True)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'id' in data and 'email' in data and 'displayName' in data:
                return self.log_test(
                    "Get Current User", 
                    True, 
                    f"User data retrieved. Name: {data['displayName']}, Email: {data['email']}"
                )
            else:
                return self.log_test(
                    "Get Current User", 
                    False, 
                    "Response missing required user fields", 
                    data
                )
        else:
            return self.log_test(
                "Get Current User", 
                False, 
                f"Failed to get user data. Status: {response.status_code if response else 'No response'}", 
                response.json() if response else None
            )

    def test_create_squad(self):
        """Test create squad endpoint"""
        print("\n" + "="*60)
        print("TESTING SQUAD MANAGEMENT - CREATE SQUAD")
        print("="*60)
        
        if not self.auth_token or not self.test_user_id:
            return self.log_test(
                "Create Squad", 
                False, 
                "No auth token or user ID available. Run signup test first."
            )
        
        timestamp = int(time.time())
        squad_data = {
            "name": f"Test Squad {timestamp}",
            "ownerId": self.test_user_id
        }
        
        response = self.make_request('POST', '/squads', squad_data, auth_required=True)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'id' in data and 'name' in data and 'ownerId' in data:
                self.test_squad_id = data['id']
                return self.log_test(
                    "Create Squad", 
                    True, 
                    f"Squad created successfully. ID: {self.test_squad_id}, Name: {data['name']}"
                )
            else:
                return self.log_test(
                    "Create Squad", 
                    False, 
                    "Response missing required squad fields", 
                    data
                )
        else:
            return self.log_test(
                "Create Squad", 
                False, 
                f"Failed to create squad. Status: {response.status_code if response else 'No response'}", 
                response.json() if response else None
            )

    def test_get_user_squad(self):
        """Test get user's squad endpoint"""
        print("\n" + "="*60)
        print("TESTING SQUAD MANAGEMENT - GET USER SQUAD")
        print("="*60)
        
        if not self.test_user_id:
            return self.log_test(
                "Get User Squad", 
                False, 
                "No user ID available. Run signup test first."
            )
        
        response = self.make_request('GET', f'/squads/user/{self.test_user_id}')
        
        if response and response.status_code == 200:
            data = response.json()
            if data is None:
                return self.log_test(
                    "Get User Squad", 
                    True, 
                    "No squad found for user (expected if no squad created)"
                )
            elif 'id' in data and 'name' in data:
                return self.log_test(
                    "Get User Squad", 
                    True, 
                    f"Squad retrieved successfully. Name: {data['name']}, Members: {data.get('memberCount', 'Unknown')}"
                )
            else:
                return self.log_test(
                    "Get User Squad", 
                    False, 
                    "Response missing required squad fields", 
                    data
                )
        else:
            return self.log_test(
                "Get User Squad", 
                False, 
                f"Failed to get user squad. Status: {response.status_code if response else 'No response'}", 
                response.json() if response else None
            )

    def test_create_post(self):
        """Test create post endpoint with URL metadata fetching"""
        print("\n" + "="*60)
        print("TESTING POST MANAGEMENT - CREATE POST")
        print("="*60)
        
        if not self.auth_token or not self.test_user_id or not self.test_squad_id:
            return self.log_test(
                "Create Post", 
                False, 
                "Missing auth token, user ID, or squad ID. Run previous tests first."
            )
        
        # Test with a real URL to verify metadata fetching
        post_data = {
            "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",  # Rick Roll - should work for metadata
            "squadId": self.test_squad_id,
            "userId": self.test_user_id
        }
        
        response = self.make_request('POST', '/posts', post_data, auth_required=True)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'id' in data and 'url' in data and 'title' in data and 'platform' in data:
                self.test_post_id = data['id']
                return self.log_test(
                    "Create Post", 
                    True, 
                    f"Post created successfully. ID: {self.test_post_id}, Title: {data['title']}, Platform: {data['platform']}"
                )
            else:
                return self.log_test(
                    "Create Post", 
                    False, 
                    "Response missing required post fields", 
                    data
                )
        else:
            return self.log_test(
                "Create Post", 
                False, 
                f"Failed to create post. Status: {response.status_code if response else 'No response'}", 
                response.json() if response else None
            )

    def test_get_squad_posts(self):
        """Test get squad posts endpoint"""
        print("\n" + "="*60)
        print("TESTING POST MANAGEMENT - GET SQUAD POSTS")
        print("="*60)
        
        if not self.test_squad_id:
            return self.log_test(
                "Get Squad Posts", 
                False, 
                "No squad ID available. Run create squad test first."
            )
        
        response = self.make_request('GET', f'/posts/squad/{self.test_squad_id}')
        
        if response and response.status_code == 200:
            data = response.json()
            if isinstance(data, list):
                return self.log_test(
                    "Get Squad Posts", 
                    True, 
                    f"Posts retrieved successfully. Count: {len(data)}"
                )
            else:
                return self.log_test(
                    "Get Squad Posts", 
                    False, 
                    "Response is not a list of posts", 
                    data
                )
        else:
            return self.log_test(
                "Get Squad Posts", 
                False, 
                f"Failed to get squad posts. Status: {response.status_code if response else 'No response'}", 
                response.json() if response else None
            )

    def test_create_engagement(self):
        """Test create engagement endpoint and credit system"""
        print("\n" + "="*60)
        print("TESTING ENGAGEMENT SYSTEM - RECORD ENGAGEMENT")
        print("="*60)
        
        if not self.auth_token or not self.test_user_id or not self.test_post_id:
            return self.log_test(
                "Create Engagement", 
                False, 
                "Missing auth token, user ID, or post ID. Run previous tests first."
            )
        
        # Test different engagement types
        engagement_types = ['like', 'comment', 'share']
        results = []
        
        for engagement_type in engagement_types:
            engagement_data = {
                "postId": self.test_post_id,
                "userId": self.test_user_id,
                "type": engagement_type
            }
            
            response = self.make_request('POST', '/engagements', engagement_data, auth_required=True)
            
            if response and response.status_code == 200:
                data = response.json()
                if 'id' in data and 'type' in data and 'postId' in data:
                    results.append(f"{engagement_type}: ✅")
                else:
                    results.append(f"{engagement_type}: ❌ (missing fields)")
            else:
                results.append(f"{engagement_type}: ❌ (status {response.status_code if response else 'no response'})")
        
        success = all("✅" in result for result in results)
        return self.log_test(
            "Create Engagement", 
            success, 
            f"Engagement tests: {', '.join(results)}"
        )

    def test_get_user_credits(self):
        """Test get user credits endpoint"""
        print("\n" + "="*60)
        print("TESTING CREDITS SYSTEM - GET USER CREDITS")
        print("="*60)
        
        if not self.test_user_id:
            return self.log_test(
                "Get User Credits", 
                False, 
                "No user ID available. Run signup test first."
            )
        
        response = self.make_request('GET', f'/credits/{self.test_user_id}')
        
        if response and response.status_code == 200:
            data = response.json()
            if 'balance' in data:
                return self.log_test(
                    "Get User Credits", 
                    True, 
                    f"Credits retrieved successfully. Balance: {data['balance']}"
                )
            else:
                return self.log_test(
                    "Get User Credits", 
                    False, 
                    "Response missing balance field", 
                    data
                )
        else:
            return self.log_test(
                "Get User Credits", 
                False, 
                f"Failed to get user credits. Status: {response.status_code if response else 'No response'}", 
                response.json() if response else None
            )

    def test_collaboration_matching(self):
        """Test collaboration matching algorithm"""
        print("\n" + "="*60)
        print("TESTING COLLABORATION MATCHING ALGORITHM")
        print("="*60)
        
        # First create test users with different profiles
        timestamp = int(time.time())
        
        # User A: Gaming + Fitness, plays Fortnite, in Los Angeles, has schedule
        user_a_data = {
            "email": f"user_a_{timestamp}@example.com",
            "password": "Password123!",
            "displayName": f"Gaming Creator A {timestamp}",
            "platforms": ["YouTube", "Twitch"],
            "niches": ["Gaming", "Fitness"],
            "games": ["Fortnite"],
            "city": "Los Angeles",
            "timeZone": "America/Los_Angeles",
            "hasSchedule": True,
            "schedule": {
                "monday": ["10:00", "14:00"],
                "tuesday": ["10:00", "14:00"]
            },
            "bio": "Gaming and fitness content creator"
        }
        
        # User B: Gaming + Music, plays Fortnite + Minecraft, in Los Angeles, no schedule
        user_b_data = {
            "email": f"user_b_{timestamp}@example.com",
            "password": "Password123!",
            "displayName": f"Gaming Creator B {timestamp}",
            "platforms": ["YouTube", "TikTok"],
            "niches": ["Gaming", "Music"],
            "games": ["Fortnite", "Minecraft"],
            "city": "Los Angeles",
            "timeZone": "America/Los_Angeles",
            "hasSchedule": False,
            "schedule": {},
            "bio": "Gaming and music content creator"
        }
        
        # User C: Beauty + Lifestyle, no games, in New York, different schedule
        user_c_data = {
            "email": f"user_c_{timestamp}@example.com",
            "password": "Password123!",
            "displayName": f"Beauty Creator C {timestamp}",
            "platforms": ["Instagram", "TikTok"],
            "niches": ["Beauty", "Lifestyle"],
            "games": [],
            "city": "New York",
            "timeZone": "America/New_York",
            "hasSchedule": True,
            "schedule": {
                "wednesday": ["16:00", "20:00"],
                "thursday": ["16:00", "20:00"]
            },
            "bio": "Beauty and lifestyle content creator"
        }
        
        # Create all test users
        users_created = []
        for user_data in [user_a_data, user_b_data, user_c_data]:
            response = self.make_request('POST', '/auth/signup', user_data)
            if response and response.status_code == 200:
                data = response.json()
                users_created.append({
                    'id': data['user']['id'],
                    'name': data['user']['displayName'],
                    'data': user_data
                })
            else:
                return self.log_test(
                    "Collaboration Matching (Setup)", 
                    False, 
                    f"Failed to create test user: {user_data['displayName']}"
                )
        
        if len(users_created) != 3:
            return self.log_test(
                "Collaboration Matching (Setup)", 
                False, 
                f"Only created {len(users_created)} out of 3 test users"
            )
        
        # Test matching for User A
        user_a_id = users_created[0]['id']
        response = self.make_request('GET', f'/collaborations/matches/{user_a_id}')
        
        if response and response.status_code == 200:
            matches = response.json()
            if isinstance(matches, list) and len(matches) >= 2:
                # Find User B and User C in matches
                user_b_match = next((m for m in matches if users_created[1]['name'] in m['displayName']), None)
                user_c_match = next((m for m in matches if users_created[2]['name'] in m['displayName']), None)
                
                if user_b_match and user_c_match:
                    # Verify User B has higher score than User C (shared location, niche, games)
                    if user_b_match['matchScore'] > user_c_match['matchScore']:
                        return self.log_test(
                            "Collaboration Matching", 
                            True, 
                            f"Matching algorithm working correctly. User B score: {user_b_match['matchScore']}, User C score: {user_c_match['matchScore']}. Reasons for B: {user_b_match['matchReasons']}"
                        )
                    else:
                        return self.log_test(
                            "Collaboration Matching", 
                            False, 
                            f"Incorrect scoring. User B score: {user_b_match['matchScore']}, User C score: {user_c_match['matchScore']}"
                        )
                else:
                    return self.log_test(
                        "Collaboration Matching", 
                        False, 
                        f"Could not find expected users in matches. Found {len(matches)} matches"
                    )
            else:
                return self.log_test(
                    "Collaboration Matching", 
                    False, 
                    f"Expected at least 2 matches, got {len(matches) if isinstance(matches, list) else 'invalid response'}"
                )
        else:
            return self.log_test(
                "Collaboration Matching", 
                False, 
                f"Failed to get matches. Status: {response.status_code if response else 'No response'}", 
                response.json() if response else None
            )

    def test_collaboration_invite(self):
        """Test collaboration invite functionality"""
        print("\n" + "="*60)
        print("TESTING COLLABORATION INVITE SYSTEM")
        print("="*60)
        
        # Create two test users for invite testing
        timestamp = int(time.time())
        
        # Create sender user
        sender_data = {
            "email": f"sender_{timestamp}@example.com",
            "password": "Password123!",
            "displayName": f"Sender User {timestamp}",
            "platforms": ["YouTube"],
            "niches": ["Gaming"],
            "bio": "Looking for collaboration partners"
        }
        
        sender_response = self.make_request('POST', '/auth/signup', sender_data)
        if not sender_response or sender_response.status_code != 200:
            return self.log_test(
                "Collaboration Invite (Setup)", 
                False, 
                "Failed to create sender user"
            )
        
        sender_user = sender_response.json()['user']
        sender_token = sender_response.json()['token']
        
        # Create receiver user
        receiver_data = {
            "email": f"receiver_{timestamp}@example.com",
            "password": "Password123!",
            "displayName": f"Receiver User {timestamp}",
            "platforms": ["TikTok"],
            "niches": ["Gaming"],
            "bio": "Open to collaborations"
        }
        
        receiver_response = self.make_request('POST', '/auth/signup', receiver_data)
        if not receiver_response or receiver_response.status_code != 200:
            return self.log_test(
                "Collaboration Invite (Setup)", 
                False, 
                "Failed to create receiver user"
            )
        
        receiver_user = receiver_response.json()['user']
        
        # Test sending collaboration invite
        invite_data = {
            "fromUserId": sender_user['id'],
            "toUserId": receiver_user['id'],
            "message": "Hey! I saw your gaming content and would love to collaborate on a project. Let's create something amazing together!"
        }
        
        # Set auth token for sender
        original_token = self.auth_token
        self.auth_token = sender_token
        
        response = self.make_request('POST', '/collaborations/invite', invite_data, auth_required=True)
        
        # Restore original token
        self.auth_token = original_token
        
        if response and response.status_code == 200:
            data = response.json()
            if 'id' in data and 'fromUserId' in data and 'toUserId' in data and 'message' in data and 'status' in data:
                if (data['fromUserId'] == sender_user['id'] and 
                    data['toUserId'] == receiver_user['id'] and 
                    data['status'] == 'pending' and 
                    data['message'] == invite_data['message']):
                    return self.log_test(
                        "Collaboration Invite", 
                        True, 
                        f"Invite sent successfully. ID: {data['id']}, Status: {data['status']}"
                    )
                else:
                    return self.log_test(
                        "Collaboration Invite", 
                        False, 
                        "Invite data mismatch", 
                        data
                    )
            else:
                return self.log_test(
                    "Collaboration Invite", 
                    False, 
                    "Response missing required invite fields", 
                    data
                )
        else:
            return self.log_test(
                "Collaboration Invite", 
                False, 
                f"Failed to send invite. Status: {response.status_code if response else 'No response'}", 
                response.json() if response else None
            )

    def run_all_tests(self):
        """Run all backend API tests"""
        print("\n" + "🚀 STARTING CREATORSQUAD BACKEND API TESTS")
        print("=" * 80)
        print(f"Base URL: {self.base_url}")
        print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        test_results = []
        
        # Run all tests in sequence
        test_results.append(self.test_api_root())
        test_results.append(self.test_user_signup())
        test_results.append(self.test_enhanced_user_signup())
        test_results.append(self.test_user_login())
        test_results.append(self.test_get_current_user())
        test_results.append(self.test_create_squad())
        test_results.append(self.test_get_user_squad())
        test_results.append(self.test_create_post())
        test_results.append(self.test_get_squad_posts())
        test_results.append(self.test_create_engagement())
        test_results.append(self.test_get_user_credits())
        test_results.append(self.test_collaboration_matching())
        test_results.append(self.test_collaboration_invite())
        
        # Summary
        print("\n" + "="*80)
        print("🏁 TEST SUMMARY")
        print("="*80)
        
        passed = sum(test_results)
        total = len(test_results)
        
        print(f"Tests Passed: {passed}/{total}")
        print(f"Success Rate: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED! Backend API is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the detailed output above.")
        
        return passed == total

if __name__ == "__main__":
    tester = CreatorSquadAPITester()
    success = tester.run_all_tests()
    exit(0 if success else 1)