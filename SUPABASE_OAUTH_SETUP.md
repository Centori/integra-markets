# Supabase OAuth Setup with Your Google Credentials

## 🔑 **Your Google OAuth Credentials**

### **Client IDs:**
- **iOS Client ID**: `1039046627332-nk0jejccajfd9u63p5kas0l5ps53nlsq.apps.googleusercontent.com`
- **Web Client ID**: `1039046627332-sb9etffag0j3a8ti34hevhrt2qp44qb5.apps.googleusercontent.com`

### **Client Secret:**
- **Client Secret**: `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`

## 🌐 **Step 1: Configure Supabase Dashboard**

### **Access Your Supabase Project:**
1. Go to: https://supabase.com/dashboard/project/jcovjmuaysebdfbpbvdh
2. Navigate to **Authentication** → **Providers**

### **Enable Google OAuth Provider:**
1. Find **Google** in the providers list
2. Toggle it **ON**
3. Enter your credentials:
   ```
   Client ID: 1039046627332-sb9etffag0j3a8ti34hevhrt2qp44qb5.apps.googleusercontent.com
   Client Secret: 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
   ```
4. Click **Save**

### **Configure Redirect URLs:**
1. Go to **Authentication** → **URL Configuration**
2. Add these **Site URLs**:
   ```
   https://integramarkets.app
   https://integramarkets.app/app
   http://localhost:8081
   ```
3. Add these **Redirect URLs**:
   ```
   https://integramarkets.app/app
   https://integramarkets.app/app/auth/callback
   https://jcovjmuaysebdfbpbvdh.supabase.co/auth/v1/callback
   http://localhost:8081
   http://localhost:8081/auth/callback
   ```

## 🔧 **Step 2: Update Google Cloud Console**

### **Add Authorized Redirect URIs:**
1. Go to: https://console.cloud.google.com/apis/credentials
2. Click on your **Web Client ID**: `1039046627332-sb9etffag0j3a8ti34hevhrt2qp44qb5.apps.googleusercontent.com`
3. Add these **Authorized redirect URIs**:
   ```
   https://jcovjmuaysebdfbpbvdh.supabase.co/auth/v1/callback
   https://integramarkets.app/app
   https://integramarkets.app/app/auth/callback
   http://localhost:8081
   http://localhost:8081/auth/callback
   ```
4. Click **Save**

### **Add Authorized JavaScript Origins:**
1. In the same credential configuration, add:
   ```
   https://integramarkets.app
   https://jcovjmuaysebdfbpbvdh.supabase.co
   http://localhost:8081
   ```

## 🚀 **Step 3: Deploy Environment Variables**

### **For Vercel Deployment:**
1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add these variables:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://jcovjmuaysebdfbpbvdh.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjb3ZqbXVheXNlYmRmYnBidmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTA3NTEsImV4cCI6MjA2ODA2Njc1MX0.vnIaHcLbQRBz1Q1HgFOT5-KZqghQDKBu-uCanVU2AGQ
   GOOGLE_WEB_CLIENT_ID=1039046627332-sb9etffag0j3a8ti34hevhrt2qp44qb5.apps.googleusercontent.com
   ```

## 🔗 **Step 4: V0 Landing Page Integration**

### **Update Your Landing Page Buttons:**

```html
<!-- Login Button -->
<a href="https://integramarkets.app/app?auth=login" class="login-btn">
  Log In
</a>

<!-- Sign Up Button -->
<a href="https://integramarkets.app/app?auth=signup" class="signup-btn">
  Sign Up
</a>

<!-- Google OAuth Button -->
<a href="https://integramarkets.app/app?auth=login&provider=google" class="google-btn">
  <svg><!-- Google icon --></svg>
  Continue with Google
</a>
```

### **Or Use JavaScript:**
```javascript
function redirectToAuth(mode) {
  window.location.href = `https://integramarkets.app/app?auth=${mode}`;
}

function redirectToGoogleAuth() {
  window.location.href = 'https://integramarkets.app/app?auth=login&provider=google';
}
```

## 🧪 **Step 5: Test the Integration**

### **Local Testing:**
1. Start your development server:
   ```bash
   npm run web
   ```

2. Test these URLs:
   - `http://localhost:8081?auth=login`
   - `http://localhost:8081?auth=signup`
   - `http://localhost:8081?auth=login&provider=google`

### **Production Testing:**
1. Deploy to Vercel:
   ```bash
   npm run build:web:prod
   ```

2. Test these URLs:
   - `https://integramarkets.app/app?auth=login`
   - `https://integramarkets.app/app?auth=signup`
   - `https://integramarkets.app/app?auth=login&provider=google`

## 🔄 **Expected User Flow**

### **From Your V0 Landing Page:**
1. User clicks "Continue with Google" 
2. Redirected to: `https://integramarkets.app/app?auth=login&provider=google`
3. App detects parameters and shows auth modal immediately
4. User clicks Google sign-in button
5. Redirected to Google OAuth consent screen
6. User approves permissions
7. Google redirects back to: `https://integramarkets.app/app#access_token=...`
8. App handles OAuth callback automatically
9. User is signed in and sees the dashboard

## 🔍 **Troubleshooting**

### **Common Issues:**

**❌ "OAuth Error: redirect_uri_mismatch"**
- **Solution**: Verify redirect URIs in Google Cloud Console match exactly

**❌ "Invalid client: no application name"** 
- **Solution**: Set application name in Google Cloud Console OAuth consent screen

**❌ "Access blocked: This app's request is invalid"**
- **Solution**: Ensure OAuth consent screen is configured properly

**❌ Supabase OAuth not working**
- **Solution**: Double-check client ID and secret in Supabase dashboard

### **Debug Steps:**
1. Check browser console for errors
2. Verify environment variables are loaded
3. Check network tab for failed requests
4. Test with different browsers/incognito mode

## ✅ **Verification Checklist**

- [ ] ✅ Google OAuth credentials added to `.env`
- [ ] ✅ Supabase Google provider enabled with correct credentials
- [ ] ✅ Redirect URLs configured in both Supabase and Google Cloud
- [ ] ✅ Environment variables deployed to Vercel
- [ ] ✅ V0 landing page buttons updated
- [ ] ✅ Local testing successful
- [ ] ✅ Production deployment complete
- [ ] ✅ End-to-end OAuth flow tested

## 🎯 **Your Integration URLs**

**For your V0 landing page buttons:**

- **Login**: `https://integramarkets.app/app?auth=login`
- **Sign Up**: `https://integramarkets.app/app?auth=signup` 
- **Google OAuth**: `https://integramarkets.app/app?auth=login&provider=google`

You're all set! 🚀 Your deep linking integration with Google OAuth is now ready to deploy.
