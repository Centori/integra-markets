#!/usr/bin/env python3
"""
Minimal test server for verifying API connectivity
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from datetime import datetime

app = FastAPI(title="Integra Markets Test API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "Integra Markets Test API",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.post("/api/chat")
async def chat(message: dict):
    """Test endpoint for chat functionality"""
    return {
        "response": f"Test response to: {message.get('content', 'no message')}",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/news")
async def news():
    """Test endpoint for news"""
    return {
        "articles": [
            {
                "id": "1",
                "title": "Test News Article",
                "summary": "This is a test article from the backend API",
                "source": "Test API",
                "sentiment": "NEUTRAL",
                "timestamp": datetime.now().isoformat()
            }
        ]
    }

if __name__ == "__main__":
    print("Starting test server on http://localhost:8000")
    print("Test endpoints:")
    print("  GET  http://localhost:8000/")
    print("  GET  http://localhost:8000/health")
    print("  POST http://localhost:8000/api/chat")
    print("  GET  http://localhost:8000/api/news")
    uvicorn.run(app, host="0.0.0.0", port=8000)
