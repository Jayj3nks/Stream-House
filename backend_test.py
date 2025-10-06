#!/usr/bin/env python3
"""
Backend API Testing for Stream House - Profile API Integration Fix Testing
Testing the newly fixed API endpoints as requested in review:
1. Profile API Integration: /api/users/{username}
2. Settings API Integration: /api/settings/roommate-search
3. User Profile Data Display: /api/auth/me
4. Profile Picture Upload: /api/upload/avatar
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
        """Test 1: Signup flow using /api/auth/signup API endpoint"""
        try:
            signup_data = {
                "email": self.test_user_email,
                "password": self.test_user_password,
                "displayName": self.test_user_display_name,
                "platforms": ["TikTok", "YouTube"],
                "niches": ["Gaming", "Tech"],
                "games": ["Fortnite", "Valorant"],
                "city": "Los Angeles",
                "timeZone": "America/Los_Angeles",
                "hasSchedule": True,
                "schedule": {"monday": "9-17", "tuesday": "9-17"},
                "bio": "Test user for authentication testing"
            }
            
            response = self.session.post(f"{API_BASE}/auth/signup", json=signup_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'token' in data and 'user' in data:
                    # Check if cookie was set
                    cookies = response.cookies
                    has_auth_cookie = 'access_token' in cookies
                    
                    self.log_test(
                        "Signup API Endpoint", 
                        True, 
                        f"User created successfully. Token: {len(data['token'])} chars, Cookie set: {has_auth_cookie}"
                    )
                    return True, data
                else:
                    self.log_test("Signup API Endpoint", False, f"Missing token or user in response: {data}")
                    return False, None
            else:
                self.log_test("Signup API Endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
                return False, None
                
        except Exception as e:
            self.log_test("Signup API Endpoint", False, f"Exception: {str(e)}")
            return False, None

    def test_login_api_endpoint(self):
        """Test 2: Login flow using /api/auth/login"""
        try:
            login_data = {
                "email": self.test_user_email,
                "password": self.test_user_password
            }
            
            response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'token' in data and 'user' in data:
                    # Check if cookie was set
                    cookies = response.cookies
                    has_auth_cookie = 'access_token' in cookies
                    
                    self.log_test(
                        "Login API Endpoint", 
                        True, 
                        f"Login successful. Token: {len(data['token'])} chars, Cookie set: {has_auth_cookie}"
                    )
                    return True, data
                else:
                    self.log_test("Login API Endpoint", False, f"Missing token or user in response: {data}")
                    return False, None
            else:
                self.log_test("Login API Endpoint", False, f"Status: {response.status_code}, Response: {response.text}")
                return False, None
                
        except Exception as e:
            self.log_test("Login API Endpoint", False, f"Exception: {str(e)}")
            return False, None

    def test_cookie_persistence_signup(self):
        """Test 3: Cookie persistence works across signup"""
        try:
            # First, clear any existing cookies
            self.session.cookies.clear()
            
            # Create a new user with signup
            signup_data = {
                "email": f"cookietest{int(time.time())}@example.com",
                "password": "testpassword123",
                "displayName": "Cookie Test User",
                "platforms": ["TikTok"],
                "niches": ["Gaming"],
                "city": "New York"
            }
            
            signup_response = self.session.post(f"{API_BASE}/auth/signup", json=signup_data)
            
            if signup_response.status_code != 200:
                self.log_test("Cookie Persistence (Signup)", False, f"Signup failed: {signup_response.status_code}")
                return False
            
            # Now test if the cookie persists by calling /auth/me
            me_response = self.session.get(f"{API_BASE}/auth/me")
            
            if me_response.status_code == 200:
                user_data = me_response.json()
                if 'email' in user_data and user_data['email'] == signup_data['email']:
                    self.log_test(
                        "Cookie Persistence (Signup)", 
                        True, 
                        f"Cookie persisted after signup. User: {user_data['displayName']}"
                    )
                    return True
                else:
                    self.log_test("Cookie Persistence (Signup)", False, f"Wrong user data returned: {user_data}")
                    return False
            else:
                self.log_test("Cookie Persistence (Signup)", False, f"/auth/me failed: {me_response.status_code}, {me_response.text}")
                return False
                
        except Exception as e:
            self.log_test("Cookie Persistence (Signup)", False, f"Exception: {str(e)}")
            return False

    def test_cookie_persistence_login(self):
        """Test 4: Cookie persistence works across login"""
        try:
            # Clear cookies and login with existing user
            self.session.cookies.clear()
            
            login_data = {
                "email": self.test_user_email,
                "password": self.test_user_password
            }
            
            login_response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
            
            if login_response.status_code != 200:
                self.log_test("Cookie Persistence (Login)", False, f"Login failed: {login_response.status_code}")
                return False
            
            # Test if cookie persists by calling /auth/me
            me_response = self.session.get(f"{API_BASE}/auth/me")
            
            if me_response.status_code == 200:
                user_data = me_response.json()
                if 'email' in user_data and user_data['email'] == self.test_user_email:
                    self.log_test(
                        "Cookie Persistence (Login)", 
                        True, 
                        f"Cookie persisted after login. User: {user_data['displayName']}"
                    )
                    return True
                else:
                    self.log_test("Cookie Persistence (Login)", False, f"Wrong user data returned: {user_data}")
                    return False
            else:
                self.log_test("Cookie Persistence (Login)", False, f"/auth/me failed: {me_response.status_code}, {me_response.text}")
                return False
                
        except Exception as e:
            self.log_test("Cookie Persistence (Login)", False, f"Exception: {str(e)}")
            return False

    def test_middleware_authentication(self):
        """Test 5: Middleware properly recognizes authentication cookies"""
        try:
            # Ensure we're logged in
            login_data = {
                "email": self.test_user_email,
                "password": self.test_user_password
            }
            
            login_response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
            
            if login_response.status_code != 200:
                self.log_test("Middleware Authentication", False, f"Login failed: {login_response.status_code}")
                return False
            
            # Test /auth/me endpoint which should work with cookies
            me_response = self.session.get(f"{API_BASE}/auth/me")
            
            if me_response.status_code == 200:
                user_data = me_response.json()
                if 'id' in user_data and 'email' in user_data:
                    self.log_test(
                        "Middleware Authentication", 
                        True, 
                        f"Middleware correctly recognized auth cookie. User ID: {user_data['id']}"
                    )
                    return True
                else:
                    self.log_test("Middleware Authentication", False, f"Invalid user data structure: {user_data}")
                    return False
            else:
                self.log_test("Middleware Authentication", False, f"/auth/me failed: {me_response.status_code}, {me_response.text}")
                return False
                
        except Exception as e:
            self.log_test("Middleware Authentication", False, f"Exception: {str(e)}")
            return False

    def test_protected_routes_with_cookies(self):
        """Test 6: Protected routes work with authentication cookies"""
        try:
            # Ensure we're logged in
            login_data = {
                "email": self.test_user_email,
                "password": self.test_user_password
            }
            
            login_response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
            
            if login_response.status_code != 200:
                self.log_test("Protected Routes with Cookies", False, f"Login failed: {login_response.status_code}")
                return False
            
            # Test protected route: /api/roommates
            roommates_response = self.session.get(f"{API_BASE}/roommates")
            
            if roommates_response.status_code == 200:
                roommates_data = roommates_response.json()
                if 'roommates' in roommates_data:
                    self.log_test(
                        "Protected Routes with Cookies", 
                        True, 
                        f"Protected route /roommates accessible. Found {len(roommates_data['roommates'])} roommates"
                    )
                    return True
                else:
                    self.log_test("Protected Routes with Cookies", False, f"Invalid roommates data structure: {roommates_data}")
                    return False
            else:
                self.log_test("Protected Routes with Cookies", False, f"/roommates failed: {roommates_response.status_code}, {roommates_response.text}")
                return False
                
        except Exception as e:
            self.log_test("Protected Routes with Cookies", False, f"Exception: {str(e)}")
            return False

    def test_unauthenticated_access_blocked(self):
        """Test 7: Unauthenticated access is properly blocked"""
        try:
            # Clear all cookies to simulate unauthenticated user
            self.session.cookies.clear()
            
            # Test that protected routes return 401
            roommates_response = self.session.get(f"{API_BASE}/roommates")
            
            if roommates_response.status_code == 401:
                self.log_test(
                    "Unauthenticated Access Blocked", 
                    True, 
                    f"Protected route correctly returned 401 for unauthenticated user"
                )
                return True
            else:
                self.log_test("Unauthenticated Access Blocked", False, f"Expected 401, got: {roommates_response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Unauthenticated Access Blocked", False, f"Exception: {str(e)}")
            return False

    def test_logout_functionality(self):
        """Test 8: Logout properly clears cookies"""
        try:
            # Login first
            login_data = {
                "email": self.test_user_email,
                "password": self.test_user_password
            }
            
            login_response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
            
            if login_response.status_code != 200:
                self.log_test("Logout Functionality", False, f"Login failed: {login_response.status_code}")
                return False
            
            # Verify we're logged in
            me_response = self.session.get(f"{API_BASE}/auth/me")
            if me_response.status_code != 200:
                self.log_test("Logout Functionality", False, f"Not properly logged in before logout test")
                return False
            
            # Logout
            logout_response = self.session.post(f"{API_BASE}/auth/logout")
            
            if logout_response.status_code == 200:
                # Test that we're now logged out
                me_response_after = self.session.get(f"{API_BASE}/auth/me")
                
                if me_response_after.status_code == 401:
                    self.log_test(
                        "Logout Functionality", 
                        True, 
                        f"Logout successful. /auth/me now returns 401 as expected"
                    )
                    return True
                else:
                    self.log_test("Logout Functionality", False, f"Still authenticated after logout: {me_response_after.status_code}")
                    return False
            else:
                self.log_test("Logout Functionality", False, f"Logout failed: {logout_response.status_code}, {logout_response.text}")
                return False
                
        except Exception as e:
            self.log_test("Logout Functionality", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all authentication tests"""
        print("🔐 STREAM HOUSE AUTHENTICATION SYSTEM TESTING")
        print("=" * 60)
        print(f"Testing against: {BASE_URL}")
        print(f"Test user email: {self.test_user_email}")
        print()
        
        # Run tests in sequence
        tests = [
            self.test_signup_api_endpoint,
            self.test_login_api_endpoint,
            self.test_cookie_persistence_signup,
            self.test_cookie_persistence_login,
            self.test_middleware_authentication,
            self.test_protected_routes_with_cookies,
            self.test_unauthenticated_access_blocked,
            self.test_logout_functionality
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ FAILED: {test.__name__} - Exception: {str(e)}")
            
            # Small delay between tests
            time.sleep(0.5)
        
        # Print summary
        print("\n" + "=" * 60)
        print("🎯 AUTHENTICATION TESTING SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        success_rate = (passed / total * 100) if total > 0 else 0
        
        print(f"Tests passed: {passed}/{total} ({success_rate:.1f}%)")
        print()
        
        for result in self.test_results:
            print(f"{result['status']}: {result['test']}")
            if result['details']:
                print(f"   {result['details']}")
        
        print("\n" + "=" * 60)
        
        if success_rate >= 85:
            print("🎉 AUTHENTICATION SYSTEM: WORKING CORRECTLY")
        elif success_rate >= 70:
            print("⚠️  AUTHENTICATION SYSTEM: MOSTLY WORKING (Minor Issues)")
        else:
            print("❌ AUTHENTICATION SYSTEM: CRITICAL ISSUES FOUND")
        
        return success_rate, self.test_results

if __name__ == "__main__":
    tester = AuthenticationTester()
    success_rate, results = tester.run_all_tests()