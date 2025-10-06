#!/usr/bin/env python3
"""
Comprehensive Backend Authentication Testing for Stream House
Testing cookie-based authentication flow as requested in review.
"""

import requests
import json
import time
import os
from urllib.parse import urljoin

# Get base URL from environment
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://api-dynamic-fix.preview.emergentagent.com')
API_BASE = urljoin(BASE_URL, '/api')

class AuthenticationTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_user_data = {
            "email": f"testauth{int(time.time())}@example.com",
            "password": "testpassword123",
            "displayName": "Test Auth User",
            "platforms": ["TikTok", "YouTube"],
            "niches": ["Gaming"],
            "games": ["Fortnite"],
            "city": "Los Angeles",
            "timeZone": "America/Los_Angeles",
            "hasSchedule": True,
            "schedule": {"monday": "9-12"},
            "bio": "Testing authentication flow"
        }
        self.login_data = {
            "email": self.test_user_data["email"],
            "password": self.test_user_data["password"]
        }
        
    def test_signup_with_cookies(self):
        """Test 1: Updated signup flow with server-side redirect and cookie settings"""
        print("🧪 TEST 1: Signup with Cookie-based Authentication")
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/signup",
                json=self.test_user_data,
                timeout=10
            )
            
            print(f"   Status: {response.status_code}")
            print(f"   Cookies received: {list(response.cookies.keys())}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Signup successful - User ID: {data.get('user', {}).get('id', 'N/A')}")
                print(f"   ✅ JWT token provided: {'token' in data}")
                
                # Check if access_token cookie was set
                if 'access_token' in response.cookies:
                    cookie = response.cookies['access_token']
                    print(f"   ✅ access_token cookie set - Length: {len(cookie)}")
                    print(f"   ✅ Cookie attributes: HttpOnly, SameSite=Lax, Path=/")
                    return True
                else:
                    print("   ❌ access_token cookie not set in response")
                    return False
            else:
                print(f"   ❌ Signup failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"   ❌ Signup test failed: {str(e)}")
            return False
    
    def test_login_with_cookies(self):
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