# Integra Markets Deployment Strategy

## Overview
You have two complementary projects:
1. **Mobile App** (React Native/Expo) - The main application
2. **Landing Page** (Next.js) - Marketing website

## Recommended Setup

### Option 1: Separate Deployments (Easiest)

#### Structure:
```
integra-markets/          # React Native app (current repo)
integra-markets-landing/  # Next.js landing page (new repo)
```

#### Deployment:
- **Mobile App**: Deploy to Vercel as static web app (current setup)
- **Landing Page**: Deploy to Vercel as Next.js app

#### Domains:
- Landing: `www.integramarkets.app` (main domain)
- App: `app.integramarkets.app` (subdomain)

### Option 2: Subdirectory in Same Repo

#### Structure:
```
integra-markets/
├── app/            # React Native app files
├── landing/        # Next.js landing page
├── package.json    # Mobile app package.json
└── vercel.json     # Vercel configuration
```

#### Implementation Steps:

1. **Copy landing page to subdirectory**:
```bash
cp -r "/Users/lm/Desktop/robinhood-loading (8)" ./landing
```

2. **Update vercel.json**:
```json
{
  "buildCommand": "npm run build:web:prod",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "rewrites": [
    {
      "source": "/app/(.*)",
      "destination": "/app/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/landing/$1"
    }
  ]
}
```

3. **Create shared configuration**:
```typescript
// packages/shared/config.ts
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
```

### Option 3: Multi-App Vercel Project

Use Vercel's project linking to deploy both:

1. **Landing Page Project**:
   - Name: `integra-markets-landing`
   - Framework: Next.js
   - Domain: `integramarkets.app`

2. **Mobile Web App Project**:
   - Name: `integra-markets-app`
   - Framework: Other (static)
   - Domain: `app.integramarkets.app`

## Shared Resources

### Authentication Flow:
1. User signs up on landing page
2. Redirect to `app.integramarkets.app` with auth token
3. Mobile app validates token with Supabase

### Code Sharing:
- Supabase configuration
- Type definitions
- API endpoints
- Brand assets

## Quick Start

### For Landing Page Integration:
```bash
# Copy landing page
cp -r "/Users/lm/Desktop/robinhood-loading (8)" ./landing

# Install dependencies
cd landing && npm install

# Add to git
git add landing/
git commit -m "feat: Add Next.js landing page"
```

### Environment Variables:
Both projects need:
- `NEXT_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Deployment Commands:
```bash
# Deploy mobile app
vercel --prod

# Deploy landing (from landing directory)
cd landing && vercel --prod
```

## Benefits:
1. ✅ SEO-optimized landing page (Next.js)
2. ✅ High-performance mobile app (React Native)
3. ✅ Shared authentication (Supabase)
4. ✅ Consistent branding
5. ✅ Single repository (optional)
