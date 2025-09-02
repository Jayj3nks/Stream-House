#!/usr/bin/env python3
"""
Debug deduplication issue
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

def test_dedup():
    session = requests.Session()
    session.headers.update({
        'Content-Type': 'application/json',
        'User-Agent': 'CreatorSquad-Test-Client/1.0'
    })
    
    # Create test user
    timestamp = int(time.time())
    user_data = {
        "email": f"dedup_user_{timestamp}@example.com",
        "password": "DedupPassword123!",
        "displayName": f"Dedup User {timestamp}"
    }
    
    print("Creating user...")
    signup_response = session.post(f"{BASE_URL}/auth/signup", json=user_data)
    signup_data = signup_response.json()
    token = signup_data['token']
    user_id = signup_data['user']['id']
    
    # Create squad
    squad_data = {
        "name": f"Dedup Squad {timestamp}",
        "ownerId": user_id
    }
    
    print("Creating squad...")
    squad_response = session.post(f"{BASE_URL}/squads", json=squad_data, headers={'Authorization': f'Bearer {token}'})
    squad_id = squad_response.json()['id']
    
    # Create post
    post_data = {
        "url": f"https://www.youtube.com/watch?v=test{timestamp}",
        "squadId": squad_id,
        "userId": user_id
    }
    
    print("Creating post...")
    post_response = session.post(f"{BASE_URL}/posts", json=post_data, headers={'Authorization': f'Bearer {token}'})
    post_id = post_response.json()['id']
    
    # Track click
    click_data = {
        "postId": post_id,
        "userId": user_id,
        "type": "like",
        "redirectUrl": f"https://www.youtube.com/watch?v=test{timestamp}"
    }
    
    print("First click...")
    click1 = session.post(f"{BASE_URL}/engagements/click", json=click_data, headers={'Authorization': f'Bearer {token}'})
    print(f"First click: {click1.status_code} - {click1.text}")
    
    print("Second click (should be deduplicated)...")
    click2 = session.post(f"{BASE_URL}/engagements/click", json=click_data, headers={'Authorization': f'Bearer {token}'})
    print(f"Second click: {click2.status_code} - {click2.text}")
    
    # Check if deduplication worked
    click1_result = click1.json()
    click2_result = click2.json()
    
    print(f"\nDeduplication check:")
    print(f"First message: '{click1_result.get('message', '')}'")
    print(f"Second message: '{click2_result.get('message', '')}'")
    print(f"Dedup working: {'Already tracked' in click2_result.get('message', '')}")

if __name__ == "__main__":
    test_dedup()