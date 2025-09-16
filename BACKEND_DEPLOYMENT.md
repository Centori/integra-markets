# Backend Deployment Guide

## Option 1: Render.com (Recommended - Free & Fast)

1. **Sign up at https://render.com**

2. **Create New Web Service:**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your `integra-markets` repo

3. **Configure the service:**
   - Name: `integra-markets-api`
   - Environment: `Docker`
   - Region: Choose closest to you
   - Branch: `main`
   - Build Command: (leave empty - uses Dockerfile)
   - Start Command: (leave empty - uses Dockerfile)

4. **Add Environment Variables:**
   Click "Environment" and add these:
   ```
   SUPABASE_URL=https://jcovjmuaysebdfbpbvdh.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impjb3ZqbXVheXNlYmRmYnBidmRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0OTA3NTEsImV4cCI6MjA2ODA2Njc1MX0.vnIaHcLbQRBz1Q1HgFOT5-KZqghQDKBu-uCanVU2AGQ
   HUGGING_FACE_TOKEN=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
   ALPHA_VANTAGE_API_KEY=(your key if you have one)
   OPENWEATHERMAP_API_KEY=(your key if you have one)
   ```

5. **Deploy:**
   - Click "Create Web Service"
   - Wait 10-15 minutes for first deployment
   - Your URL will be: `https://integra-markets-api.onrender.com`

## Option 2: Railway.app (Fast Alternative)

1. **Sign up at https://railway.app**

2. **Deploy from GitHub:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Initialize project
   railway init
   
   # Link to GitHub
   railway link
   
   # Add environment variables
   railway variables set SUPABASE_URL=https://jcovjmuaysebdfbpbvdh.supabase.co
   railway variables set SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   railway variables set HUGGING_FACE_TOKEN=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
   
   # Deploy
   railway up
   ```

3. **Get your URL:**
   ```bash
   railway domain
   ```

## Option 3: Fly.io (More Control)

1. **Install Fly CLI:**
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Sign up and deploy:**
   ```bash
   fly auth signup
   fly launch
   fly secrets set SUPABASE_URL="https://jcovjmuaysebdfbpbvdh.supabase.co"
   fly secrets set SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   fly secrets set HUGGING_FACE_TOKEN="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"
   fly deploy
   ```

## Option 4: Local Ngrok (Immediate Testing)

For immediate testing while setting up a proper deployment:

1. **Start your backend locally:**
   ```bash
   cd /Users/lm/Desktop/integra/integra-markets
   python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. **In another terminal, expose it with ngrok:**
   ```bash
   npm install -g ngrok
   ngrok http 8000
   ```

3. **Use the ngrok URL** (e.g., `https://abc123.ngrok.io`)

## Important Deployment Notes

### ML Features Deployment
When deploying with ML features (PyTorch):
1. Ensure these dependencies are in requirements.txt:
   ```
   torch==2.1.0
   torchvision==0.16.0
   scikit-learn==1.3.0
   ```
2. Be aware of increased deployment time and container size (~3.2GB)
3. Consider using a larger instance size on Fly.io
4. Monitor memory usage carefully

### Temporary ML Feature Disabling
If experiencing deployment issues:
1. Comment out enhanced sentiment analysis imports
2. Modify affected endpoints to return basic responses
3. Update status in BACKEND_STATUS.md
4. Re-enable features gradually after successful deployment

## After Deployment

Once deployed, update your `app.json`:

```json
"extra": {
  "apiUrl": "YOUR_BACKEND_URL_HERE",
  // ... other settings
}
```

Then rebuild your app for TestFlight.

## Testing Your Backend

Test that your backend is working:
```bash
curl YOUR_BACKEND_URL/health
```

Should return:
```json
{"status": "healthy", "timestamp": "2024-01-01T00:00:00Z"}
```

Test specific endpoints:
```bash
# Get latest news
curl YOUR_BACKEND_URL/api/news/latest

# Refresh news (POST request)
curl -X POST YOUR_BACKEND_URL/api/news/refresh
```
