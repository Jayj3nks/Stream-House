#!/usr/bin/env python3
"""
Simple authentication test for Stream-House backend
"""

import requests
import json
import time

# Use localhost for testing
BASE_URL = "http://localhost:3000"
API_BASE = f"{BASE_URL}/api"

def test_api_root():
    """Test API root endpoint"""
    print("🔍 Testing API root endpoint...")
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"JSON: {data}")
                return True
            except:
                print("Response is not JSON")
                return False
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_signup():
    """Test signup endpoint"""
    print("\n🔍 Testing signup endpoint...")
    
    test_email = f"testuser{int(time.time())}@example.com"
    signup_data = {
        "email": test_email,
        "password": "testpassword123",
        "displayName": "Test User",
        "platforms": ["TikTok", "YouTube"],
        "niches": ["Gaming", "Tech"],
        "games": ["Fortnite", "Valorant"],
        "city": "Los Angeles, CA",
        "timeZone": "America/Los_Angeles",
        "hasSchedule": True,
        "schedule": {
            "Monday": ["7:00 PM", "8:00 PM"]
        },
        "bio": "Test user for authentication testing"
    }
    
    try:
        response = requests.post(f"{API_BASE}/auth/signup", 
                               json=signup_data, 
                               headers={'Content-Type': 'application/json'},
                               timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ Signup successful!")
                print(f"User ID: {data.get('user', {}).get('id', 'N/A')}")
                print(f"Username: {data.get('user', {}).get('username', 'N/A')}")
                print(f"Email: {data.get('user', {}).get('email', 'N/A')}")
                print(f"Token present: {'token' in data}")
                print(f"Cookies: {response.cookies}")
                return data
            except Exception as e:
                print(f"JSON parse error: {e}")
                return None
        else:
            print(f"❌ Signup failed with status {response.status_code}")
            return None
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_auth_me(session):
    """Test auth/me endpoint with cookies"""
    print("\n🔍 Testing auth/me endpoint...")
    
    try:
        response = session.get(f"{API_BASE}/auth/me", timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ Auth/me successful!")
                print(f"User ID: {data.get('id', 'N/A')}")
                print(f"Username: {data.get('username', 'N/A')}")
                print(f"Email: {data.get('email', 'N/A')}")
                return True
            except Exception as e:
                print(f"JSON parse error: {e}")
                return False
        else:
            print(f"❌ Auth/me failed with status {response.status_code}")
            return False
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_login(email, password):
    """Test login endpoint"""
    print("\n🔍 Testing login endpoint...")
    
    login_data = {
        "email": email,
        "password": password
    }
    
    session = requests.Session()
    
    try:
        response = session.post(f"{API_BASE}/auth/login", 
                              json=login_data, 
                              headers={'Content-Type': 'application/json'},
                              timeout=10)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")
        print(f"Cookies: {response.cookies}")
        
        if response.status_code == 200:
            try:
                data = response.json()
                print(f"✅ Login successful!")
                print(f"Token present: {'token' in data}")
                return session, data
            except Exception as e:
                print(f"JSON parse error: {e}")
                return None, None
        else:
            print(f"❌ Login failed with status {response.status_code}")
            return None, None
    except Exception as e:
        print(f"Error: {e}")
        return None, None

def main():
    print("🧪 STREAM-HOUSE AUTHENTICATION TESTING")
    print("=" * 50)
    print(f"Testing against: {API_BASE}")
    print("=" * 50)
    
    # Test API root
    if not test_api_root():
        print("❌ API root test failed. Stopping tests.")
        return
    
    # Test signup
    signup_session = requests.Session()
    signup_data = test_signup()
    if not signup_data:
        print("❌ Signup test failed. Stopping tests.")
        return
    
    user_email = signup_data.get('user', {}).get('email')
    
    # Test auth/me with signup session (should work with cookies)
    test_auth_me(signup_session)
    
    # Test login with new session
    if user_email:
        login_session, login_data = test_login(user_email, "testpassword123")
        if login_session and login_data:
            # Test auth/me with login session
            test_auth_me(login_session)
    
    print("\n🎯 Authentication testing completed!")

if __name__ == "__main__":
    main()