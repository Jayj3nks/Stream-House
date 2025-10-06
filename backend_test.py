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

    def run_comprehensive_test(self):
        """Run all tests in sequence"""
        print("🏠 STREAM HOUSE BACKEND API TESTING - Profile Integration Fix Verification")
        print("=" * 80)
        
        results = {}
        
        # Test 1: Signup and get username
        results['signup'] = self.test_signup_and_get_username()
        
        if not results['signup']:
            print("\n❌ CRITICAL: Cannot proceed with testing - signup failed")
            return results
        
        # Test 2: Auth/me endpoint for user profile data
        results['auth_me'] = self.test_auth_me_endpoint()
        
        # Test 3: Profile API integration with actual username
        results['profile_api'] = self.test_profile_api_integration()
        
        # Test 4: Settings API for privacy toggle
        results['settings_api'] = self.test_settings_roommate_search_api()
        
        # Test 5: Avatar upload functionality
        results['avatar_upload'] = self.test_avatar_upload_api()
        
        # Test 6: Privacy default setting
        results['privacy_default'] = self.test_privacy_default_for_new_users()
        
        # Summary
        print("\n" + "=" * 80)
        print("🎯 TEST RESULTS SUMMARY")
        print("=" * 80)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASSED" if result else "❌ FAILED"
            print(f"{test_name.upper().replace('_', ' ')}: {status}")
        
        print(f"\nOVERALL: {passed}/{total} tests passed ({passed/total*100:.1f}% success rate)")
        
        if passed == total:
            print("🎉 ALL TESTS PASSED - Profile API integration fixes verified!")
        else:
            print("⚠️  Some tests failed - issues need attention")
        
        return results

if __name__ == "__main__":
    tester = StreamHouseAPITester()
    results = tester.run_comprehensive_test()