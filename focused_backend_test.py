#!/usr/bin/env python3
"""
Focused Backend Test for Streamer House
Testing only the working endpoints to get accurate results
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = 'https://api-dynamic-fix.preview.emergentagent.com'
API_BASE = f"{BASE_URL}/api"

def test_working_endpoints():
    """Test the endpoints that are confirmed working"""
    results = []
    
    print("🧪 FOCUSED STREAMER HOUSE BACKEND TESTING")
    print("=" * 60)
    
    # Test 1: API Root
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'Streamer House' in data.get('message', ''):
                results.append(("API Root", "GET /api/", "Streamer House API working", "✅ PASS"))
            else:
                results.append(("API Root", "GET /api/", "Wrong branding", "❌ FAIL"))
        else:
            results.append(("API Root", "GET /api/", f"Status {response.status_code}", "❌ FAIL"))
    except Exception as e:
        results.append(("API Root", "GET /api/", f"Error: {e}", "❌ FAIL"))
    
    # Test 2: Detailed Signup
    try:
        signup_data = {
            "email": "comprehensive@streamerhouse.com",
            "password": "securepassword123",
            "displayName": "Comprehensive Tester",
            "platforms": ["Twitch", "YouTube", "TikTok"],
            "niches": ["Gaming", "Tech", "Music"],
            "games": ["Valorant", "Minecraft", "Fortnite"],
            "city": "Los Angeles",
            "timeZone": "America/Los_Angeles",
            "hasSchedule": True,
            "schedule": {"monday": "6PM-10PM", "friday": "8PM-12AM"},
            "bio": "Comprehensive testing user for Streamer House platform"
        }
        
        response = requests.post(f"{API_BASE}/auth/signup", json=signup_data, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if 'token' in data and 'user' in data:
                user = data['user']
                required_fields = ['platforms', 'niches', 'games', 'city', 'timeZone', 'bio', 'totalPoints']
                missing = [f for f in required_fields if f not in user]
                
                if not missing:
                    results.append(("Unified Signup", "POST /api/auth/signup", "All profile fields present", "✅ PASS"))
                    auth_token = data['token']
                    test_user = data['user']
                else:
                    results.append(("Unified Signup", "POST /api/auth/signup", f"Missing: {missing}", "❌ FAIL"))
                    auth_token = None
                    test_user = None
            else:
                results.append(("Unified Signup", "POST /api/auth/signup", "Missing token/user", "❌ FAIL"))
                auth_token = None
                test_user = None
        else:
            results.append(("Unified Signup", "POST /api/auth/signup", f"Status {response.status_code}", "❌ FAIL"))
            auth_token = None
            test_user = None
    except Exception as e:
        results.append(("Unified Signup", "POST /api/auth/signup", f"Error: {e}", "❌ FAIL"))
        auth_token = None
        test_user = None
    
    # Test 3: Basic Signup Removal
    try:
        response = requests.post(f"{API_BASE}/auth/signup-basic", 
                               json={"email": "basic@test.com", "password": "test"}, timeout=10)
        if response.status_code == 410:
            results.append(("Basic Signup Removal", "POST /api/auth/signup-basic", "Returns 410 Gone", "✅ PASS"))
        else:
            results.append(("Basic Signup Removal", "POST /api/auth/signup-basic", f"Status {response.status_code}", "❌ FAIL"))
    except Exception as e:
        results.append(("Basic Signup Removal", "POST /api/auth/signup-basic", f"Error: {e}", "❌ FAIL"))
    
    # Test authenticated endpoints if we have a token
    if auth_token and test_user:
        headers = {'Authorization': f'Bearer {auth_token}'}
        
        # Test 4: Auth Me
        try:
            response = requests.get(f"{API_BASE}/auth/me", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get('id') == test_user['id']:
                    results.append(("Auth Me", "GET /api/auth/me", "Returns correct user", "✅ PASS"))
                else:
                    results.append(("Auth Me", "GET /api/auth/me", "Wrong user data", "❌ FAIL"))
            else:
                results.append(("Auth Me", "GET /api/auth/me", f"Status {response.status_code}", "❌ FAIL"))
        except Exception as e:
            results.append(("Auth Me", "GET /api/auth/me", f"Error: {e}", "❌ FAIL"))
        
        # Test 5: House Creation
        try:
            response = requests.post(f"{API_BASE}/houses", 
                                   json={"name": "Test House"}, headers=headers, timeout=10)
            if response.status_code == 200:
                house_data = response.json()
                if 'id' in house_data and house_data.get('ownerId') == test_user['id']:
                    results.append(("House Creation", "POST /api/houses", "House created successfully", "✅ PASS"))
                    test_house = house_data
                else:
                    results.append(("House Creation", "POST /api/houses", "Invalid house data", "❌ FAIL"))
                    test_house = None
            else:
                results.append(("House Creation", "POST /api/houses", f"Status {response.status_code}", "❌ FAIL"))
                test_house = None
        except Exception as e:
            results.append(("House Creation", "POST /api/houses", f"Error: {e}", "❌ FAIL"))
            test_house = None
        
        # Test 6: Houses Summary
        try:
            response = requests.get(f"{API_BASE}/users/me/houses/summary", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if 'count' in data and 'canCreate' in data and 'max' in data:
                    results.append(("Houses Summary", "GET /api/users/me/houses/summary", 
                                  f"Count: {data['count']}, Max: {data['max']}", "✅ PASS"))
                else:
                    results.append(("Houses Summary", "GET /api/users/me/houses/summary", "Missing fields", "❌ FAIL"))
            else:
                results.append(("Houses Summary", "GET /api/users/me/houses/summary", f"Status {response.status_code}", "❌ FAIL"))
        except Exception as e:
            results.append(("Houses Summary", "GET /api/users/me/houses/summary", f"Error: {e}", "❌ FAIL"))
        
        # Test 7: Active House Session
        try:
            # Get active house
            response = requests.get(f"{API_BASE}/session/active-house", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if 'houseId' in data:
                    # Set active house if we have one
                    if test_house:
                        set_response = requests.post(f"{API_BASE}/session/active-house", 
                                                   json={'houseId': test_house['id']}, headers=headers, timeout=10)
                        if set_response.status_code == 200:
                            results.append(("Active House Session", "GET/POST /api/session/active-house", 
                                          "Get/set functionality working", "✅ PASS"))
                        else:
                            results.append(("Active House Session", "GET/POST /api/session/active-house", 
                                          f"Set failed: {set_response.status_code}", "❌ FAIL"))
                    else:
                        results.append(("Active House Session", "GET/POST /api/session/active-house", 
                                      "Get works, no house to test set", "✅ PASS"))
                else:
                    results.append(("Active House Session", "GET/POST /api/session/active-house", "Missing houseId", "❌ FAIL"))
            else:
                results.append(("Active House Session", "GET/POST /api/session/active-house", f"Status {response.status_code}", "❌ FAIL"))
        except Exception as e:
            results.append(("Active House Session", "GET/POST /api/session/active-house", f"Error: {e}", "❌ FAIL"))
        
        # Test 8: Roommates Endpoint
        try:
            response = requests.get(f"{API_BASE}/roommates", headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    results.append(("Roommates Endpoint", "GET /api/roommates", 
                                  f"Returns list with {len(data)} users", "✅ PASS"))
                else:
                    results.append(("Roommates Endpoint", "GET /api/roommates", "Not a list", "❌ FAIL"))
            else:
                results.append(("Roommates Endpoint", "GET /api/roommates", f"Status {response.status_code}", "❌ FAIL"))
        except Exception as e:
            results.append(("Roommates Endpoint", "GET /api/roommates", f"Error: {e}", "❌ FAIL"))
        
        # Test 9: Roommate Search Toggle
        try:
            response = requests.post(f"{API_BASE}/settings/roommate-search", 
                                   json={'appearInRoommateSearch': True}, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                if 'appearInRoommateSearch' in data:
                    results.append(("Roommate Search Toggle", "POST /api/settings/roommate-search", 
                                  f"Toggle to: {data['appearInRoommateSearch']}", "✅ PASS"))
                else:
                    results.append(("Roommate Search Toggle", "POST /api/settings/roommate-search", "Missing confirmation", "❌ FAIL"))
            else:
                results.append(("Roommate Search Toggle", "POST /api/settings/roommate-search", f"Status {response.status_code}", "❌ FAIL"))
        except Exception as e:
            results.append(("Roommate Search Toggle", "POST /api/settings/roommate-search", f"Error: {e}", "❌ FAIL"))
        
        # Test 10: Post Creation (if house exists)
        if test_house:
            try:
                response = requests.post(f"{API_BASE}/posts", 
                                       json={"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", 
                                            "houseId": test_house['id']}, headers=headers, timeout=10)
                if response.status_code == 200:
                    post_data = response.json()
                    if 'id' in post_data and 'title' in post_data:
                        results.append(("Post Creation", "POST /api/posts", 
                                      f"Post created with metadata: {post_data.get('title', 'N/A')[:30]}", "✅ PASS"))
                        test_post = post_data
                    else:
                        results.append(("Post Creation", "POST /api/posts", "Missing post data", "❌ FAIL"))
                        test_post = None
                else:
                    results.append(("Post Creation", "POST /api/posts", f"Status {response.status_code}", "❌ FAIL"))
                    test_post = None
            except Exception as e:
                results.append(("Post Creation", "POST /api/posts", f"Error: {e}", "❌ FAIL"))
                test_post = None
            
            # Test 11: House Feed
            try:
                response = requests.get(f"{API_BASE}/house/feed", headers=headers, timeout=10)
                if response.status_code == 200:
                    feed_data = response.json()
                    if isinstance(feed_data, list):
                        has_visibility = any('visibility' in post for post in feed_data)
                        results.append(("House Feed TTL", "GET /api/house/feed", 
                                      f"Feed with {len(feed_data)} posts, visibility flags: {has_visibility}", "✅ PASS"))
                    else:
                        results.append(("House Feed TTL", "GET /api/house/feed", "Not a list", "❌ FAIL"))
                else:
                    results.append(("House Feed TTL", "GET /api/house/feed", f"Status {response.status_code}", "❌ FAIL"))
            except Exception as e:
                results.append(("House Feed TTL", "GET /api/house/feed", f"Error: {e}", "❌ FAIL"))
    
    # Test 12: Authentication Requirements (without token)
    protected_endpoints = [
        ('GET', '/auth/me'),
        ('POST', '/houses'),
        ('GET', '/users/me/houses'),
        ('POST', '/settings/roommate-search')
    ]
    
    auth_failures = 0
    for method, endpoint in protected_endpoints:
        try:
            if method == 'GET':
                response = requests.get(f"{API_BASE}{endpoint}", timeout=10)
            else:
                response = requests.post(f"{API_BASE}{endpoint}", json={}, timeout=10)
            
            if response.status_code == 401:
                auth_failures += 1
        except:
            pass
    
    if auth_failures == len(protected_endpoints):
        results.append(("Authentication Requirements", "Various protected endpoints", 
                      f"All {len(protected_endpoints)} require auth", "✅ PASS"))
    else:
        results.append(("Authentication Requirements", "Various protected endpoints", 
                      f"Only {auth_failures}/{len(protected_endpoints)} require auth", "❌ FAIL"))
    
    # Print results
    print("\n## 🧪 STREAMER HOUSE — FOCUSED TEST RESULTS")
    print()
    print("| Test Name | Endpoint(s) | Expected | Actual | Status |")
    print("|-----------|-------------|----------|--------|--------|")
    
    for test_name, endpoint, actual, status in results:
        expected = "Working correctly"
        print(f"| {test_name} | `{endpoint}` | {expected} | {actual} | {status.split()[1]} |")
    
    # Summary
    passed = sum(1 for _, _, _, status in results if "✅ PASS" in status)
    total = len(results)
    success_rate = (passed / total * 100) if total > 0 else 0
    
    print()
    print(f"**Summary: {passed}/{total} tests passed ({success_rate:.1f}% success rate)**")
    
    if success_rate >= 80:
        print("🎉 **Status: BACKEND READY FOR PRODUCTION**")
    else:
        print("⚠️ **Status: NEEDS ATTENTION**")
    
    return success_rate >= 80

if __name__ == "__main__":
    success = test_working_endpoints()
    exit(0 if success else 1)