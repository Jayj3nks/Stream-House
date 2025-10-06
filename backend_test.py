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
        """Test 2: Updated login API endpoint with consistent cookie settings"""
        print("\n🧪 TEST 2: Login with Consistent Cookie Settings")
        
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json=self.login_data,
                timeout=10
            )
            
            print(f"   Status: {response.status_code}")
            print(f"   Cookies received: {list(response.cookies.keys())}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Login successful - User: {data.get('user', {}).get('displayName', 'N/A')}")
                
                # Check if access_token cookie was set
                if 'access_token' in response.cookies:
                    cookie = response.cookies['access_token']
                    print(f"   ✅ access_token cookie set - Length: {len(cookie)}")
                    print(f"   ✅ Cookie settings consistent with signup")
                    return True
                else:
                    print("   ❌ access_token cookie not set in login response")
                    return False
            else:
                print(f"   ❌ Login failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"   ❌ Login test failed: {str(e)}")
            return False
    
    def test_auth_me_with_cookies(self):
        """Test 3: Verify /api/auth/me works with cookie authentication"""
        print("\n🧪 TEST 3: /api/auth/me with Cookie Authentication")
        
        try:
            # Test with cookies from previous login
            response = self.session.get(
                f"{API_BASE}/auth/me",
                timeout=10
            )
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print(f"   ✅ Auth/me successful - User: {data.get('displayName', 'N/A')}")
                print(f"   ✅ Cookie authentication working")
                print(f"   ✅ User data includes: {list(data.keys())}")
                return True
            else:
                print(f"   ❌ Auth/me failed: {response.text}")
                return False
                
        except Exception as e:
            print(f"   ❌ Auth/me test failed: {str(e)}")
            return False
    
    def test_protected_route_access(self):
        """Test 4: Test protected routes with cookie authentication"""
        print("\n🧪 TEST 4: Protected Route Access with Cookies")
        
        protected_routes = [
            "/roommates",
            "/users/me/houses"
        ]
        
        results = []
        
        for route in protected_routes:
            try:
                response = self.session.get(
                    f"{API_BASE}{route}",
                    timeout=10
                )
                
                print(f"   Route {route}: Status {response.status_code}")
                
                if response.status_code == 200:
                    print(f"   ✅ {route} - Cookie authentication accepted")
                    results.append(True)
                elif response.status_code == 401:
                    print(f"   ❌ {route} - Cookie authentication rejected (401)")
                    results.append(False)
                else:
                    print(f"   ⚠️ {route} - Unexpected status: {response.status_code}")
                    results.append(False)
                    
            except Exception as e:
                print(f"   ❌ {route} test failed: {str(e)}")
                results.append(False)
        
        return all(results)
    
    def test_middleware_authentication(self):
        """Test 5: Test middleware authentication with proper cookies"""
        print("\n🧪 TEST 5: Middleware Authentication Test")
        
        # Test without cookies (should fail)
        fresh_session = requests.Session()
        
        try:
            response = fresh_session.get(
                f"{API_BASE}/auth/me",
                timeout=10
            )
            
            print(f"   Without cookies - Status: {response.status_code}")
            
            if response.status_code == 401:
                print("   ✅ Middleware correctly rejects requests without cookies")
                
                # Test with cookies (should succeed)
                response = self.session.get(
                    f"{API_BASE}/auth/me",
                    timeout=10
                )
                
                print(f"   With cookies - Status: {response.status_code}")
                
                if response.status_code == 200:
                    print("   ✅ Middleware correctly accepts requests with valid cookies")
                    return True
                else:
                    print("   ❌ Middleware rejects valid cookies")
                    return False
            else:
                print("   ❌ Middleware doesn't properly protect routes")
                return False
                
        except Exception as e:
            print(f"   ❌ Middleware test failed: {str(e)}")
            return False
    
    def test_complete_auth_flow(self):
        """Test 6: Complete signup -> login -> protected route access flow"""
        print("\n🧪 TEST 6: Complete Authentication Flow")
        
        # Create a fresh session for complete flow test
        flow_session = requests.Session()
        
        # Step 1: Signup
        print("   Step 1: Signup...")
        try:
            signup_response = flow_session.post(
                f"{API_BASE}/auth/signup",
                json={
                    **self.test_user_data,
                    "email": f"flowtest{int(time.time())}@example.com"
                },
                timeout=10
            )
            
            if signup_response.status_code != 200:
                print(f"   ❌ Signup failed: {signup_response.text}")
                return False
                
            print("   ✅ Signup successful")
            
        except Exception as e:
            print(f"   ❌ Signup step failed: {str(e)}")
            return False
        
        # Step 2: Verify auth/me works immediately after signup
        print("   Step 2: Verify immediate authentication...")
        try:
            auth_response = flow_session.get(
                f"{API_BASE}/auth/me",
                timeout=10
            )
            
            if auth_response.status_code != 200:
                print(f"   ❌ Immediate auth check failed: {auth_response.text}")
                return False
                
            print("   ✅ Immediate authentication working")
            
        except Exception as e:
            print(f"   ❌ Immediate auth check failed: {str(e)}")
            return False
        
        # Step 3: Access protected route
        print("   Step 3: Access protected route...")
        try:
            protected_response = flow_session.get(
                f"{API_BASE}/roommates",
                timeout=10
            )
            
            if protected_response.status_code == 200:
                print("   ✅ Protected route access successful")
                return True
            else:
                print(f"   ❌ Protected route access failed: {protected_response.status_code}")
                return False
                
        except Exception as e:
            print(f"   ❌ Protected route access failed: {str(e)}")
            return False
    
    def test_cookie_persistence(self):
        """Test 7: Cookie persistence and domain settings"""
        print("\n🧪 TEST 7: Cookie Persistence and Domain Settings")
        
        try:
            # Login to get fresh cookies
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json=self.login_data,
                timeout=10
            )
            
            if response.status_code != 200:
                print(f"   ❌ Login for cookie test failed: {response.text}")
                return False
            
            # Check cookie attributes
            if 'access_token' in response.cookies:
                cookie = response.cookies['access_token']
                print(f"   ✅ Cookie value length: {len(cookie)}")
                
                # Test cookie persistence by making another request
                time.sleep(1)  # Small delay
                
                auth_response = self.session.get(
                    f"{API_BASE}/auth/me",
                    timeout=10
                )
                
                if auth_response.status_code == 200:
                    print("   ✅ Cookie persists across requests")
                    return True
                else:
                    print(f"   ❌ Cookie doesn't persist: {auth_response.status_code}")
                    return False
            else:
                print("   ❌ No access_token cookie in response")
                return False
                
        except Exception as e:
            print(f"   ❌ Cookie persistence test failed: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all authentication tests"""
        print("🚀 STARTING COMPREHENSIVE AUTHENTICATION TESTING")
        print("=" * 60)
        
        tests = [
            ("Signup with Cookies", self.test_signup_with_cookies),
            ("Login with Cookies", self.test_login_with_cookies),
            ("Auth/Me with Cookies", self.test_auth_me_with_cookies),
            ("Protected Route Access", self.test_protected_route_access),
            ("Middleware Authentication", self.test_middleware_authentication),
            ("Complete Auth Flow", self.test_complete_auth_flow),
            ("Cookie Persistence", self.test_cookie_persistence)
        ]
        
        results = []
        
        for test_name, test_func in tests:
            try:
                result = test_func()
                results.append((test_name, result))
            except Exception as e:
                print(f"   ❌ {test_name} crashed: {str(e)}")
                results.append((test_name, False))
        
        # Summary
        print("\n" + "=" * 60)
        print("🎯 AUTHENTICATION TESTING SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for _, result in results if result)
        total = len(results)
        
        for test_name, result in results:
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{status}: {test_name}")
        
        print(f"\n📊 RESULTS: {passed}/{total} tests passed ({passed/total*100:.1f}% success rate)")
        
        if passed == total:
            print("🎉 ALL AUTHENTICATION TESTS PASSED!")
        else:
            print("⚠️ SOME AUTHENTICATION TESTS FAILED - Review needed")
        
        return passed, total

if __name__ == "__main__":
    print(f"🔗 Testing authentication at: {BASE_URL}")
    print(f"🔗 API Base URL: {API_BASE}")
    
    tester = AuthenticationTester()
    passed, total = tester.run_all_tests()
    
    exit(0 if passed == total else 1)