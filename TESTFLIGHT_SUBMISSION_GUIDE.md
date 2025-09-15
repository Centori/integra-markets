# TestFlight Submission Guide - Groq API Integration

## Pre-Submission Checklist

### ✅ API Keys Configuration (Required BEFORE Build)
- [x] `EXPO_PUBLIC_GROQ_API_KEY` in app.json
- [x] `EXPO_PUBLIC_SUPABASE_URL` in app.json  
- [x] `EXPO_PUBLIC_SUPABASE_ANON_KEY` in app.json
- [x] Models updated to use `llama-3.3-70b-versatile`

### ✅ Code Updates (Already Complete)
- [x] Frontend: `app/services/groqService.js` uses new models
- [x] Backend: `backend/groq_ai_service.py` uses new models
- [x] Fallback behavior implemented for offline/no-backend scenarios

## Building for TestFlight

### Step 1: Build the App
```bash
# Install dependencies
npm install

# Build for iOS
eas build --platform ios --profile production

# Or if using preview profile
eas build --platform ios --profile preview
```

### Step 2: Submit to TestFlight
```bash
# Submit the build
eas submit --platform ios --latest

# Or submit specific build
eas submit --platform ios --id=<build-id>
```

## AFTER TestFlight Submission

### Option A: No Backend (Recommended for Testing)
The app will work with:
- ✅ Direct Groq API calls for AI chat
- ✅ Mock data for news and markets
- ✅ Basic authentication (mock mode)

**Testers can use the app immediately without any backend setup!**

### Option B: With Backend (For Full Features)
Deploy the backend to a cloud service:

1. **Deploy to Fly.io** (Recommended):
```bash
cd backend
fly deploy
```

2. **Or Deploy to Heroku**:
```bash
heroku create integra-markets-backend
git push heroku main
```

3. **Or Run Locally for Development**:
```bash
python3 backend/main_production.py
# Then use ngrok to expose it
ngrok http 8000
```

## What TestFlight Testers Will Experience

### Without Backend Running:
- ✅ AI Chat works (direct Groq API)
- ✅ Mock news data displayed
- ✅ Mock market prices shown
- ✅ UI fully functional
- ⚠️ No real-time data
- ⚠️ No user persistence

### With Backend Running:
- ✅ AI Chat with enhanced features
- ✅ Real-time news from RSS feeds
- ✅ Live market data
- ✅ User authentication
- ✅ Data persistence
- ✅ Push notifications

## Testing the Groq Integration

### For Testers:
1. Open any news article
2. Tap the AI Analysis button
3. Ask questions like:
   - "What does this mean for oil prices?"
   - "How will this affect gold markets?"
   - "What are the key risks?"

### Expected Behavior:
- Responses should appear within 2-3 seconds
- AI should provide commodity-specific insights
- Chat history should be maintained during session

## Troubleshooting

### If AI Chat Doesn't Work:
1. **Check API Key**: Ensure GROQ_API_KEY is valid
2. **Check Model**: Verify using `llama-3.3-70b-versatile`
3. **Check Rate Limits**: Groq has usage limits
4. **Check Network**: Ensure internet connection

### Test API Locally:
```bash
# Run our test script
python3 test_fixed_connection.py
```

## Important Notes

1. **API Keys in Build**: The Groq API key is embedded in the TestFlight build. This is okay for testing but should use a proxy server for production.

2. **Rate Limits**: The free Groq tier has limits:
   - 30 requests per minute
   - 14,400 requests per day
   
3. **Fallback Behavior**: The app won't crash if Groq fails - it shows an error message and allows retry.

4. **Backend Optional**: TestFlight testers can use the app without any backend setup - it will use the Groq API directly.

## Summary

**You do NOT need to run the backend before submitting to TestFlight!**

The app is designed to work in both scenarios:
- **Standalone Mode**: Uses Groq API directly + mock data
- **Full Mode**: Connects to backend for complete features

This allows TestFlight testers to start using the app immediately while you can deploy the backend at your convenience.
