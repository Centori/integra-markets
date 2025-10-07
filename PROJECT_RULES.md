# Integra Markets - Project Development Rules

## Table of Contents
1. [Backend Integration Standards](#backend-integration-standards)
2. [Build & Deployment Standards](#build--deployment-standards)

---

## Backend Integration Standards

### 1. API Architecture Principles

#### 1.1 Backend Structure
- **Framework**: FastAPI (Python) for backend API
- **Base URL Pattern**: 
  - Development: `http://localhost:8000`
  - Production: Cloud Run/Render/Railway (configurable)
- **Route Organization**: All API routes under `/api` prefix
  ```python
  # Good
  /api/news/latest
  /api/notifications/register-token
  /api/market-data/fx/rate
  
  # Bad
  /news
  /get-notifications
  ```

#### 1.2 API Client Configuration
- **Location**: `app/services/api.js` or `app/services/apiClient.js`
- **Must Include**:
  - Timeout configuration (default: 30s for news aggregation)
  - Retry logic with exponential backoff (default: 3 retries)
  - Network connectivity checks before critical requests
  - Graceful fallback to mock/default data on failure

```javascript
// Required API Configuration
const API_CONFIG = {
  timeout: 30000,      // 30 seconds
  retries: 3,          // Number of retry attempts
  retryDelay: 2000,    // Base delay between retries (ms)
};
```

### 2. Error Handling Standards

#### 2.1 Backend Error Responses
All API endpoints must return consistent error formats:

```python
# Python Backend
raise HTTPException(
    status_code=404,
    detail="Resource not found"
)
```

#### 2.2 Frontend Error Handling
Every API call must include:
- Try-catch blocks
- Error logging with context
- User-friendly fallback data or messages
- Network status validation

```javascript
// Required Pattern
export const fetchData = async () => {
  try {
    const response = await fetchWithRetry(`${API_URL}/endpoint`);
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      console.error(`API error: ${response.status} - ${errorText}`);
      throw new Error(`API error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching data:', error.message);
    return DEFAULT_FALLBACK_DATA;
  }
};
```

### 3. Authentication Flow

#### 3.1 Supabase Integration
- **Primary Auth Provider**: Supabase
- **Auth Service Location**: `app/services/authService.ts`
- **Session Management**: Use Supabase client for all auth operations

```typescript
// Required Auth Service Methods
class AuthService {
  sendPasswordResetEmail(email: string)
  resetPassword(newPassword: string)
  sendVerificationEmail(email: string)
  isEmailVerified(): Promise<boolean>
  handlePasswordResetCallback(type: string, token: string)
}
```

#### 3.2 Auth Headers
- Never include API keys in client-side code directly
- Use Supabase RLS (Row Level Security) for data access control
- Backend endpoints requiring auth must validate Supabase JWT tokens

### 4. Environment Variables

#### 4.1 Required Environment Variables
All environment variables must be defined in:
- `.env` (local development)
- `.env.production` (production overrides)
- `app.json` under `extra` (for Expo)

**Backend (.env)**:
```bash
SUPABASE_URL=<your-supabase-url>
SUPABASE_KEY=<your-supabase-anon-key>
HUGGING_FACE_TOKEN=<your-hf-token>
ALPHA_VANTAGE_API_KEY=<optional>
```

**Frontend (app.json)**:
```json
"extra": {
  "supabaseUrl": "$EXPO_PUBLIC_SUPABASE_URL",
  "supabaseAnonKey": "$EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "apiUrl": "$EXPO_PUBLIC_API_URL",
  "groqApiKey": "$EXPO_PUBLIC_GROQ_API_KEY"
}
```

#### 4.2 Secrets Management
- ⚠️ **NEVER** commit `.env` files to git (always in `.gitignore`)
- ⚠️ **NEVER** expose backend API keys in mobile app code
- Use environment-specific configuration
- Rotate keys quarterly or after any suspected compromise

### 5. API Request Patterns

#### 5.1 Fetch with Timeout
All fetch requests must implement timeout:

```javascript
const fetchWithTimeout = async (url, options = {}, timeout = 30000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'IntegraMarkets/1.0.1',
        ...options.headers,
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection');
    }
    throw error;
  }
};
```

#### 5.2 Retry Logic
Implement retry for transient failures:

```javascript
const fetchWithRetry = async (url, options = {}, retries = 3) => {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetchWithTimeout(url, options);
      
      // Don't retry client errors
      if (response.status === 404 || response.status === 401 || response.status === 403) {
        return response;
      }
      
      if (!response.ok && i < retries) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
};
```

### 6. Data Validation

#### 6.1 Backend Request Validation
Use Pydantic models for all request/response schemas:

```python
from pydantic import BaseModel
from typing import Optional

class SentimentRequest(BaseModel):
    text: str
    user_id: Optional[str] = None

class SentimentResponse(BaseModel):
    text: str
    sentiment: str
    confidence: float
    timestamp: str
```

#### 6.2 Frontend Data Validation
Validate API responses before using data:

```javascript
const validateNewsItem = (item) => {
  return item 
    && typeof item.title === 'string'
    && typeof item.published === 'string'
    && Array.isArray(item.keywords);
};
```

### 7. CORS Configuration

Backend must allow requests from mobile apps:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## Build & Deployment Standards

### 1. Version Management

#### 1.1 Version Numbering
Follow semantic versioning: `MAJOR.MINOR.PATCH`

**Current Version**: 1.0.1

**Update these files for every release**:
1. `app.json` - `version` field
2. `app.json` - `ios.buildNumber` (auto-increment)
3. `app.json` - `android.versionCode` (auto-increment)
4. `package.json` - `version` field

#### 1.2 Build Number Rules
- **iOS**: Increment `buildNumber` for every TestFlight submission
- **Android**: Increment `versionCode` for every Play Store submission
- Use `autoIncrement: true` in `eas.json` production profile

```json
// eas.json
{
  "build": {
    "production": {
      "autoIncrement": true
    }
  }
}
```

### 2. Pre-Build Checklist

#### 2.1 Code Quality Checks
Before every build, verify:

```bash
# Run linting
npm run lint

# Run tests
npm test

# Check TypeScript compilation
npx tsc --noEmit
```

#### 2.2 Configuration Checks
- [ ] All API endpoints tested and working
- [ ] Environment variables set correctly in `app.json`
- [ ] Backend deployed and accessible
- [ ] API keys validated (Groq, Supabase, etc.)
- [ ] No hardcoded secrets in code
- [ ] `.env` not committed to git

#### 2.3 Asset Verification
- [ ] App icon exists: `assets/icon.png` (1024x1024)
- [ ] Splash screen exists: `assets/splash.png`
- [ ] Notification icon exists: `assets/notification-icon.png`
- [ ] Adaptive icon (Android): `assets/adaptive-icon.png`

### 3. Build Commands

#### 3.1 iOS Builds
```bash
# Development build (internal testing)
eas build --platform ios --profile development

# Production build with auto-submit to TestFlight
eas build --platform ios --profile production --auto-submit

# Manual submission after build
eas submit --platform ios --profile production
```

#### 3.2 Android Builds
```bash
# Development build
eas build --platform android --profile development

# Production build
eas build --platform android --profile production

# Manual submission (download AAB first)
eas submit --platform android --profile production
```

#### 3.3 Build Profiles
Configure in `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true
    }
  }
}
```

### 4. Deployment Workflow

#### 4.1 Backend Deployment Order
1. **Deploy backend first** to Render/Railway/Cloud Run
2. **Test all endpoints** using curl or Postman
3. **Update `app.json`** with new backend URL
4. **Build mobile app** with updated configuration
5. **Submit to TestFlight/Play Store**

#### 4.2 Backend Health Check
Always verify backend health before building:

```bash
# Health check
curl https://your-backend-url.com/health

# Expected response
{"status": "healthy", "supabase_connected": true}
```

### 5. iOS-Specific Requirements

#### 5.1 Privacy & Permissions
Required entries in `app.json` → `ios.infoPlist`:

```json
{
  "NSCameraUsageDescription": "This app uses the camera to scan documents and capture images for analysis.",
  "NSPhotoLibraryUsageDescription": "This app accesses your photo library to select images for analysis.",
  "NSMicrophoneUsageDescription": "This app uses the microphone for voice commands and audio analysis.",
  "NSFaceIDUsageDescription": "This app uses Face ID for secure authentication.",
  "NSUserNotificationsUsageDescription": "This app sends notifications for market alerts and breaking news."
}
```

#### 5.2 Team Configuration
- **Apple Team ID**: Must match in `app.json` → `ios.appleTeamId`
- Current Team ID: `2ABHLWV763`
- Bundle ID: `com.centori.integramarkets`

#### 5.3 Common iOS Build Issues

**ExpoHead.podspec Error**:
```bash
# If you see "undefined method `add_dependency'"
# Run iOS rebuild script
./scripts/clean-ios-rebuild.sh
```

**Privacy Manifest Conflicts**:
```bash
# Remove duplicate manifests
./fix_privacy_manifest.sh
```

### 6. Android-Specific Requirements

#### 6.1 Package Configuration
- Package name: `com.centori.integramarkets`
- Must match across `app.json` and Google Play Console

#### 6.2 Permissions
Required in `app.json` → `android.permissions`:

```json
[
  "android.permission.CAMERA",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
  "android.permission.USE_FINGERPRINT"
]
```

### 7. Environment-Specific Builds

#### 7.1 Development Environment
```bash
# Local backend
export EXPO_PUBLIC_API_URL=http://localhost:8000

# Start local backend
cd backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000

# Start Expo dev server
npm run dev
```

#### 7.2 Production Environment
- Backend URL must be publicly accessible HTTPS endpoint
- Use production Supabase instance
- Enable error tracking (Sentry, LogRocket, etc.)
- Set `NODE_ENV=production`

### 8. Testing Before Submission

#### 8.1 Required Manual Tests
- [ ] Authentication flow (sign up, sign in, reset password)
- [ ] AI chat functionality with proper formatting
- [ ] News feed loading and refresh
- [ ] Market data display
- [ ] Push notifications (if implemented)
- [ ] Offline behavior (graceful degradation)
- [ ] Deep linking (if applicable)

#### 8.2 Automated Tests
Run test suite before submission:

```bash
# Run all tests
npm test

# Run backend integration tests
npm run test:api

# Run frontend component tests
npm run test:frontend
```

### 9. Release Notes Template

For every submission, include clear release notes:

```
Version X.Y.Z - [Date]

Improvements:
• [User-facing feature 1]
• [User-facing feature 2]

Bug Fixes:
• [Fixed issue 1]
• [Fixed issue 2]

Technical:
• [Technical improvement 1]
• [Technical improvement 2]
```

### 10. Post-Deployment Verification

#### 10.1 Immediate Checks
After successful deployment:
- [ ] Download build from TestFlight/Play Store
- [ ] Test on physical devices (iOS and Android)
- [ ] Verify backend connectivity
- [ ] Check crash reporting dashboard
- [ ] Monitor error logs for first 24 hours

#### 10.2 Monitoring
- Use backend logs to track API errors
- Monitor app crashes via EAS or Sentry
- Track user feedback in TestFlight/Play Console
- Set up alerts for critical API failures

### 11. Rollback Procedure

If a build has critical issues:

#### 11.1 iOS
1. Remove build from TestFlight external testing
2. Notify testers of issues
3. Fix issues in codebase
4. Increment build number
5. Submit new build

#### 11.2 Android
1. Halt rollout in Play Console
2. Roll back to previous version if already released
3. Fix issues
4. Increment version code
5. Submit new build

### 12. Documentation Requirements

#### 12.1 Required Documentation Files
Keep these files updated:
- `BUILD_SUBMISSION_SUMMARY.md` - Latest build information
- `BACKEND_DEPLOYMENT.md` - Backend setup instructions
- `DEPLOYMENT_STRATEGY.md` - Overall deployment strategy
- `PROJECT_RULES.md` - This file

#### 12.2 Commit Message Format
Use conventional commits:

```bash
# Features
git commit -m "feat: Add comprehensive integration tests and fix iOS build issues"

# Bug fixes
git commit -m "fix: Resolve ExpoHead.podspec undefined method error"

# Documentation
git commit -m "docs: Update deployment guide with Cloud Run instructions"

# Refactoring
git commit -m "refactor: Reorganize API service structure"

# Build/deployment
git commit -m "build: Update iOS build number to 45"
```

---

## Quick Reference Commands

### Development
```bash
# Start everything locally
npm run dev                          # Frontend
cd backend && python3 main.py        # Backend

# Run tests
npm test                             # All tests
npm run test:api                     # API tests
npm run lint                         # Lint check
npm run lint:fix                     # Auto-fix linting
```

### Building
```bash
# iOS
eas build --platform ios --profile production --auto-submit

# Android
eas build --platform android --profile production

# Both platforms
eas build --platform all --profile production
```

### Backend Deployment
```bash
# Render/Railway/Cloud Run
git push origin main                 # Auto-deploys if configured

# Manual deployment
railway up                           # Railway
fly deploy                           # Fly.io
```

### Health Checks
```bash
# Backend health
curl https://your-backend.com/health

# API endpoint test
curl https://your-backend.com/api/news/latest
```

---

## Support Resources

- **EAS Dashboard**: https://expo.dev/accounts/anilkhamsa/projects/integra
- **Apple App Store Connect**: https://appstoreconnect.apple.com/apps/6748999346
- **Google Play Console**: https://play.google.com/console
- **Supabase Dashboard**: https://supabase.com/dashboard
- **Backend Logs**: Check your deployment platform's dashboard

---

**Last Updated**: January 2025
**Current Version**: 1.0.1
**iOS Build**: 45
**Android Version Code**: 3
