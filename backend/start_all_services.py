#!/usr/bin/env python3
"""
Start all Integra Markets backend services with full AI capabilities
"""
import os
import sys
import subprocess
import time
from pathlib import Path

# Set environment variables
# Load API key from .env file if not already set
if 'GROQ_API_KEY' not in os.environ:
    try:
        from dotenv import load_dotenv
        # Load from .env file in project root
        load_dotenv(Path(__file__).parent.parent / '.env')
        print("Loaded environment variables from .env file")
    except ImportError:
        print("Warning: python-dotenv not installed. Using existing environment variables.")
        
os.environ['PYTHONPATH'] = str(Path(__file__).parent.parent)

print("🚀 Starting Integra Markets Backend Services...")
print("=" * 50)

# Import and run the main server
try:
    # Change to backend directory
    os.chdir(Path(__file__).parent)
    
    # Import the main NLP server
    from main_simple_nlp import app, groq_service, article_summarizer
    
    print("\n✅ Services initialized:")
    print(f"  - Groq AI Service: {'Active' if groq_service else 'Not Available'}")
    print(f"  - Article Summarizer: {'Active' if article_summarizer else 'Not Available'}")
    print(f"  - Groq API Key: {'Configured' if os.environ.get('GROQ_API_KEY') else 'Missing'}")
    
    print("\n📡 Available endpoints:")
    print("  - GET  /api/health - Health check")
    print("  - GET  /api/news - Fetch news with sentiment")
    print("  - POST /api/analyze - Analyze text sentiment")
    print("  - POST /api/chat - Chat with Groq AI")
    print("  - POST /api/groq/analyze - Advanced Groq analysis")
    print("  - POST /api/groq/chat - Groq chat with tools")
    print("  - POST /api/groq/report - Generate market report")
    print("  - POST /api/summarize/article - Summarize articles")
    
    print("\n🎯 Starting server on http://localhost:5555")
    print("=" * 50)
    
    # Run the FastAPI app with uvicorn
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=5555, reload=True)
    
except Exception as e:
    print(f"\n❌ Error starting services: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
