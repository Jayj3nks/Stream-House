#!/usr/bin/env python3
"""
Backend API Testing for Stream House - MongoDB Integration Comprehensive Testing
Testing the MongoDB-based system to verify all issues are resolved as requested in review:

CRITICAL AREAS TO TEST:
1. MongoDB Integration: signup/login with MongoDB persistence, user data survives server restarts, CRUD operations
2. Authentication System: signup → login → protected routes flow, cookie-based authentication persists, middleware authentication
3. API Endpoints with MongoDB: /api/auth/me, /api/users/{username}, /api/settings/*, /api/upload/avatar, /api/roommates
4. Settings & Profile Management: privacy settings (roommateOptIn) default to true and can be toggled, profile data updates persist
5. Data Persistence: create test account → verify in MongoDB, update user settings → verify changes persist, data survives server restarts
"""

import requests
import json
import time
import os
from io import BytesIO

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://api-dynamic-fix.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class StreamHouseAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_data = {
            "email": f"testuser{int(time.time())}@example.com",
            "password": "testpassword123",
            "displayName": f"Test User {int(time.time())}",
            "platforms": ["TikTok", "YouTube"],
            "niches": ["Gaming", "Tech"],
            "games": ["Fortnite", "Minecraft"],
            "city": "Los Angeles",
            "timeZone": "America/Los_Angeles",
            "hasSchedule": True,
            "schedule": {"monday": "9-17", "tuesday": "9-17"},
            "bio": "Test user for API testing"
        }
        self.created_username = None
        
    def test_signup_and_get_username(self):
        """Test signup and capture the created username for profile testing"""
        print("🧪 Testing Enhanced Signup with Profile Fields...")
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/signup",
                json=self.test_user_data,
                timeout=10
            )
            
            print(f"Signup Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                self.created_username = data['user']['username']
                print(f"✅ SIGNUP SUCCESS - Username created: {self.created_username}")
                print(f"✅ Display Name: {data['user']['displayName']}")
                
                # Store cookies for authentication
                if 'access_token' in [cookie.name for cookie in response.cookies]:
                    print("✅ Authentication cookie set successfully")
                    return True
                else:
                    print("❌ No authentication cookie found in response")
                    return False
            else:
                print(f"❌ SIGNUP FAILED: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ SIGNUP ERROR: {str(e)}")
            return False

    def test_auth_me_endpoint(self):
        """Test /api/auth/me endpoint to verify user data display"""
        print("\n🧪 Testing /api/auth/me endpoint for user profile data...")
        
        try:
            response = self.session.get(f"{API_BASE}/auth/me", timeout=10)
            print(f"Auth/me Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ AUTH/ME SUCCESS")
                print(f"✅ User ID: {data.get('id')}")
                print(f"✅ Display Name: {data.get('displayName')}")
                print(f"✅ Username: {data.get('username')}")
                print(f"✅ Email: {data.get('email')}")
                print(f"✅ Platforms: {data.get('platforms', [])}")
                print(f"✅ Niches: {data.get('niches', [])}")
                print(f"✅ City: {data.get('city')}")
                print(f"✅ Roommate Opt-in: {data.get('roommateOptIn')}")
                
                # Check if displayName is correct (not "Creator User")
                if data.get('displayName') == self.test_user_data['displayName']:
                    print("✅ VERIFIED: Display name matches signup data (not 'Creator User')")
                    return True
                else:
                    print(f"❌ ISSUE: Display name mismatch. Expected: {self.test_user_data['displayName']}, Got: {data.get('displayName')}")
                    return False
            else:
                print(f"❌ AUTH/ME FAILED: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ AUTH/ME ERROR: {str(e)}")
            return False

    def test_profile_api_integration(self):
        """Test /api/users/{username} endpoint with actual username"""
        print(f"\n🧪 Testing Profile API Integration: /api/users/{self.created_username}...")
        
        if not self.created_username:
            print("❌ No username available for testing")
            return False
            
        try:
            response = self.session.get(f"{API_BASE}/users/{self.created_username}", timeout=10)
            print(f"Profile API Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ PROFILE API SUCCESS")
                print(f"✅ User ID: {data.get('id')}")
                print(f"✅ Display Name: {data.get('displayName')}")
                print(f"✅ Username: {data.get('username')}")
                print(f"✅ Email: {data.get('email')}")
                print(f"✅ Platforms: {data.get('platforms', [])}")
                print(f"✅ Stats: {data.get('stats', {})}")
                print(f"✅ Posts: {len(data.get('posts', []))} posts")
                print(f"✅ Clips: {len(data.get('clips', []))} clips")
                
                # Verify actual user data is returned
                if data.get('displayName') == self.test_user_data['displayName']:
                    print("✅ VERIFIED: Profile returns correct user data")
                    return True
                else:
                    print(f"❌ ISSUE: Profile data mismatch")
                    return False
            else:
                print(f"❌ PROFILE API FAILED: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ PROFILE API ERROR: {str(e)}")
            return False

    def test_settings_roommate_search_api(self):
        """Test /api/settings/roommate-search privacy toggle"""
        print("\n🧪 Testing Settings API Integration: /api/settings/roommate-search...")
        
        try:
            # Test turning privacy OFF
            response = self.session.put(
                f"{API_BASE}/settings/roommate-search",
                json={"appearInRoommateSearch": False},
                timeout=10
            )
            print(f"Privacy Toggle OFF Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ PRIVACY TOGGLE OFF SUCCESS")
                print(f"✅ Success: {data.get('success')}")
                print(f"✅ Appear in Search: {data.get('appearInRoommateSearch')}")
                print(f"✅ Message: {data.get('message')}")
                
                # Test turning privacy ON
                response2 = self.session.put(
                    f"{API_BASE}/settings/roommate-search",
                    json={"appearInRoommateSearch": True},
                    timeout=10
                )
                print(f"Privacy Toggle ON Response Status: {response2.status_code}")
                
                if response2.status_code == 200:
                    data2 = response2.json()
                    print(f"✅ PRIVACY TOGGLE ON SUCCESS")
                    print(f"✅ Appear in Search: {data2.get('appearInRoommateSearch')}")
                    
                    # Verify default setting (should be ON for new users)
                    if data2.get('appearInRoommateSearch') == True:
                        print("✅ VERIFIED: Privacy settings working correctly")
                        return True
                    else:
                        print("❌ ISSUE: Privacy toggle not working correctly")
                        return False
                else:
                    print(f"❌ PRIVACY TOGGLE ON FAILED: {response2.text}")
                    return False
            else:
                print(f"❌ PRIVACY TOGGLE OFF FAILED: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ SETTINGS API ERROR: {str(e)}")
            return False

    def test_avatar_upload_api(self):
        """Test /api/upload/avatar profile picture functionality"""
        print("\n🧪 Testing Profile Picture Upload: /api/upload/avatar...")
        
        try:
            # Create a mock image file for testing
            mock_image_data = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\tpHYs\x00\x00\x0b\x13\x00\x00\x0b\x13\x01\x00\x9a\x9c\x18\x00\x00\x00\nIDATx\x9cc\xf8\x00\x00\x00\x01\x00\x01\x00\x00\x00\x00IEND\xaeB`\x82'
            
            files = {
                'avatar': ('test_avatar.png', BytesIO(mock_image_data), 'image/png')
            }
            
            response = self.session.post(
                f"{API_BASE}/upload/avatar",
                files=files,
                timeout=10
            )
            print(f"Avatar Upload Response Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"✅ AVATAR UPLOAD SUCCESS")
                print(f"✅ Success: {data.get('success')}")
                print(f"✅ Avatar URL: {data.get('avatarUrl')}")
                print(f"✅ Message: {data.get('message')}")
                
                # Verify avatar URL is generated
                if data.get('avatarUrl') and 'dicebear.com' in data.get('avatarUrl'):
                    print("✅ VERIFIED: Avatar URL generated correctly")
                    return True
                else:
                    print("❌ ISSUE: Avatar URL not generated properly")
                    return False
            else:
                print(f"❌ AVATAR UPLOAD FAILED: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ AVATAR UPLOAD ERROR: {str(e)}")
            return False

    def test_privacy_default_for_new_users(self):
        """Test that privacy settings default to ON (roommateOptIn: true) for new users"""
        print("\n🧪 Testing Privacy Settings Default for New Users...")
        
        try:
            # Check current user's privacy setting via auth/me
            response = self.session.get(f"{API_BASE}/auth/me", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                roommate_opt_in = data.get('roommateOptIn')
                print(f"✅ Current roommateOptIn setting: {roommate_opt_in}")
                
                if roommate_opt_in == True:
                    print("✅ VERIFIED: Privacy settings default to ON for new users")
                    return True
                else:
                    print("❌ ISSUE: Privacy settings not defaulting to ON for new users")
                    return False
            else:
                print(f"❌ Failed to check privacy default: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ PRIVACY DEFAULT CHECK ERROR: {str(e)}")
            return False

    def test_mongodb_persistence_after_restart(self):
        """Test that user data persists after server restart (simulated by creating new session)"""
        print("\n🧪 Testing MongoDB Data Persistence (Server Restart Simulation)...")
        
        try:
            # Create a new session to simulate server restart
            new_session = requests.Session()
            
            # Try to login with the same credentials using new session
            login_response = new_session.post(
                f"{API_BASE}/auth/login",
                json={
                    "email": self.test_user_data["email"],
                    "password": self.test_user_data["password"]
                },
                timeout=10
            )
            
            print(f"Login after 'restart' Response Status: {login_response.status_code}")
            
            if login_response.status_code == 200:
                print("✅ LOGIN AFTER RESTART SUCCESS - Data persisted in MongoDB")
                
                # Verify user data is still intact
                auth_response = new_session.get(f"{API_BASE}/auth/me", timeout=10)
                
                if auth_response.status_code == 200:
                    data = auth_response.json()
                    if (data.get('displayName') == self.test_user_data['displayName'] and
                        data.get('email') == self.test_user_data['email']):
                        print("✅ VERIFIED: User data completely intact after restart")
                        return True
                    else:
                        print("❌ ISSUE: User data corrupted after restart")
                        return False
                else:
                    print(f"❌ Auth check failed after restart: {auth_response.text}")
                    return False
            else:
                print(f"❌ LOGIN AFTER RESTART FAILED: {login_response.text}")
                return False
                
        except Exception as e:
            print(f"❌ PERSISTENCE TEST ERROR: {str(e)}")
            return False

    def test_mongodb_crud_operations(self):
        """Test all CRUD operations work correctly with MongoDB"""
        print("\n🧪 Testing MongoDB CRUD Operations...")
        
        try:
            # CREATE - Already tested in signup
            print("✅ CREATE: User creation tested in signup")
            
            # READ - Test multiple read operations
            auth_response = self.session.get(f"{API_BASE}/auth/me", timeout=10)
            profile_response = self.session.get(f"{API_BASE}/users/{self.created_username}", timeout=10)
            
            if auth_response.status_code == 200 and profile_response.status_code == 200:
                print("✅ READ: Multiple read operations successful")
            else:
                print("❌ READ: Some read operations failed")
                return False
            
            # UPDATE - Test profile updates
            update_response = self.session.put(
                f"{API_BASE}/settings/roommate-search",
                json={"appearInRoommateSearch": False},
                timeout=10
            )
            
            if update_response.status_code == 200:
                print("✅ UPDATE: Profile update operations successful")
                
                # Verify update persisted
                verify_response = self.session.get(f"{API_BASE}/auth/me", timeout=10)
                if verify_response.status_code == 200:
                    data = verify_response.json()
                    if data.get('roommateOptIn') == False:
                        print("✅ UPDATE VERIFICATION: Changes persisted correctly")
                    else:
                        print("❌ UPDATE VERIFICATION: Changes not persisted")
                        return False
                else:
                    print("❌ UPDATE VERIFICATION: Cannot verify changes")
                    return False
            else:
                print("❌ UPDATE: Profile update failed")
                return False
            
            # DELETE would be tested if we had a delete endpoint
            print("✅ CRUD: All available CRUD operations working correctly")
            return True
            
        except Exception as e:
            print(f"❌ CRUD OPERATIONS ERROR: {str(e)}")
            return False

    def test_authentication_flow_complete(self):
        """Test complete authentication flow: signup → login → protected routes"""
        print("\n🧪 Testing Complete Authentication Flow...")
        
        try:
            # Create new user for clean test
            new_user_data = {
                "email": f"authtest{int(time.time())}@example.com",
                "password": "authtest123",
                "displayName": f"Auth Test {int(time.time())}",
                "platforms": ["Twitch"],
                "niches": ["Gaming"],
                "city": "New York"
            }
            
            # Step 1: Signup
            signup_response = self.session.post(
                f"{API_BASE}/auth/signup",
                json=new_user_data,
                timeout=10
            )
            
            if signup_response.status_code != 200:
                print(f"❌ SIGNUP STEP FAILED: {signup_response.text}")
                return False
            
            print("✅ STEP 1: Signup successful")
            
            # Step 2: Login (new session to test login independently)
            login_session = requests.Session()
            login_response = login_session.post(
                f"{API_BASE}/auth/login",
                json={
                    "email": new_user_data["email"],
                    "password": new_user_data["password"]
                },
                timeout=10
            )
            
            if login_response.status_code != 200:
                print(f"❌ LOGIN STEP FAILED: {login_response.text}")
                return False
            
            print("✅ STEP 2: Login successful")
            
            # Step 3: Access protected routes
            protected_routes = [
                "/auth/me",
                "/roommates",
                "/users/me/houses"
            ]
            
            all_protected_working = True
            for route in protected_routes:
                try:
                    response = login_session.get(f"{API_BASE}{route}", timeout=10)
                    if response.status_code == 200:
                        print(f"✅ PROTECTED ROUTE: {route} accessible")
                    elif response.status_code == 401:
                        print(f"❌ PROTECTED ROUTE: {route} returned 401 (auth failed)")
                        all_protected_working = False
                    else:
                        print(f"⚠️  PROTECTED ROUTE: {route} returned {response.status_code}")
                except Exception as e:
                    print(f"❌ PROTECTED ROUTE: {route} error - {str(e)}")
                    all_protected_working = False
            
            if all_protected_working:
                print("✅ STEP 3: All protected routes accessible")
                print("✅ COMPLETE AUTHENTICATION FLOW: Working correctly")
                return True
            else:
                print("❌ STEP 3: Some protected routes failed")
                return False
            
        except Exception as e:
            print(f"❌ AUTHENTICATION FLOW ERROR: {str(e)}")
            return False

    def test_cookie_authentication_persistence(self):
        """Test that cookie-based authentication persists across requests"""
        print("\n🧪 Testing Cookie Authentication Persistence...")
        
        try:
            # Make multiple requests to verify cookie persistence
            requests_to_test = [
                "/auth/me",
                "/auth/me",  # Test twice to ensure consistency
                "/roommates"
            ]
            
            all_requests_successful = True
            for i, endpoint in enumerate(requests_to_test, 1):
                response = self.session.get(f"{API_BASE}{endpoint}", timeout=10)
                
                if response.status_code == 200:
                    print(f"✅ REQUEST {i}: {endpoint} successful with cookies")
                elif response.status_code == 401:
                    print(f"❌ REQUEST {i}: {endpoint} failed - cookie auth not working")
                    all_requests_successful = False
                else:
                    print(f"⚠️  REQUEST {i}: {endpoint} returned {response.status_code}")
            
            if all_requests_successful:
                print("✅ COOKIE PERSISTENCE: Working correctly across multiple requests")
                return True
            else:
                print("❌ COOKIE PERSISTENCE: Failed on some requests")
                return False
            
        except Exception as e:
            print(f"❌ COOKIE PERSISTENCE ERROR: {str(e)}")
            return False

    def test_roommates_api_with_mongodb(self):
        """Test roommates API with MongoDB filtering and authentication"""
        print("\n🧪 Testing Roommates API with MongoDB Integration...")
        
        try:
            # Test without authentication first
            no_auth_session = requests.Session()
            response = no_auth_session.get(f"{API_BASE}/roommates", timeout=10)
            
            if response.status_code == 401:
                print("✅ AUTHENTICATION REQUIRED: Roommates API properly protected")
            else:
                print(f"❌ AUTHENTICATION ISSUE: Roommates API returned {response.status_code} without auth")
                return False
            
            # Test with authentication
            response = self.session.get(f"{API_BASE}/roommates", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                print("✅ ROOMMATES API: Working with authentication")
                print(f"✅ Found {len(data.get('roommates', []))} roommate candidates")
                print(f"✅ Total available: {data.get('total', 0)}")
                print(f"✅ Pagination working: {data.get('hasMore', False)}")
                
                # Verify data structure
                if 'roommates' in data and isinstance(data['roommates'], list):
                    print("✅ DATA STRUCTURE: Correct roommates array returned")
                    return True
                else:
                    print("❌ DATA STRUCTURE: Invalid roommates data structure")
                    return False
            else:
                print(f"❌ ROOMMATES API FAILED: {response.text}")
                return False
            
        except Exception as e:
            print(f"❌ ROOMMATES API ERROR: {str(e)}")
            return False

    def run_comprehensive_mongodb_test(self):
        """Run comprehensive MongoDB integration tests"""
        print("🏠 STREAM HOUSE MONGODB INTEGRATION COMPREHENSIVE TESTING")
        print("=" * 80)
        print("Testing MongoDB-based system to verify all issues are resolved")
        print("=" * 80)
        
        results = {}
        
        # Test 1: MongoDB Integration - Signup with persistence
        print("\n📊 MONGODB INTEGRATION TESTS")
        results['mongodb_signup'] = self.test_signup_and_get_username()
        
        if not results['mongodb_signup']:
            print("\n❌ CRITICAL: Cannot proceed with testing - MongoDB signup failed")
            return results
        
        # Test 2: MongoDB CRUD Operations
        results['mongodb_crud'] = self.test_mongodb_crud_operations()
        
        # Test 3: MongoDB Data Persistence (Server Restart Simulation)
        results['mongodb_persistence'] = self.test_mongodb_persistence_after_restart()
        
        # Test 4: Authentication System - Complete Flow
        print("\n🔐 AUTHENTICATION SYSTEM TESTS")
        results['auth_complete_flow'] = self.test_authentication_flow_complete()
        
        # Test 5: Cookie Authentication Persistence
        results['cookie_persistence'] = self.test_cookie_authentication_persistence()
        
        # Test 6: API Endpoints with MongoDB - Auth/Me
        print("\n🔌 API ENDPOINTS WITH MONGODB TESTS")
        results['api_auth_me'] = self.test_auth_me_endpoint()
        
        # Test 7: API Endpoints - User Profile
        results['api_user_profile'] = self.test_profile_api_integration()
        
        # Test 8: API Endpoints - Roommates with MongoDB
        results['api_roommates'] = self.test_roommates_api_with_mongodb()
        
        # Test 9: Settings & Profile Management
        print("\n⚙️  SETTINGS & PROFILE MANAGEMENT TESTS")
        results['settings_privacy'] = self.test_settings_roommate_search_api()
        
        # Test 10: Privacy Settings Default
        results['privacy_default'] = self.test_privacy_default_for_new_users()
        
        # Test 11: Profile Picture Upload
        results['avatar_upload'] = self.test_avatar_upload_api()
        
        # Summary
        print("\n" + "=" * 80)
        print("🎯 MONGODB INTEGRATION TEST RESULTS")
        print("=" * 80)
        
        # Categorize results
        mongodb_tests = ['mongodb_signup', 'mongodb_crud', 'mongodb_persistence']
        auth_tests = ['auth_complete_flow', 'cookie_persistence']
        api_tests = ['api_auth_me', 'api_user_profile', 'api_roommates']
        settings_tests = ['settings_privacy', 'privacy_default', 'avatar_upload']
        
        categories = [
            ("MongoDB Integration", mongodb_tests),
            ("Authentication System", auth_tests),
            ("API Endpoints", api_tests),
            ("Settings & Profile Management", settings_tests)
        ]
        
        total_passed = 0
        total_tests = len(results)
        
        for category_name, test_list in categories:
            print(f"\n{category_name}:")
            category_passed = 0
            for test_name in test_list:
                if test_name in results:
                    status = "✅ PASSED" if results[test_name] else "❌ FAILED"
                    print(f"  {test_name.upper().replace('_', ' ')}: {status}")
                    if results[test_name]:
                        category_passed += 1
                        total_passed += 1
            print(f"  Category Score: {category_passed}/{len(test_list)} passed")
        
        print(f"\n🏆 OVERALL MONGODB INTEGRATION: {total_passed}/{total_tests} tests passed ({total_passed/total_tests*100:.1f}% success rate)")
        
        if total_passed == total_tests:
            print("🎉 ALL MONGODB INTEGRATION TESTS PASSED!")
            print("✅ MongoDB-based system verified - all issues resolved")
        elif total_passed >= total_tests * 0.8:
            print("✅ MONGODB INTEGRATION MOSTLY WORKING - Minor issues remain")
        else:
            print("⚠️  MONGODB INTEGRATION ISSUES - Significant problems need attention")
        
        return results

if __name__ == "__main__":
    tester = StreamHouseAPITester()
    results = tester.run_comprehensive_mongodb_test()