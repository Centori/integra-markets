#!/usr/bin/env python3
"""
Start the backend server with push notification support
This script sets up the required environment variables and starts the server
"""
import os
import sys
import subprocess

def start_server():
    print("🚀 Starting Integra Markets Backend with Push Notification Support")
    print("=" * 60)
    
    # Check if .env file exists
    if os.path.exists('.env'):
        print("✅ Loading environment from .env file")
        from dotenv import load_dotenv
        load_dotenv()
    else:
        print("⚠️  No .env file found. Setting up environment variables...")
        
        # Get Supabase credentials from app.json
        import json
        app_json_path = '../app.json'
        
        if os.path.exists(app_json_path):
            with open(app_json_path, 'r') as f:
                app_config = json.load(f)
                supabase_url = app_config.get('expo', {}).get('extra', {}).get('supabaseUrl')
                
                if supabase_url:
                    print(f"✅ Found Supabase URL: {supabase_url}")
                    os.environ['SUPABASE_URL'] = supabase_url
                else:
                    print("❌ Supabase URL not found in app.json")
        
        # Set default values if not found
        if 'SUPABASE_URL' not in os.environ:
            os.environ['SUPABASE_URL'] = 'https://jcovjmuaysebdfbpbvdh.supabase.co'
            print(f"ℹ️  Using default Supabase URL: {os.environ['SUPABASE_URL']}")
        
        if 'SUPABASE_KEY' not in os.environ:
            # This should be your actual anon key
            print("⚠️  SUPABASE_KEY not set. Please set it in your environment or .env file")
            print("   You can find it in your Supabase project settings")
            
    # Verify push notification service
    print("\n🔔 Verifying push notification service...")
    
    try:
        from exponent_server_sdk import PushClient
        print("✅ Expo Server SDK is installed")
        
        # Test token validation
        test_token = "ExponentPushToken[test]"
        is_valid = PushClient.is_exponent_push_token(test_token)
        print(f"✅ Token validation working: {test_token} -> {is_valid}")
        
    except ImportError:
        print("❌ Expo Server SDK not found. Installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "exponent-server-sdk"])
    
    # Start the server
    print("\n🌐 Starting FastAPI server...")
    print("   URL: http://localhost:8000")
    print("   Docs: http://localhost:8000/docs")
    print("   Push endpoint: http://localhost:8000/api/notifications/test")
    print("\nPress Ctrl+C to stop the server")
    print("=" * 60)
    
    try:
        # Start uvicorn
        subprocess.run([
            "uvicorn",
            "main:app",
            "--reload",
            "--host", "0.0.0.0",
            "--port", "8000"
        ])
    except KeyboardInterrupt:
        print("\n👋 Server stopped")

if __name__ == "__main__":
    start_server()
