# Mock Data Replacement Plan for Production

## Overview
This document identifies all mock data instances and their refresh functionality status for the Integra Markets app production release.

## ✅ Features with Refresh Already Implemented

### 1. **TodayDashboard.js**
- **Refresh Status**: ✅ IMPLEMENTED
- **Implementation**: Pull-to-refresh with RefreshControl
- **Real Data Source**: Alpha Vantage API
- **Mock Data**: Falls back to `sampleNewsData` when API fails
- **Action**: None needed - graceful fallback is appropriate

### 2. **AlertsScreen.js**
- **Refresh Status**: ✅ IMPLEMENTED  
- **Implementation**: Pull-to-refresh with RefreshControl
- **Real Data Source**: Backend notifications API
- **Mock Data**: Returns cached data when API fails
- **Action**: None needed - uses cache appropriately

## ❌ Features Needing Real Data Implementation

### 1. **AIAnalysisOverlay.tsx (Line 77)**
```typescript
// Mock data for the comprehensive analysis
const analysisData = {
    summary: "Weekly natural gas storage report...",
    finBertSentiment: {
        bullish: 20,
        bearish: 20,
        neutral: 70
    },
    // ... more mock data
};
```
**Fix Required**: Connect to backend `/api/analyze` endpoint
**Refresh**: Add refresh button or auto-refresh on open

### 2. **AuthLoadingScreen.js**
- Multiple mock user instances for development
- **Fix Required**: Remove all mock authentication flows
- **Keep**: Fallback for development environment only

### 3. **AlertPreferencesForm.js**
- Mock commodity/region lists
- **Fix Required**: Fetch from backend configuration API
- **Refresh**: Load on component mount

### 4. **OnboardingForm.js**
- Placeholder text in form fields
- **Fix Required**: Use actual user data from auth
- **Refresh**: Not needed - one-time form

## 🔄 Refresh Implementation Template

For components missing refresh functionality, here's the standard implementation:

```javascript
import { RefreshControl } from 'react-native';

const [refreshing, setRefreshing] = useState(false);

const onRefresh = useCallback(async () => {
  setRefreshing(true);
  try {
    await loadData(); // Your data fetching function
  } finally {
    setRefreshing(false);
  }
}, []);

// In ScrollView/FlatList:
<ScrollView
  refreshControl={
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor="#4ECCA3" // Integra green
    />
  }
>
```

## 📊 Real Data Integration Checklist

### Backend Endpoints to Verify:
- [ ] `/api/analyze` - AI analysis for news articles
- [ ] `/api/sentiment` - Real-time sentiment analysis
- [ ] `/api/models/status` - ML model availability
- [ ] `/api/notifications` - User notifications
- [ ] `/api/weather/alerts` - Weather impact data
- [ ] `/api/news/enhanced` - Enhanced news feed
- [ ] `/api/sentiment/market` - Market sentiment
- [ ] `/api/config/commodities` - Available commodities list
- [ ] `/api/config/regions` - Available regions list

### API Keys to Verify:
- [x] Alpha Vantage: `3MRU5RUY7R7ZJ3Q5` (Active)
- [x] Groq AI: `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` (Active)
- [x] Supabase: Configured in .env
- [ ] Weather API: Add if using real weather data
- [ ] News API: Add for additional news sources

## 🚀 Production Launch Checklist

1. **Environment Variables**
   - Set `NODE_ENV=production`
   - Remove all development-only mock returns
   - Ensure all API keys are in production .env

2. **Error Handling**
   - Keep timestamp display for stale data
   - Show "Last updated: [timestamp]" for cached data
   - Display connection errors gracefully

3. **Caching Strategy**
   - Alpha Vantage: 10-minute cache (already implemented)
   - News: 3-hour cache
   - Market data: 1-hour cache
   - User profiles: Session-based

4. **Refresh Intervals**
   - Dashboard: Manual pull-to-refresh
   - Notifications: Auto-refresh every 5 minutes when app is active
   - Market data: Auto-refresh every 15 minutes

## 📝 Implementation Priority

### Phase 1 (Critical for Launch):
1. Replace AIAnalysisOverlay mock data with real API calls
2. Ensure all refresh controls show real timestamps
3. Remove development authentication mocks

### Phase 2 (Post-Launch):
1. Add auto-refresh for critical data
2. Implement WebSocket for real-time updates
3. Add offline queue for user actions

## 🔍 Testing Checklist

- [ ] Test with backend offline (graceful degradation)
- [ ] Test with slow network (loading states)
- [ ] Test with API rate limits (cached data)
- [ ]<berserk>Test pull-to-refresh on all screens
- [ ] Verify timestamps update correctly
- [ ] Check data persistence across app restarts

## 📱 User Experience Guidelines

1. **Loading States**: Always show loading indicators during refresh
2. **Error Messages**: User-friendly error messages, not technical
3. **Timestamps**: Show "Updated X minutes ago" for transparency
4. **Offline Mode**: Clear indication when using cached data
5. **Success Feedback**: Brief toast/alert when refresh completes
