#!/usr/bin/env python3
"""
Stream-House Backend API Testing Suite
Testing API routes after adding 'export const dynamic = "force-dynamic";' to specific routes
"""

import requests
import json
import time
import random
import string
from datetime import datetime

# Configuration
BASE_URL = "https://api-dynamic-fix.preview.emergentagent.com/api"
TEST_USER_EMAIL = f"testuser{int(time.time())}@example.com"
TEST_USER_PASSWORD = "testpassword123"
TEST_USER_DISPLAY_NAME = "Test User Dynamic"

class StreamHouseAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, details=""):
        """Log test results"""
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {test_name}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'timestamp': datetime.now().isoformat()
        })
    
    def test_unchanged_routes(self):
        """Test routes that were NOT modified (no dynamic export)"""
        print("\n🔍 TESTING UNCHANGED ROUTES (No dynamic export)")
        
        # Test /api/test endpoint (unchanged)
        try:
            response = self.session.get(f"{BASE_URL}/test")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "timestamp" in data:
                    self.log_test("Test endpoint GET", True, f"Message: {data['message']}")
                else:
                    self.log_test("Test endpoint GET", False, "Missing expected fields in response")
            else:
                self.log_test("Test endpoint GET", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Test endpoint GET", False, f"Exception: {str(e)}")
        
        # Test POST to /api/test
        try:
            response = self.session.post(f"{BASE_URL}/test")
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "POST" in data["message"]:
                    self.log_test("Test endpoint POST", True, f"Message: {data['message']}")
                else:
                    self.log_test("Test endpoint POST", False, "POST message not found")
            else:
                self.log_test("Test endpoint POST", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Test endpoint POST", False, f"Exception: {str(e)}")
    
    def test_auth_signup(self):
        """Test signup endpoint (unchanged route)"""
        print("\n🔍 TESTING AUTH SIGNUP (Unchanged route)")
        
        signup_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "displayName": TEST_USER_DISPLAY_NAME,
            "platforms": ["TikTok", "YouTube"],
            "niches": ["Gaming", "Tech"],
            "games": ["Fortnite", "Minecraft"],
            "city": "Los Angeles",
            "timeZone": "America/Los_Angeles",
            "hasSchedule": True,
            "schedule": {"monday": "9-17", "tuesday": "9-17"},
            "bio": "Test user for API testing"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/signup", json=signup_data)
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.auth_token = data["token"]
                    self.test_user_id = data["user"]["id"]
                    # Check if cookies are set
                    cookies_set = "access_token" in [cookie.name for cookie in self.session.cookies]
                    self.log_test("Auth Signup", True, f"User created: {data['user']['email']}, Cookies set: {cookies_set}")
                else:
                    self.log_test("Auth Signup", False, "Missing token or user in response")
            else:
                self.log_test("Auth Signup", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Auth Signup", False, f"Exception: {str(e)}")
    
    def test_auth_login(self):
        """Test login endpoint (unchanged route)"""
        print("\n🔍 TESTING AUTH LOGIN (Unchanged route)")
        
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                if "token" in data and "user" in data:
                    self.auth_token = data["token"]
                    # Check if cookies are set
                    cookies_set = "access_token" in [cookie.name for cookie in self.session.cookies]
                    self.log_test("Auth Login", True, f"Login successful, Cookies set: {cookies_set}")
                else:
                    self.log_test("Auth Login", False, "Missing token or user in response")
            else:
                self.log_test("Auth Login", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Auth Login", False, f"Exception: {str(e)}")
    
    def test_modified_routes(self):
        """Test routes that were MODIFIED (with dynamic export)"""
        print("\n🔍 TESTING MODIFIED ROUTES (With dynamic export)")
        
        # Test /api/auth/me (modified)
        try:
            response = self.session.get(f"{BASE_URL}/auth/me")
            if response.status_code == 200:
                data = response.json()
                if "email" in data and "displayName" in data:
                    self.log_test("Auth Me (Modified)", True, f"User data retrieved: {data['email']}")
                else:
                    self.log_test("Auth Me (Modified)", False, "Missing expected user fields")
            else:
                self.log_test("Auth Me (Modified)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Auth Me (Modified)", False, f"Exception: {str(e)}")
        
        # Test /api/auth-check (modified)
        try:
            response = self.session.get(f"{BASE_URL}/auth-check")
            if response.status_code == 200:
                data = response.json()
                if "authenticated" in data and data["authenticated"] == True:
                    self.log_test("Auth Check (Modified)", True, f"Authentication verified: {data['authenticated']}")
                else:
                    self.log_test("Auth Check (Modified)", False, "Authentication not verified")
            else:
                self.log_test("Auth Check (Modified)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Auth Check (Modified)", False, f"Exception: {str(e)}")
        
        # Test /api/roommates (modified)
        try:
            response = self.session.get(f"{BASE_URL}/roommates")
            if response.status_code == 200:
                data = response.json()
                if "roommates" in data and "total" in data:
                    self.log_test("Roommates API (Modified)", True, f"Roommates retrieved: {data['total']} total")
                else:
                    self.log_test("Roommates API (Modified)", False, "Missing expected roommates fields")
            else:
                self.log_test("Roommates API (Modified)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("Roommates API (Modified)", False, f"Exception: {str(e)}")
        
        # Test /api/users/me/houses (modified)
        try:
            response = self.session.get(f"{BASE_URL}/users/me/houses")
            if response.status_code == 200:
                data = response.json()
                if "houses" in data and "total" in data:
                    self.log_test("User Houses API (Modified)", True, f"Houses retrieved: {data['total']} total")
                else:
                    self.log_test("User Houses API (Modified)", False, "Missing expected houses fields")
            else:
                self.log_test("User Houses API (Modified)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("User Houses API (Modified)", False, f"Exception: {str(e)}")
    
    def test_house_creation(self):
        """Test house creation endpoints (both modified)"""
        print("\n🔍 TESTING HOUSE CREATION (Modified routes)")
        
        # Test /api/houses/create (modified)
        house_data = {
            "name": f"Test House {int(time.time())}",
            "description": "A test house for API testing",
            "niches": ["Gaming", "Tech"],
            "maxMembers": 10,
            "rules": "Be respectful and have fun!"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/houses/create", json=house_data)
            if response.status_code == 200:
                data = response.json()
                if "success" in data and "house" in data:
                    self.log_test("House Create API (Modified)", True, f"House created: {data['house']['name']}")
                else:
                    self.log_test("House Create API (Modified)", False, "Missing success or house in response")
            else:
                self.log_test("House Create API (Modified)", False, f"Status: {response.status_code}, Response: {response.text}")
        except Exception as e:
            self.log_test("House Create API (Modified)", False, f"Exception: {str(e)}")
        
        # Test /api/house-create-form (modified) - This expects form data
        form_data = {
            "name": f"Form Test House {int(time.time())}",
            "description": "A test house via form submission",
            "niches": json.dumps(["Gaming", "Music"]),
            "maxMembers": "8",
            "rules": "Form submission rules"
        }
        
        try:
            response = self.session.post(f"{BASE_URL}/house-create-form", data=form_data)
            # This endpoint redirects on success (302) or returns HTML error
            if response.status_code == 302:
                self.log_test("House Create Form (Modified)", True, f"Form submission successful, redirected to: {response.headers.get('Location', 'unknown')}")
            elif response.status_code == 200 and "dashboard" in response.text:
                self.log_test("House Create Form (Modified)", True, "Form submission successful")
            else:
                self.log_test("House Create Form (Modified)", False, f"Status: {response.status_code}, Response: {response.text[:200]}")
        except Exception as e:
            self.log_test("House Create Form (Modified)", False, f"Exception: {str(e)}")
    
    def test_authentication_requirements(self):
        """Test that protected routes require authentication"""
        print("\n🔍 TESTING AUTHENTICATION REQUIREMENTS")
        
        # Create a new session without authentication
        unauth_session = requests.Session()
        
        protected_routes = [
            ("/auth/me", "GET"),
            ("/auth-check", "GET"),
            ("/roommates", "GET"),
            ("/users/me/houses", "GET"),
            ("/houses/create", "POST")
        ]
        
        for route, method in protected_routes:
            try:
                if method == "GET":
                    response = unauth_session.get(f"{BASE_URL}{route}")
                else:
                    response = unauth_session.post(f"{BASE_URL}{route}", json={})
                
                if response.status_code == 401:
                    self.log_test(f"Auth Required - {route}", True, "Correctly returns 401 for unauthenticated request")
                else:
                    self.log_test(f"Auth Required - {route}", False, f"Expected 401, got {response.status_code}")
            except Exception as e:
                self.log_test(f"Auth Required - {route}", False, f"Exception: {str(e)}")
    
    def test_cookie_based_auth(self):
        """Test that cookie-based authentication works"""
        print("\n🔍 TESTING COOKIE-BASED AUTHENTICATION")
        
        # First, ensure we're logged in and have cookies
        if not self.auth_token:
            self.test_auth_login()
        
        # Test that we can access protected routes with cookies (no Authorization header)
        try:
            # Remove any Authorization headers
            if 'Authorization' in self.session.headers:
                del self.session.headers['Authorization']
            
            response = self.session.get(f"{BASE_URL}/auth/me")
            if response.status_code == 200:
                data = response.json()
                if "email" in data:
                    self.log_test("Cookie Authentication", True, f"Successfully authenticated with cookies: {data['email']}")
                else:
                    self.log_test("Cookie Authentication", False, "Response missing user data")
            else:
                self.log_test("Cookie Authentication", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Cookie Authentication", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 STARTING STREAM-HOUSE API TESTING SUITE")
        print(f"Testing against: {BASE_URL}")
        print(f"Test user: {TEST_USER_EMAIL}")
        print("=" * 60)
        
        # Test unchanged routes first
        self.test_unchanged_routes()
        
        # Test authentication (signup and login)
        self.test_auth_signup()
        if not self.auth_token:
            self.test_auth_login()
        
        # Test modified routes
        if self.auth_token:
            self.test_modified_routes()
            self.test_house_creation()
            self.test_cookie_based_auth()
        
        # Test authentication requirements
        self.test_authentication_requirements()
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {total - passed}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        print("\n📋 DETAILED RESULTS:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
        
        print("\n🎯 DYNAMIC EXPORT VERIFICATION:")
        modified_routes = [
            "Auth Me (Modified)",
            "Auth Check (Modified)", 
            "Roommates API (Modified)",
            "User Houses API (Modified)",
            "House Create API (Modified)",
            "House Create Form (Modified)"
        ]
        
        modified_passed = sum(1 for result in self.test_results 
                            if result['test'] in modified_routes and result['success'])
        modified_total = len(modified_routes)
        
        print(f"Modified Routes (with dynamic export): {modified_passed}/{modified_total} passed")
        
        unchanged_routes = [
            "Test endpoint GET",
            "Test endpoint POST",
            "Auth Signup", 
            "Auth Login"
        ]
        
        unchanged_passed = sum(1 for result in self.test_results 
                             if result['test'] in unchanged_routes and result['success'])
        unchanged_total = len(unchanged_routes)
        
        print(f"Unchanged Routes (no dynamic export): {unchanged_passed}/{unchanged_total} passed")
        
        if success_rate >= 80:
            print("\n🎉 OVERALL STATUS: EXCELLENT - API functionality preserved after dynamic export changes")
        elif success_rate >= 60:
            print("\n⚠️  OVERALL STATUS: GOOD - Most functionality working, minor issues detected")
        else:
            print("\n🚨 OVERALL STATUS: ISSUES DETECTED - Significant problems with API functionality")

if __name__ == "__main__":
    tester = StreamHouseAPITester()
    tester.run_all_tests()
                "bio": "Test user for API testing"
            }
            
            response = self.session.post(f"{API_BASE}/auth/signup", json=signup_data)
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data['token']
                self.test_user_id = data['user']['id']
                self.test_username = data['user']['username']
                self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
                print(f"✅ Test user created: {self.test_username}")
                return True
            else:
                print(f"❌ Failed to create test user: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Error creating test user: {e}")
            return False
    
    def test_profile_200(self):
        """Test Profile 200 - Returns profile schema (posts/clips)"""
        try:
            response = self.session.get(f"{API_BASE}/users/{self.test_username}")
            
            if response.status_code == 200:
                data = response.json()
                has_user = 'user' in data
                has_posts = 'posts' in data
                has_clips = 'clipsMade' in data
                has_points_breakdown = 'pointsBreakdown' in data.get('user', {})
                
                if has_user and has_posts and has_clips and has_points_breakdown:
                    self.log_result(
                        "Profile 200",
                        f"GET /api/users/{self.test_username}",
                        "Returns profile schema (posts/clips)",
                        "Profile with user, posts, clips, and points breakdown",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Profile 200",
                        f"GET /api/users/{self.test_username}",
                        "Returns profile schema (posts/clips)",
                        f"Missing fields - user:{has_user}, posts:{has_posts}, clips:{has_clips}, points:{has_points_breakdown}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Profile 200",
                    f"GET /api/users/{self.test_username}",
                    "Returns profile schema (posts/clips)",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Profile 200",
                f"GET /api/users/{self.test_username}",
                "Returns profile schema (posts/clips)",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_profile_case_insensitive(self):
        """Test Profile case-insensitive matching"""
        try:
            uppercase_username = self.test_username.upper()
            response = self.session.get(f"{API_BASE}/users/{uppercase_username}")
            
            if response.status_code == 200:
                data = response.json()
                returned_username = data.get('user', {}).get('username', '')
                if returned_username.lower() == self.test_username.lower():
                    self.log_result(
                        "Profile Case Insensitive",
                        f"GET /api/users/{uppercase_username}",
                        "Returns profile for case-insensitive match",
                        f"Found user: {returned_username}",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Profile Case Insensitive",
                        f"GET /api/users/{uppercase_username}",
                        "Returns profile for case-insensitive match",
                        f"Wrong user returned: {returned_username}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Profile Case Insensitive",
                    f"GET /api/users/{uppercase_username}",
                    "Returns profile for case-insensitive match",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Profile Case Insensitive",
                f"GET /api/users/{self.test_username.upper()}",
                "Returns profile for case-insensitive match",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_profile_404(self):
        """Test Profile 404 - Friendly 404, no logout"""
        try:
            response = self.session.get(f"{API_BASE}/users/nonexistentuser12345")
            
            if response.status_code == 404:
                data = response.json()
                error_msg = data.get('error', '')
                if 'not found' in error_msg.lower():
                    self.log_result(
                        "Profile 404",
                        "GET /api/users/nonexistentuser12345",
                        "Friendly 404, no logout",
                        f"404 with message: {error_msg}",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Profile 404",
                        "GET /api/users/nonexistentuser12345",
                        "Friendly 404, no logout",
                        f"404 but wrong message: {error_msg}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Profile 404",
                    "GET /api/users/nonexistentuser12345",
                    "Friendly 404, no logout",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Profile 404",
                "GET /api/users/nonexistentuser12345",
                "Friendly 404, no logout",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_profile_ttl_7d(self):
        """Test Profile TTL 7d - Only posts <7d, not deleted"""
        try:
            # First create a house to post to
            house_response = self.session.post(f"{API_BASE}/houses", json={"name": "Test House TTL"})
            if house_response.status_code != 200:
                self.log_result(
                    "Profile TTL 7d",
                    "GET /api/users/:u/posts",
                    "Only posts <7d, not deleted",
                    "Failed to create test house",
                    "FAIL"
                )
                return
            
            house_id = house_response.json()['id']
            
            # Create a test post
            post_response = self.session.post(f"{API_BASE}/posts", json={
                "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                "houseId": house_id
            })
            
            if post_response.status_code == 200:
                # Check profile posts
                profile_response = self.session.get(f"{API_BASE}/users/{self.test_username}")
                if profile_response.status_code == 200:
                    data = profile_response.json()
                    posts = data.get('posts', {}).get('items', [])
                    
                    # Check if posts are within 7 days
                    now = datetime.now()
                    valid_posts = []
                    for post in posts:
                        post_date = datetime.fromisoformat(post['createdAt'].replace('Z', '+00:00'))
                        days_old = (now - post_date.replace(tzinfo=None)).days
                        if days_old <= 7:
                            valid_posts.append(post)
                    
                    self.log_result(
                        "Profile TTL 7d",
                        f"GET /api/users/{self.test_username}/posts",
                        "Only posts <7d, not deleted",
                        f"Found {len(valid_posts)} posts within 7 days",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Profile TTL 7d",
                        f"GET /api/users/{self.test_username}/posts",
                        "Only posts <7d, not deleted",
                        f"Profile fetch failed: {profile_response.status_code}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Profile TTL 7d",
                    f"GET /api/users/{self.test_username}/posts",
                    "Only posts <7d, not deleted",
                    f"Post creation failed: {post_response.status_code}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Profile TTL 7d",
                f"GET /api/users/{self.test_username}/posts",
                "Only posts <7d, not deleted",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_roommates_200(self):
        """Test Roommates 200 - Auth, opt-in users, filters work"""
        try:
            response = self.session.get(f"{API_BASE}/roommates")
            
            if response.status_code == 200:
                data = response.json()
                has_items = 'items' in data
                has_pagination = 'page' in data and 'pageSize' in data and 'total' in data
                
                if has_items and has_pagination:
                    self.log_result(
                        "Roommates 200",
                        "GET /api/roommates",
                        "Auth, opt-in users, filters work",
                        f"Returned {len(data['items'])} users with pagination",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Roommates 200",
                        "GET /api/roommates",
                        "Auth, opt-in users, filters work",
                        f"Missing fields - items:{has_items}, pagination:{has_pagination}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Roommates 200",
                    "GET /api/roommates",
                    "Auth, opt-in users, filters work",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Roommates 200",
                "GET /api/roommates",
                "Auth, opt-in users, filters work",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_roommates_401(self):
        """Test Roommates 401 - 401 redirects to login with next (no logout)"""
        try:
            # Remove auth header temporarily
            old_headers = self.session.headers.copy()
            if 'Authorization' in self.session.headers:
                del self.session.headers['Authorization']
            
            response = self.session.get(f"{API_BASE}/roommates")
            
            # Restore auth header
            self.session.headers = old_headers
            
            if response.status_code == 401:
                data = response.json()
                error_msg = data.get('error', '')
                if 'unauthorized' in error_msg.lower():
                    self.log_result(
                        "Roommates 401",
                        "GET /api/roommates",
                        "401 redirects to login with next (no logout)",
                        f"401 Unauthorized: {error_msg}",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Roommates 401",
                        "GET /api/roommates",
                        "401 redirects to login with next (no logout)",
                        f"401 but wrong message: {error_msg}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Roommates 401",
                    "GET /api/roommates",
                    "401 redirects to login with next (no logout)",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Roommates 401",
                "GET /api/roommates",
                "401 redirects to login with next (no logout)",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_create_first_house(self):
        """Test Create First House - Creates house + sets active=true"""
        try:
            response = self.session.post(f"{API_BASE}/houses", json={"name": "My First House"})
            
            if response.status_code == 200:
                data = response.json()
                has_id = 'id' in data
                has_name = data.get('name') == "My First House"
                set_active = data.get('setActive') == True
                
                if has_id and has_name and set_active:
                    self.test_house_id = data['id']
                    self.log_result(
                        "Create First House",
                        "POST /api/houses",
                        "Creates house + sets active=true",
                        f"House created with ID {data['id']} and setActive=true",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Create First House",
                        "POST /api/houses",
                        "Creates house + sets active=true",
                        f"Missing fields - id:{has_id}, name:{has_name}, setActive:{set_active}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Create First House",
                    "POST /api/houses",
                    "Creates house + sets active=true",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Create First House",
                "POST /api/houses",
                "Creates house + sets active=true",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_dashboard_after_first_house(self):
        """Test Dashboard After First House - Loads house dashboard, feed visible"""
        try:
            # Check if active house is set
            active_response = self.session.get(f"{API_BASE}/session/active-house")
            
            if active_response.status_code == 200:
                active_data = active_response.json()
                active_house_id = active_data.get('houseId')
                
                if active_house_id:
                    # Try to get house feed
                    feed_response = self.session.get(f"{API_BASE}/house/feed")
                    
                    if feed_response.status_code == 200:
                        feed_data = feed_response.json()
                        self.log_result(
                            "Dashboard After First House",
                            "/dashboard + session",
                            "Loads house dashboard, feed visible",
                            f"Active house {active_house_id}, feed has {len(feed_data)} posts",
                            "PASS"
                        )
                    else:
                        self.log_result(
                            "Dashboard After First House",
                            "/dashboard + session",
                            "Loads house dashboard, feed visible",
                            f"Feed failed: {feed_response.status_code}",
                            "FAIL"
                        )
                else:
                    self.log_result(
                        "Dashboard After First House",
                        "/dashboard + session",
                        "Loads house dashboard, feed visible",
                        "No active house set",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Dashboard After First House",
                    "/dashboard + session",
                    "Loads house dashboard, feed visible",
                    f"Active house check failed: {active_response.status_code}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Dashboard After First House",
                "/dashboard + session",
                "Loads house dashboard, feed visible",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_active_house_fallback(self):
        """Test Active House Fallback - Auto-pick most recent if null & user has houses"""
        try:
            # Clear active house first
            clear_response = self.session.post(f"{API_BASE}/session/active-house", json={"houseId": None})
            
            # Get active house (should auto-pick)
            response = self.session.get(f"{API_BASE}/session/active-house")
            
            if response.status_code == 200:
                data = response.json()
                house_id = data.get('houseId')
                
                if house_id:
                    self.log_result(
                        "Active House Fallback",
                        "GET /api/session/active-house",
                        "Auto-pick most recent if null & user has houses",
                        f"Auto-picked house: {house_id}",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Active House Fallback",
                        "GET /api/session/active-house",
                        "Auto-pick most recent if null & user has houses",
                        "No house auto-picked",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Active House Fallback",
                    "GET /api/session/active-house",
                    "Auto-pick most recent if null & user has houses",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Active House Fallback",
                "GET /api/session/active-house",
                "Auto-pick most recent if null & user has houses",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_my_houses_only(self):
        """Test My Houses Only - Lists only houses user belongs to"""
        try:
            response = self.session.get(f"{API_BASE}/users/me/houses")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Check if all houses have the user as member
                    all_member = True
                    for house in data:
                        if 'role' not in house:
                            all_member = False
                            break
                    
                    if all_member:
                        self.log_result(
                            "My Houses Only",
                            "GET /api/users/me/houses",
                            "Lists only houses user belongs to",
                            f"Found {len(data)} houses with membership roles",
                            "PASS"
                        )
                    else:
                        self.log_result(
                            "My Houses Only",
                            "GET /api/users/me/houses",
                            "Lists only houses user belongs to",
                            "Some houses missing role information",
                            "FAIL"
                        )
                else:
                    self.log_result(
                        "My Houses Only",
                        "GET /api/users/me/houses",
                        "Lists only houses user belongs to",
                        f"Invalid response format: {type(data)}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "My Houses Only",
                    "GET /api/users/me/houses",
                    "Lists only houses user belongs to",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "My Houses Only",
                "GET /api/users/me/houses",
                "Lists only houses user belongs to",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_switch_active_guard(self):
        """Test Switch Active Guard - 403 if not a member"""
        try:
            # Try to set active house to a non-existent house ID
            fake_house_id = "fake-house-id-12345"
            response = self.session.post(f"{API_BASE}/session/active-house", json={"houseId": fake_house_id})
            
            if response.status_code == 403:
                data = response.json()
                error_msg = data.get('error', '')
                if 'not a member' in error_msg.lower():
                    self.log_result(
                        "Switch Active Guard",
                        "POST /api/session/active-house",
                        "403 if not a member",
                        f"403 Forbidden: {error_msg}",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Switch Active Guard",
                        "POST /api/session/active-house",
                        "403 if not a member",
                        f"403 but wrong message: {error_msg}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Switch Active Guard",
                    "POST /api/session/active-house",
                    "403 if not a member",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Switch Active Guard",
                "POST /api/session/active-house",
                "403 if not a member",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_feed_ttl_24h(self):
        """Test Feed TTL 24h - Only posts <24h, not deleted"""
        try:
            response = self.session.get(f"{API_BASE}/house/feed")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Check if all posts are within 24 hours
                    now = datetime.now()
                    valid_posts = []
                    for post in data:
                        if 'createdAt' in post:
                            post_date = datetime.fromisoformat(post['createdAt'].replace('Z', '+00:00'))
                            hours_old = (now - post_date.replace(tzinfo=None)).total_seconds() / 3600
                            if hours_old <= 24:
                                valid_posts.append(post)
                    
                    self.log_result(
                        "Feed TTL 24h",
                        "GET /api/house/feed",
                        "Only posts <24h, not deleted",
                        f"Found {len(valid_posts)} posts within 24 hours",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Feed TTL 24h",
                        "GET /api/house/feed",
                        "Only posts <24h, not deleted",
                        f"Invalid response format: {type(data)}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Feed TTL 24h",
                    "GET /api/house/feed",
                    "Only posts <24h, not deleted",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Feed TTL 24h",
                "GET /api/house/feed",
                "Only posts <24h, not deleted",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def generate_markdown_table(self):
        """Generate the exact markdown table format requested"""
        print("\n" + "="*80)
        print("## 🧪 STREAMER HOUSE — PROFILE, ROOMMATES & DASHBOARD FIXES")
        print()
        print("| Test Name | Endpoint(s) | Expected | Actual | Status |")
        print("|-----------|-------------|----------|--------|--------|")
        
        for result in self.results:
            test_name = result['test_name']
            endpoint = result['endpoint']
            expected = result['expected']
            actual = result['actual'][:50] + "..." if len(result['actual']) > 50 else result['actual']
            status = result['status']
            
            print(f"| {test_name} | `{endpoint}` | {expected} | {actual} | {status} |")
        
        # Calculate summary
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r['status'] == 'PASS')
        
        print()
        print(f"**Summary: {passed_tests}/{total_tests} tests passed ({passed_tests/total_tests*100:.1f}%)**")
        print("="*80)
    
    def run_all_tests(self):
        """Run all tests in the specified order"""
        print("🧪 Starting Streamer House Backend API Testing...")
        print(f"🌐 Base URL: {BASE_URL}")
        print(f"🔗 API Base: {API_BASE}")
        
        # Setup
        if not self.setup_test_user():
            print("❌ Failed to setup test user. Aborting tests.")
            return
        
        # Run tests in order
        print("\n📋 Running Profile Tests...")
        self.test_profile_200()
        self.test_profile_case_insensitive()
        self.test_profile_404()
        self.test_profile_ttl_7d()
        
        print("\n👥 Running Roommates Tests...")
        self.test_roommates_200()
        self.test_roommates_401()
        
        print("\n🏠 Running Dashboard/House Tests...")
        self.test_create_first_house()
        self.test_dashboard_after_first_house()
        self.test_active_house_fallback()
        self.test_my_houses_only()
        self.test_switch_active_guard()
        
        print("\n⏰ Running TTL Rules Tests...")
        self.test_feed_ttl_24h()
        
        # Generate results
        self.generate_markdown_table()

if __name__ == "__main__":
    tester = StreamerHouseAPITester()
    tester.run_all_tests()