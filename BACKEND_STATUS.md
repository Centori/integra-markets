# Integra Markets Backend Status

## ⚠️ Current Status: PARTIALLY OPERATIONAL

### Live Services
- ✅ **Real-time Market Data**: Connected to Alpha Vantage API
- ⚠️ **AI Sentiment Analysis**: Basic sentiment analysis only (Enhanced ML features temporarily disabled)
- ✅ **Database**: Supabase connected
- ✅ **Alert System**: Working with default preferences
- ✅ **Notifications**: Ready for push notifications
- ✅ **NLTK Sentiment**: Primary sentiment analysis active

## Backend URL
- **Production**: `https://integra-markets-backend.fly.dev`
- **Status**: Deployed on Fly.io
- **Health**: Operational (core features)

## How the App Switches Between Mock and Live Data

### Automatic Switching
The app **automatically** attempts to connect to the backend. If successful, it uses live data. If the backend is unavailable, it falls back to mock data.

### TodayDashboard Refresh Function
The refresh function in `app/components/TodayDashboard.js`:
1. **Pull-to-refresh** triggers `onRefresh()` function
2. Calls `loadDashboardData()` which attempts to fetch from backend
3. If backend is available → Shows live data
4. If backend fails → Falls back to `sampleNewsData`

## Quick Control Commands

### Start Backend (Live Data)
```bash
cd /Users/lm/Desktop/integra/integra-markets
source venv/bin/activate
python backend/main_integrated.py
```

### Stop Backend (Switch to Mock Data)
```bash
# Find and kill the backend process
ps aux | grep main_integrated.py
kill [PID]
```

### Use Control Script
```bash
./backend_control.sh
# Select option 1 to start (live data)
# Select option 2 to stop (mock data)
# Select option 3 to check status
```

### Test Backend Connectivity
```bash
node test_refresh.js
```

## Available API Endpoints

### Core Endpoints
- `GET /` - Root endpoint (backend info)
- `GET /health` - Health check
- `GET /api/market/realtime` - Real-time market prices
- `GET /api/sentiment/market` - Market sentiment overview
- `POST /api/sentiment` - Analyze text sentiment

### Alert Endpoints
- `GET /api/alerts/preferences` - Get alert settings
- `POST /api/alerts/preferences` - Update alert settings
- `GET /api/alerts/active` - Get active alerts
- `POST /api/test/notification` - Test push notification

### News Analysis
- `POST /api/news/analysis` - Analyze news text

## Testing Notifications

To test if notifications are working:

1. **Via Backend API**:
```bash
curl -X POST http://192.168.0.208:8000/api/test/notification
```

2. **Via App**:
- Open the app
- Pull down to refresh on the Today screen
- Check for notification icon updates

## Alert Preferences

The backend reads alert preferences but currently uses defaults since the Supabase table doesn't exist yet. Default settings:
- Price alerts: ON (5% threshold)
- Sentiment alerts: ON
- News alerts: ON
- Commodities: OIL, GOLD, WHEAT, NAT GAS
- Notification frequency: Immediate
- Push notifications: Enabled

## Troubleshooting

### Backend Won't Start
```bash
# Check if port 8000 is in use
lsof -i :8000
# Kill any existing process
kill -9 [PID]
```

### App Shows Mock Data Despite Backend Running
1. Check IP address in `app/services/api.js` matches your local IP
2. Ensure device/simulator is on same network
3. Test connectivity: `curl http://192.168.0.208:8000/health`

### Notifications Not Working
1. Check alert preferences are enabled
2. Test notification endpoint manually
3. Verify push notification permissions in app

## Next Steps for Full Production

1. Create `alert_preferences` table in Supabase
2. Implement proper user authentication
3. Set up production API endpoints
4. Configure push notification service (FCM/APNS)
5. Deploy backend to cloud (AWS/GCP/Azure)

## Current Configuration

- **Python**: 3.13
- **Backend Framework**: FastAPI
- **AI Model**: GROQ GPT-OSS-120B
- **Database**: Supabase
- **Market Data**: Alpha Vantage API
- **Sentiment Analysis**: NLTK + GROQ AI
- **Environment**: Development (local)

---

Last Updated: 2025-09-04 10:47 AM
Backend Version: 3.0.0
