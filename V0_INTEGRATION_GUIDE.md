# V0 Landing Page Integration Guide

This guide shows you how to connect your v0 landing page to your React Native web app with your existing Supabase credentials.

## 🔧 Prerequisites Complete ✅

Your Integra Markets app is now ready for deep linking with the following enhancements:

1. **Enhanced Supabase Configuration** - Works seamlessly on both web and mobile
2. **Web Auth Handler** - Dedicated service for handling OAuth callbacks and deep linking
3. **URL Parameter Processing** - Automatically detects login/signup intentions from URLs
4. **OAuth Callback Management** - Handles Google OAuth redirects properly

## 🌐 Supabase Dashboard Setup

### Step 1: Configure Redirect URLs

In your Supabase dashboard (https://supabase.com/dashboard/project/jcovjmuaysebdfbpbvdh):

1. Go to **Authentication** → **URL Configuration**
2. Add these Site URLs:
   ```
   https://integramarkets.app
   https://integramarkets.app/app
   ```

3. Add these Redirect URLs:
   ```
   https://integramarkets.app/app
   https://integramarkets.app/app/auth/callback
   http://localhost:8081 (for development)
   ```

### Step 2: Enable OAuth Providers

1. Go to **Authentication** → **Providers**
2. Enable **Google** provider
3. Add your Google OAuth credentials:
   - **Client ID**: `1039046627332-nk0jejccajfd9u63p5kas0l5ps53nlsq.apps.googleusercontent.com` (from your app.json)
   - **Client Secret**: (Get this from Google Cloud Console)

## 🔗 V0 Landing Page Integration

### Method 1: Direct URL Parameters (Recommended)

Update your v0 landing page buttons to include auth parameters:

```html
<!-- For Login -->
<a href="https://integramarkets.app/app?auth=login" class="login-btn">
  Log In
</a>

<!-- For Sign Up -->
<a href="https://integramarkets.app/app?auth=signup" class="signup-btn">
  Sign Up
</a>

<!-- For Google OAuth (direct) -->
<a href="https://integramarkets.app/app?auth=login&provider=google" class="google-btn">
  Continue with Google
</a>
```

### Method 2: JavaScript Integration

For more control, use JavaScript to handle the navigation:

```javascript
// Add to your v0 landing page
function openAuth(mode) {
  const url = `https://integramarkets.app/app?auth=${mode}`;
  
  // Option A: Direct navigation
  window.location.href = url;
  
  // Option B: Open in new tab
  // window.open(url, '_blank');
}

// Update your button event handlers
document.querySelector('.login-btn').onclick = () => openAuth('login');
document.querySelector('.signup-btn').onclick = () => openAuth('signup');
```

### Method 3: Popup Integration (Advanced)

For a seamless popup experience:

```javascript
function openAuthPopup(mode) {
  const popup = window.open(
    `https://integramarkets.app/app?auth=${mode}`,
    'integra-auth',
    'width=500,height=700,scrollbars=yes,resizable=yes'
  );
  
  // Listen for authentication completion
  const checkClosed = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkClosed);
      // Optionally refresh or update the parent page
      window.location.reload();
    }
  }, 1000);
}
```

## 🚀 Deployment Steps

### Step 1: Environment Variables

Ensure these environment variables are set in your Vercel deployment:

```env
EXPO_PUBLIC_SUPABASE_URL=https://jcovjmuaysebdfbpbvdh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 2: Build and Deploy

```bash
# Build the web version
npm run build:web:prod

# Deploy to Vercel (if using CLI)
npm run deploy:vercel

# Or push to your connected GitHub repo for automatic deployment
```

### Step 3: Update Domain Configuration

If your landing page is at the root domain and app at `/app`:

1. **Landing Page**: `https://integramarkets.app/`
2. **React Native Web App**: `https://integramarkets.app/app/`

Update your `vercel.json` to handle this routing:

```json
{
  "rewrites": [
    {
      "source": "/app",
      "destination": "/app/index.html"
    },
    {
      "source": "/app/(.*)",
      "destination": "/app/$1"
    },
    {
      "source": "/((?!app|_expo|static|assets).*)",
      "destination": "/index.html"
    }
  ]
}
```

## 🔄 User Flow Examples

### Flow 1: Landing Page → Login
1. User clicks "Log In" on your v0 landing page
2. Redirected to: `https://integramarkets.app/app?auth=login`
3. App detects `?auth=login` parameter
4. Shows login modal immediately (500ms delay)
5. User completes Google OAuth or email login
6. Redirected to dashboard

### Flow 2: Landing Page → Sign Up
1. User clicks "Sign Up" on your v0 landing page
2. Redirected to: `https://integramarkets.app/app?auth=signup`  
3. App shows signup form immediately
4. User creates account and confirms email
5. Redirected to onboarding flow

## 🧪 Testing

### Local Testing

1. Start your development server:
   ```bash
   npm run web
   ```

2. Test these URLs manually:
   - `http://localhost:8081?auth=login`
   - `http://localhost:8081?auth=signup`
   - `http://localhost:8081?auth=login&provider=google`

### Production Testing

1. Deploy your app to Vercel
2. Test the integration URLs:
   - `https://your-domain.vercel.app?auth=login`
   - `https://your-domain.vercel.app?auth=signup`

## 🐛 Troubleshooting

### Authentication Issues

**Problem**: OAuth redirect not working
**Solution**: Verify redirect URLs in Supabase dashboard match your domain

**Problem**: Environment variables not loading
**Solution**: Check Vercel environment variables and redeploy

**Problem**: Deep linking not triggering
**Solution**: Verify URL parameters are being passed correctly

### URL Issues

**Problem**: 404 errors on auth URLs  
**Solution**: Check `vercel.json` rewrite rules

**Problem**: Base URL conflicts
**Solution**: Ensure `app.json` web baseUrl is set to `/`

## 📊 Analytics & Monitoring

Track the authentication flow with these events:

```javascript
// Add to your v0 landing page
function trackAuthClick(method) {
  // Google Analytics
  gtag('event', 'auth_initiated', {
    'method': method,
    'source': 'landing_page'
  });
  
  // Or your preferred analytics tool
}
```

## 🔒 Security Considerations

1. **HTTPS Only**: Ensure all URLs use HTTPS in production
2. **Supabase RLS**: Enable Row Level Security on your Supabase tables
3. **CORS Settings**: Configure proper CORS policies
4. **CSP Headers**: Set Content Security Policy headers in Vercel

## 📱 Mobile Considerations

The deep linking will work on mobile browsers, but for native mobile apps, you'd need to configure:

1. **Custom URL Schemes**: `integra://auth/login`
2. **Universal Links** (iOS): Associate domains
3. **App Links** (Android): Intent filters

Your current setup focuses on web, which is perfect for the v0 → web app integration.

## ✅ Ready to Deploy

Your integration is now ready! The key URLs for your v0 landing page are:

- **Login**: `https://integramarkets.app/app?auth=login`
- **Sign Up**: `https://integramarkets.app/app?auth=signup`
- **Google Login**: `https://integramarkets.app/app?auth=login&provider=google`

Just update your landing page buttons and deploy! 🚀
