#!/usr/bin/env python3
"""
Test Groq API Connection and Diagnose Issues
"""
import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_groq_connection():
    """Test Groq API connection and provide diagnostic information"""
    
    print("=" * 60)
    print("GROQ API CONNECTION TEST")
    print("=" * 60)
    
    # Check API key
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("❌ GROQ_API_KEY not found in environment")
        print("   Loading from .env file...")
        from pathlib import Path
        env_path = Path(__file__).parent / '.env'
        if env_path.exists():
            with open(env_path, 'r') as f:
                for line in f:
                    if line.startswith('GROQ_API_KEY='):
                        api_key = line.split('=', 1)[1].strip()
                        os.environ['GROQ_API_KEY'] = api_key
                        print(f"   ✓ Loaded API key from .env: {api_key[:20]}...")
                        break
    else:
        print(f"✓ GROQ_API_KEY found: {api_key[:20]}...")
    
    if not api_key:
        print("\n❌ No API key found. Please set GROQ_API_KEY in your .env file")
        return False
    
    # Try to import Groq
    try:
        from groq import Groq
        print("✓ Groq library imported successfully")
    except ImportError as e:
        print(f"❌ Failed to import Groq: {e}")
        print("   Installing groq library...")
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "groq"], check=True)
        from groq import Groq
        print("   ✓ Groq library installed and imported")
    
    # Initialize client
    try:
        client = Groq(api_key=api_key)
        print("✓ Groq client initialized")
    except Exception as e:
        print(f"❌ Failed to initialize Groq client: {e}")
        return False
    
    # Test with a simple request
    print("\nTesting API with a simple request...")
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "user", "content": "Say 'API working' if you can read this"}
            ],
            model="mixtral-8x7b-32768",  # Fast model for testing
            max_tokens=10,
            temperature=0
        )
        
        result = response.choices[0].message.content
        print(f"✓ API Response: {result}")
        
        if "API working" in result or "working" in result.lower():
            print("✓ API is functioning correctly!")
        else:
            print(f"⚠️  Unexpected response: {result}")
            
    except Exception as e:
        print(f"❌ API request failed: {e}")
        
        # Check for common issues
        if "401" in str(e) or "unauthorized" in str(e).lower():
            print("\n⚠️  Authentication error - API key may be invalid")
            print("   Please check your API key at: https://console.groq.com/keys")
        elif "429" in str(e):
            print("\n⚠️  Rate limit exceeded - wait a moment and try again")
        elif "model" in str(e).lower():
            print("\n⚠️  Model not available - trying different model...")
            # Try with different model
            try:
                response = client.chat.completions.create(
                    messages=[{"role": "user", "content": "Say 'working'"}],
                    model="llama3-70b-8192",
                    max_tokens=10
                )
                print(f"✓ Alternative model works: {response.choices[0].message.content}")
            except Exception as e2:
                print(f"❌ Alternative model also failed: {e2}")
        else:
            print(f"\n⚠️  Unknown error: {e}")
        return False
    
    # Test available models
    print("\n" + "=" * 60)
    print("TESTING AVAILABLE MODELS")
    print("=" * 60)
    
    models_to_test = [
        ("mixtral-8x7b-32768", "Mixtral 8x7B"),
        ("llama3-70b-8192", "Llama 3 70B"),
        ("llama3-8b-8192", "Llama 3 8B"),
        ("gemma2-9b-it", "Gemma 2 9B"),
        ("llama-3.3-70b-versatile", "Llama 3.3 70B Versatile"),
    ]
    
    available_models = []
    for model_id, model_name in models_to_test:
        try:
            response = client.chat.completions.create(
                messages=[{"role": "user", "content": "Hi"}],
                model=model_id,
                max_tokens=5,
                temperature=0
            )
            print(f"✓ {model_name} ({model_id}): Available")
            available_models.append(model_id)
        except Exception as e:
            error_msg = str(e)
            if "not found" in error_msg.lower() or "invalid" in error_msg.lower():
                print(f"❌ {model_name} ({model_id}): Not available")
            else:
                print(f"⚠️  {model_name} ({model_id}): Error - {error_msg[:50]}...")
    
    print(f"\n✓ Available models: {len(available_models)}/{len(models_to_test)}")
    
    # Test the GPT-OSS-120B model specifically
    print("\n" + "=" * 60)
    print("TESTING GPT-OSS-120B MODEL")
    print("=" * 60)
    
    try:
        response = client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a commodities market analyst."},
                {"role": "user", "content": "What's the outlook for oil prices? (answer in one sentence)"}
            ],
            model="openai/gpt-oss-120b",
            max_tokens=50,
            temperature=0.7
        )
        
        result = response.choices[0].message.content
        print(f"✓ GPT-OSS-120B Response: {result}")
        
    except Exception as e:
        print(f"❌ GPT-OSS-120B not available: {e}")
        print("   Note: This model may require special access or may have been deprecated")
    
    return True

def test_backend_integration():
    """Test backend server integration with Groq"""
    print("\n" + "=" * 60)
    print("TESTING BACKEND INTEGRATION")
    print("=" * 60)
    
    import requests
    
    # Check if backend is running
    backend_url = "http://localhost:8000"
    
    try:
        response = requests.get(f"{backend_url}/health", timeout=2)
        if response.status_code == 200:
            health = response.json()
            print(f"✓ Backend server is running")
            print(f"  Groq AI available: {health.get('groq_ai', {}).get('available', False)}")
            
            # Test Groq endpoint
            test_response = requests.get(f"{backend_url}/api/test/groq", timeout=5)
            if test_response.status_code == 200:
                test_data = test_response.json()
                print("\nGroq Backend Test Results:")
                for key, value in test_data.items():
                    print(f"  {key}: {value}")
                    
        else:
            print(f"⚠️  Backend returned status {response.status_code}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Backend server not running")
        print("   Start it with: python3 backend/main_production.py")
    except Exception as e:
        print(f"❌ Error testing backend: {e}")

def suggest_fixes():
    """Suggest fixes for common issues"""
    print("\n" + "=" * 60)
    print("SUGGESTED FIXES")
    print("=" * 60)
    
    print("""
1. If API key is invalid:
   - Get a new key from: https://console.groq.com/keys
   - Update .env file: GROQ_API_KEY=your_new_key_here

2. If models are not available:
   - Use 'mixtral-8x7b-32768' or 'llama3-70b-8192' instead of GPT-OSS-120B
   - Update backend/groq_ai_service.py to use available models

3. To start the backend server:
   cd /Users/lm/Desktop/integra/integra-markets
   python3 backend/main_production.py

4. To test from the app:
   - Ensure EXPO_PUBLIC_GROQ_API_KEY is set in .env
   - Restart the Expo development server
   - Test the AI chat feature in the app
""")

if __name__ == "__main__":
    print("Starting Groq API diagnostics...\n")
    
    # Run tests
    api_working = test_groq_connection()
    
    if api_working:
        test_backend_integration()
    
    suggest_fixes()
    
    print("\n" + "=" * 60)
    print("DIAGNOSTIC COMPLETE")
    print("=" * 60)
