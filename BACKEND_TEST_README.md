# Backend API Testing Guide

## API Keys Restored

We have restored all the API keys and configurations needed for backend testing:

### 1. Groq API (AI Chat)
- **Key**: Already configured in `.env` and `app.json`
- **Service**: Used for AI-powered chat responses using Llama 3 70B model
- **Test in app**: Open any news article and tap the AI Analysis button, then use the chat feature

### 2. Supabase (Authentication & Database)
- **URL**: https://jcovjmuaysebdfbpbvdh.supabase.co
- **Key**: Configured in `.env` and `app.json`
- **Service**: Handles user authentication and data storage

### 3. Backend API Server

To test the backend functionality, you have two options:

#### Option 1: Simple Test Server (Recommended for TestFlight)
```bash
python test_server.py
```

This starts a minimal test server on http://localhost:8000 with basic endpoints:
- GET `/health` - Health check
- GET `/api/news` - Test news data
- POST `/api/chat` - Test chat endpoint

#### Option 2: Full Backend Server
```bash
cd app
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Note: The full backend requires additional dependencies and setup.

## Testing in TestFlight Build

The current TestFlight build (Build 12) includes:

1. **Groq AI Integration**
   - Tap on any news article
   - Press the AI Analysis button
   - Use the chat interface to ask questions
   - The app will use Groq's Llama 3 model for responses

2. **Mock Data Fallback**
   - If backend is not running, the app uses mock data
   - This ensures the app doesn't crash without a backend

3. **API Configuration**
   - All API keys are embedded in the build
   - No additional configuration needed on the device

## Environment Variables

All necessary environment variables are configured:
- `EXPO_PUBLIC_GROQ_API_KEY` - For AI chat
- `EXPO_PUBLIC_SUPABASE_URL` - For authentication
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - For authentication

## Features to Test

1. **Authentication Flow**
   - Sign in with email (mock)
   - Google/Apple sign-in (UI only, not fully implemented)

2. **AI Chat**
   - Open any news article
   - Tap AI Analysis
   - Ask questions about the article
   - Should get responses from Groq AI

3. **News Feed**
   - Browse commodity news
   - Filter by sentiment
   - View article details

4. **Profile & Settings**
   - View profile
   - Configure alert preferences
   - Notification settings

## Troubleshooting

If AI chat doesn't work:
1. Check internet connection
2. Verify the Groq API key is valid
3. Check for rate limits (Groq has usage limits)

If authentication fails:
1. Currently using mock authentication
2. Real Supabase auth is configured but not fully implemented

## Next Steps

To fully deploy the backend:
1. Deploy the FastAPI backend to a cloud service
2. Update the API URL in the app configuration
3. Implement real authentication flows
4. Connect to live data sources
