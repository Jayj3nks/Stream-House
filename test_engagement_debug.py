#!/usr/bin/env python3
"""
Debug engagement verification issue
"""

import requests
import json
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use the public URL from environment
NEXT_PUBLIC_BASE_URL = os.getenv('NEXT_PUBLIC_BASE_URL', 'https://collabsquad.preview.emergentagent.com')
BASE_URL = f"{NEXT_PUBLIC_BASE_URL}/api"

def test_engagement_flow():
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'User-Agent': 'CreatorSquad-Test-Client/1.0'
    })
    
    # Create test user
    timestamp = int(time.time())
    user_data = {
        "email": f"debug_user_{timestamp}@example.com",
        "password": "DebugPassword123!",
        "displayName": f"Debug User {timestamp}"
    }
    
    print("Creating user...")
    signup_response = session.post(f"{BASE_URL}/auth/signup", json=user_data)
    if signup_response.status_code != 200:
        print(f"Signup failed: {signup_response.status_code} - {signup_response.text}")
        return
    
    signup_data = signup_response.json()
    token = signup_data['token']
    user_id = signup_data['user']['id']
    
    # Create squad
    squad_data = {
        "name": f"Debug Squad {timestamp}",
        "ownerId": user_id
    }
    
    print("Creating squad...")
    squad_response = session.post(f"{BASE_URL}/squads", json=squad_data, headers={'Authorization': f'Bearer {token}'})
    if squad_response.status_code != 200:
        print(f"Squad creation failed: {squad_response.status_code} - {squad_response.text}")
        return
    
    squad_id = squad_response.json()['id']
    
    # Create post
    post_data = {
        "url": "https://www.youtube.com/watch?v=jNQXAC9IVRw",
        "squadId": squad_id,
        "userId": user_id
    }
    
    print("Creating post...")
    post_response = session.post(f"{BASE_URL}/posts", json=post_data, headers={'Authorization': f'Bearer {token}'})
    if post_response.status_code != 200:
        print(f"Post creation failed: {post_response.status_code} - {post_response.text}")
        return
    
    post_id = post_response.json()['id']
    
    # Track click
    click_data = {
        "postId": post_id,
        "userId": user_id,
        "type": "like",
        "redirectUrl": "https://www.youtube.com/watch?v=jNQXAC9IVRw"
    }
    
    print("Tracking click...")
    click_response = session.post(f"{BASE_URL}/engagements/click", json=click_data, headers={'Authorization': f'Bearer {token}'})
    print(f"Click response: {click_response.status_code} - {click_response.text}")
    
    # Verify engagement
    verify_data = {
        "postId": post_id,
        "userId": user_id,
        "type": "like",
        "verificationData": {"platform": "youtube", "verified": True}
    }
    
    print("Verifying engagement...")
    verify_response = session.post(f"{BASE_URL}/engagements/verify", json=verify_data, headers={'Authorization': f'Bearer {token}'})
    print(f"Verify response: {verify_response.status_code} - {verify_response.text}")
    
    # Try duplicate verification
    print("Testing duplicate verification...")
    duplicate_verify_response = session.post(f"{BASE_URL}/engagements/verify", json=verify_data, headers={'Authorization': f'Bearer {token}'})
    print(f"Duplicate verify response: {duplicate_verify_response.status_code} - {duplicate_verify_response.text}")

if __name__ == "__main__":
    test_engagement_flow()