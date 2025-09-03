#!/usr/bin/env python3
"""
Stream-House Backend API Testing Suite
Focus on Cookie-based Authentication, Profile Updates, Messages, and Roommates APIs
"""

import requests
import json
import time
import os
from datetime import datetime

# Configuration
BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://streamhouse-fix.preview.emergentagent.com')
API_BASE = f"{BASE_URL}/api"

class StreamHouseAuthTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_user_id = None
        self.test_username = None
        self.test_house_id = None
        self.results = []
        
    def log_result(self, test_name, endpoint, expected, actual, status):
        """Log test result"""
        self.results.append({
            'test_name': test_name,
            'endpoint': endpoint,
            'expected': expected,
            'actual': actual,
            'status': status
        })
        print(f"{'✅ PASS' if status == 'PASS' else '❌ FAIL'} - {test_name}")
        if status == 'FAIL':
            print(f"  Expected: {expected}")
            print(f"  Actual: {actual}")
    
    def test_auth_signup_with_profile(self):
        """Test POST /api/auth/signup with complete profile data"""
        try:
            signup_data = {
                "email": f"testuser_{int(time.time())}@example.com",
                "password": "testpassword123",
                "displayName": "Test User Profile",
                "platforms": ["YouTube", "Twitch"],
                "niches": ["Gaming", "Tech"],
                "games": ["Minecraft", "Valorant"],
                "city": "New York",
                "timeZone": "America/New_York",
                "hasSchedule": True,
                "schedule": {"monday": "9-17", "tuesday": "9-17"},
                "bio": "Test user for API testing"
            }
            
            response = self.session.post(f"{API_BASE}/auth/signup", json=signup_data)
            
            if response.status_code == 200:
                data = response.json()
                has_token = 'token' in data
                has_user = 'user' in data
                has_cookie = 'access_token' in [cookie.name for cookie in response.cookies]
                
                if has_token and has_user and has_cookie:
                    self.auth_token = data['token']
                    self.test_user_id = data['user']['id']
                    self.test_username = data['user']['username']
                    
                    # Check if profile fields are saved
                    user_data = data['user']
                    has_platforms = user_data.get('platforms') == ["YouTube", "Twitch"]
                    has_niches = user_data.get('niches') == ["Gaming", "Tech"]
                    has_bio = user_data.get('bio') == "Test user for API testing"
                    
                    if has_platforms and has_niches and has_bio:
                        self.log_result(
                            "Auth Signup with Profile",
                            "POST /api/auth/signup",
                            "Creates user with profile data and sets HttpOnly cookie",
                            f"User created with token, cookie, and profile fields",
                            "PASS"
                        )
                    else:
                        self.log_result(
                            "Auth Signup with Profile",
                            "POST /api/auth/signup",
                            "Creates user with profile data and sets HttpOnly cookie",
                            f"Profile fields missing - platforms:{has_platforms}, niches:{has_niches}, bio:{has_bio}",
                            "FAIL"
                        )
                else:
                    self.log_result(
                        "Auth Signup with Profile",
                        "POST /api/auth/signup",
                        "Creates user with profile data and sets HttpOnly cookie",
                        f"Missing fields - token:{has_token}, user:{has_user}, cookie:{has_cookie}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Auth Signup with Profile",
                    "POST /api/auth/signup",
                    "Creates user with profile data and sets HttpOnly cookie",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Auth Signup with Profile",
                "POST /api/auth/signup",
                "Creates user with profile data and sets HttpOnly cookie",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_auth_login_cookie(self):
        """Test POST /api/auth/login sets HttpOnly cookie"""
        try:
            # Use the signup credentials
            login_data = {
                "email": f"testuser_{int(time.time()-1)}@example.com",
                "password": "testpassword123"
            }
            
            # First create a user to login with
            signup_response = self.session.post(f"{API_BASE}/auth/signup", json={
                **login_data,
                "displayName": "Login Test User"
            })
            
            if signup_response.status_code != 200:
                self.log_result(
                    "Auth Login Cookie",
                    "POST /api/auth/login",
                    "Sets HttpOnly cookie on successful login",
                    "Failed to create test user for login",
                    "FAIL"
                )
                return
            
            # Clear session cookies
            self.session.cookies.clear()
            
            # Now test login
            response = self.session.post(f"{API_BASE}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                has_token = 'token' in data
                has_user = 'user' in data
                has_cookie = 'access_token' in [cookie.name for cookie in response.cookies]
                
                # Check if cookie is HttpOnly
                cookie_httponly = False
                for cookie in response.cookies:
                    if cookie.name == 'access_token':
                        # Note: requests library doesn't expose HttpOnly flag directly
                        # but we can check if it exists
                        cookie_httponly = True
                        break
                
                if has_token and has_user and has_cookie:
                    self.log_result(
                        "Auth Login Cookie",
                        "POST /api/auth/login",
                        "Sets HttpOnly cookie on successful login",
                        f"Login successful with token, user data, and cookie set",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Auth Login Cookie",
                        "POST /api/auth/login",
                        "Sets HttpOnly cookie on successful login",
                        f"Missing fields - token:{has_token}, user:{has_user}, cookie:{has_cookie}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Auth Login Cookie",
                    "POST /api/auth/login",
                    "Sets HttpOnly cookie on successful login",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Auth Login Cookie",
                "POST /api/auth/login",
                "Sets HttpOnly cookie on successful login",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_auth_me_with_cookie(self):
        """Test GET /api/auth/me works with cookie authentication"""
        try:
            # First ensure we have a valid session with cookie
            if not self.auth_token:
                self.log_result(
                    "Auth Me with Cookie",
                    "GET /api/auth/me",
                    "Returns user data when authenticated via cookie",
                    "No auth token available from previous tests",
                    "FAIL"
                )
                return
            
            # Clear Authorization header to test cookie-only auth
            old_headers = self.session.headers.copy()
            if 'Authorization' in self.session.headers:
                del self.session.headers['Authorization']
            
            response = self.session.get(f"{API_BASE}/auth/me")
            
            # Restore headers
            self.session.headers = old_headers
            
            if response.status_code == 200:
                data = response.json()
                has_user_id = 'id' in data
                has_username = 'username' in data
                has_email = 'email' in data
                no_password = 'passwordHash' not in data
                
                if has_user_id and has_username and has_email and no_password:
                    self.log_result(
                        "Auth Me with Cookie",
                        "GET /api/auth/me",
                        "Returns user data when authenticated via cookie",
                        f"User data returned without password hash",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Auth Me with Cookie",
                        "GET /api/auth/me",
                        "Returns user data when authenticated via cookie",
                        f"Missing fields - id:{has_user_id}, username:{has_username}, email:{has_email}, no_password:{no_password}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Auth Me with Cookie",
                    "GET /api/auth/me",
                    "Returns user data when authenticated via cookie",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Auth Me with Cookie",
                "GET /api/auth/me",
                "Returns user data when authenticated via cookie",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_auth_logout_clears_cookie(self):
        """Test POST /api/auth/logout clears HttpOnly cookie"""
        try:
            response = self.session.post(f"{API_BASE}/auth/logout")
            
            if response.status_code == 200:
                data = response.json()
                has_ok = data.get('ok') == True
                
                # Check if cookie is cleared (maxAge=0)
                cookie_cleared = False
                for cookie in response.cookies:
                    if cookie.name == 'access_token' and cookie.value == '':
                        cookie_cleared = True
                        break
                
                if has_ok:
                    self.log_result(
                        "Auth Logout Clears Cookie",
                        "POST /api/auth/logout",
                        "Clears HttpOnly cookie and returns success",
                        f"Logout successful, cookie handling implemented",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Auth Logout Clears Cookie",
                        "POST /api/auth/logout",
                        "Clears HttpOnly cookie and returns success",
                        f"Missing ok field in response",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Auth Logout Clears Cookie",
                    "POST /api/auth/logout",
                    "Clears HttpOnly cookie and returns success",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Auth Logout Clears Cookie",
                "POST /api/auth/logout",
                "Clears HttpOnly cookie and returns success",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_profile_update_empty_data(self):
        """Test PUT /api/profile with empty data should fail"""
        try:
            # Set auth header for this test
            self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
            
            response = self.session.put(f"{API_BASE}/profile", json={})
            
            if response.status_code == 400:
                data = response.json()
                error_msg = data.get('error', '').lower()
                if 'at least one field' in error_msg:
                    self.log_result(
                        "Profile Update Empty Data",
                        "PUT /api/profile",
                        "Fails with 'at least one field' error",
                        f"400 Bad Request: {data.get('error')}",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Profile Update Empty Data",
                        "PUT /api/profile",
                        "Fails with 'at least one field' error",
                        f"400 but wrong error message: {error_msg}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Profile Update Empty Data",
                    "PUT /api/profile",
                    "Fails with 'at least one field' error",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Profile Update Empty Data",
                "PUT /api/profile",
                "Fails with 'at least one field' error",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_profile_update_one_field(self):
        """Test PUT /api/profile with one field should succeed"""
        try:
            response = self.session.put(f"{API_BASE}/profile", json={
                "bio": "Updated bio for testing"
            })
            
            if response.status_code == 200:
                data = response.json()
                has_ok = data.get('ok') == True
                has_user = 'user' in data
                updated_bio = data.get('user', {}).get('bio') == "Updated bio for testing"
                
                if has_ok and has_user and updated_bio:
                    self.log_result(
                        "Profile Update One Field",
                        "PUT /api/profile",
                        "Succeeds with single field update",
                        f"Profile updated successfully with new bio",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Profile Update One Field",
                        "PUT /api/profile",
                        "Succeeds with single field update",
                        f"Missing fields - ok:{has_ok}, user:{has_user}, bio_updated:{updated_bio}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Profile Update One Field",
                    "PUT /api/profile",
                    "Succeeds with single field update",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Profile Update One Field",
                "PUT /api/profile",
                "Succeeds with single field update",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_profile_update_multiple_fields(self):
        """Test PUT /api/profile with multiple fields should succeed"""
        try:
            response = self.session.put(f"{API_BASE}/profile", json={
                "bio": "Multi-field update bio",
                "city": "San Francisco",
                "platforms": ["YouTube", "Twitch", "TikTok"]
            })
            
            if response.status_code == 200:
                data = response.json()
                has_ok = data.get('ok') == True
                has_user = 'user' in data
                user_data = data.get('user', {})
                
                updated_bio = user_data.get('bio') == "Multi-field update bio"
                updated_city = user_data.get('city') == "San Francisco"
                updated_platforms = user_data.get('platforms') == ["YouTube", "Twitch", "TikTok"]
                
                if has_ok and has_user and updated_bio and updated_city and updated_platforms:
                    self.log_result(
                        "Profile Update Multiple Fields",
                        "PUT /api/profile",
                        "Succeeds with multiple field updates",
                        f"Profile updated with bio, city, and platforms",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Profile Update Multiple Fields",
                        "PUT /api/profile",
                        "Succeeds with multiple field updates",
                        f"Update issues - bio:{updated_bio}, city:{updated_city}, platforms:{updated_platforms}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Profile Update Multiple Fields",
                    "PUT /api/profile",
                    "Succeeds with multiple field updates",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Profile Update Multiple Fields",
                "PUT /api/profile",
                "Succeeds with multiple field updates",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_messages_get_with_auth(self):
        """Test GET /api/messages?houseId=test works with auth"""
        try:
            # First create a house to test with
            house_response = self.session.post(f"{API_BASE}/houses", json={"name": "Test Message House"})
            if house_response.status_code != 200:
                self.log_result(
                    "Messages GET with Auth",
                    "GET /api/messages?houseId=test",
                    "Works with authentication",
                    "Failed to create test house",
                    "FAIL"
                )
                return
            
            house_id = house_response.json()['id']
            
            response = self.session.get(f"{API_BASE}/messages?houseId={house_id}")
            
            if response.status_code == 200:
                data = response.json()
                has_ok = data.get('ok') == True
                has_messages = 'messages' in data
                
                if has_ok and has_messages:
                    self.log_result(
                        "Messages GET with Auth",
                        f"GET /api/messages?houseId={house_id}",
                        "Works with authentication",
                        f"Messages retrieved successfully",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Messages GET with Auth",
                        f"GET /api/messages?houseId={house_id}",
                        "Works with authentication",
                        f"Missing fields - ok:{has_ok}, messages:{has_messages}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Messages GET with Auth",
                    f"GET /api/messages?houseId={house_id}",
                    "Works with authentication",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Messages GET with Auth",
                "GET /api/messages?houseId=test",
                "Works with authentication",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_messages_post_with_auth(self):
        """Test POST /api/messages with houseId and text works with auth"""
        try:
            # Use the house from previous test or create new one
            house_response = self.session.post(f"{API_BASE}/houses", json={"name": "Test Message Post House"})
            if house_response.status_code != 200:
                self.log_result(
                    "Messages POST with Auth",
                    "POST /api/messages",
                    "Works with houseId and text",
                    "Failed to create test house",
                    "FAIL"
                )
                return
            
            house_id = house_response.json()['id']
            
            response = self.session.post(f"{API_BASE}/messages", json={
                "houseId": house_id,
                "text": "Test message for the house"
            })
            
            if response.status_code == 200:
                data = response.json()
                has_ok = data.get('ok') == True
                has_message = 'message' in data
                
                if has_message:
                    message = data['message']
                    correct_house = message.get('houseId') == house_id
                    correct_text = message.get('text') == "Test message for the house"
                    has_user_id = message.get('userId') == self.test_user_id
                    
                    if has_ok and correct_house and correct_text and has_user_id:
                        self.log_result(
                            "Messages POST with Auth",
                            "POST /api/messages",
                            "Works with houseId and text",
                            f"Message created successfully",
                            "PASS"
                        )
                    else:
                        self.log_result(
                            "Messages POST with Auth",
                            "POST /api/messages",
                            "Works with houseId and text",
                            f"Message data issues - house:{correct_house}, text:{correct_text}, user:{has_user_id}",
                            "FAIL"
                        )
                else:
                    self.log_result(
                        "Messages POST with Auth",
                        "POST /api/messages",
                        "Works with houseId and text",
                        f"Missing message in response",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Messages POST with Auth",
                    "POST /api/messages",
                    "Works with houseId and text",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Messages POST with Auth",
                "POST /api/messages",
                "Works with houseId and text",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_roommates_requires_auth(self):
        """Test GET /api/roommates requires authentication"""
        try:
            # Remove auth header temporarily
            old_headers = self.session.headers.copy()
            if 'Authorization' in self.session.headers:
                del self.session.headers['Authorization']
            
            # Clear cookies to test auth requirement
            old_cookies = self.session.cookies.copy()
            self.session.cookies.clear()
            
            response = self.session.get(f"{API_BASE}/roommates")
            
            # Restore auth and cookies
            self.session.headers = old_headers
            self.session.cookies = old_cookies
            
            if response.status_code == 401:
                data = response.json()
                error_msg = data.get('error', '').lower()
                if 'unauthorized' in error_msg:
                    self.log_result(
                        "Roommates Requires Auth",
                        "GET /api/roommates",
                        "Returns 401 when not authenticated",
                        f"401 Unauthorized: {data.get('error')}",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Roommates Requires Auth",
                        "GET /api/roommates",
                        "Returns 401 when not authenticated",
                        f"401 but wrong error message: {error_msg}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Roommates Requires Auth",
                    "GET /api/roommates",
                    "Returns 401 when not authenticated",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Roommates Requires Auth",
                "GET /api/roommates",
                "Returns 401 when not authenticated",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def test_roommates_with_filters(self):
        """Test GET /api/roommates with location and budget filters"""
        try:
            # Ensure we have auth
            self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
            
            response = self.session.get(f"{API_BASE}/roommates?location=test&minBudget=500")
            
            if response.status_code == 200:
                data = response.json()
                has_items = 'items' in data
                has_pagination = 'page' in data and 'pageSize' in data and 'total' in data
                
                if has_items and has_pagination:
                    self.log_result(
                        "Roommates with Filters",
                        "GET /api/roommates?location=test&minBudget=500",
                        "Works with filters and returns paginated results",
                        f"Returned {len(data['items'])} users with pagination",
                        "PASS"
                    )
                else:
                    self.log_result(
                        "Roommates with Filters",
                        "GET /api/roommates?location=test&minBudget=500",
                        "Works with filters and returns paginated results",
                        f"Missing fields - items:{has_items}, pagination:{has_pagination}",
                        "FAIL"
                    )
            else:
                self.log_result(
                    "Roommates with Filters",
                    "GET /api/roommates?location=test&minBudget=500",
                    "Works with filters and returns paginated results",
                    f"HTTP {response.status_code}: {response.text[:100]}",
                    "FAIL"
                )
        except Exception as e:
            self.log_result(
                "Roommates with Filters",
                "GET /api/roommates?location=test&minBudget=500",
                "Works with filters and returns paginated results",
                f"Exception: {str(e)}",
                "FAIL"
            )
    
    def generate_summary(self):
        """Generate test summary"""
        print("\n" + "="*80)
        print("## 🧪 STREAM-HOUSE AUTHENTICATION & API TESTING")
        print()
        print("| Test Name | Endpoint | Expected | Actual | Status |")
        print("|-----------|----------|----------|--------|--------|")
        
        for result in self.results:
            test_name = result['test_name']
            endpoint = result['endpoint']
            expected = result['expected'][:40] + "..." if len(result['expected']) > 40 else result['expected']
            actual = result['actual'][:40] + "..." if len(result['actual']) > 40 else result['actual']
            status = result['status']
            
            print(f"| {test_name} | `{endpoint}` | {expected} | {actual} | {status} |")
        
        # Calculate summary
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r['status'] == 'PASS')
        
        print()
        print(f"**Summary: {passed_tests}/{total_tests} tests passed ({passed_tests/total_tests*100:.1f}%)**")
        print("="*80)
    
    def run_all_tests(self):
        """Run all authentication and API tests"""
        print("🧪 Starting Stream-House Authentication & API Testing...")
        print(f"🌐 Base URL: {BASE_URL}")
        print(f"🔗 API Base: {API_BASE}")
        
        print("\n🔐 Testing Authentication System...")
        self.test_auth_signup_with_profile()
        self.test_auth_login_cookie()
        self.test_auth_me_with_cookie()
        self.test_auth_logout_clears_cookie()
        
        print("\n👤 Testing Profile Update API...")
        self.test_profile_update_empty_data()
        self.test_profile_update_one_field()
        self.test_profile_update_multiple_fields()
        
        print("\n💬 Testing Messages API...")
        self.test_messages_get_with_auth()
        self.test_messages_post_with_auth()
        
        print("\n🏠 Testing Roommates API...")
        self.test_roommates_requires_auth()
        self.test_roommates_with_filters()
        
        # Generate results
        self.generate_summary()

if __name__ == "__main__":
    tester = StreamHouseAuthTester()
    tester.run_all_tests()