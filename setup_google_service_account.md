# Google Service Account Setup for Android Submission

## Quick Answer: You DON'T Need This!
**Just press Enter to skip and use browser authentication instead.**

But if you want fully automated CLI submissions, follow these steps:

## Step 1: Create Service Account in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the **Google Play Android Developer API**:
   ```
   https://console.cloud.google.com/apis/library/androidpublisher.googleapis.com
   ```
4. Go to **IAM & Admin > Service Accounts**
5. Click **Create Service Account**
6. Name it: `expo-submission`
7. Click **Create and Continue**
8. Skip permissions (we'll set them in Play Console)
9. Click **Done**

## Step 2: Create and Download Key

1. Click on your new service account
2. Go to **Keys** tab
3. Click **Add Key > Create new key**
4. Choose **JSON**
5. Download the file (it will look like: `project-name-xxxxx.json`)
6. Save it as: `google-service-account.json` in your project root

## Step 3: Grant Access in Play Console

1. Go to [Google Play Console](https://play.google.com/console)
2. Go to **Users and Permissions**
3. Click **Invite new users**
4. Enter the service account email (from the JSON file)
   - It looks like: `expo-submission@project-name.iam.gserviceaccount.com`
5. Set permissions:
   - **App permissions**: Select your app
   - **Release management**: Check all
   - **Store presence**: View only
6. Click **Invite user**
7. The service account needs to accept (automatic)

## Step 4: Configure EAS

Update your `eas.json`:

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

## Step 5: Add to .gitignore

**IMPORTANT**: Never commit the service account file!

```bash
echo "google-service-account.json" >> .gitignore
```

---

## Alternative: Skip Service Account

**This is perfectly fine and recommended for most users!**

When you run:
```bash
eas submit --platform android --latest
```

And see:
```
✖ Path to Google Service Account file: … 
```

**Just press Enter!** 

EAS will:
1. Say "Using web browser for authentication"
2. Open your browser
3. Ask you to log in to Google
4. Authorize the submission
5. Complete the submission

This is:
- ✅ Easier
- ✅ More secure (no keys to manage)
- ✅ Works perfectly
- ❌ Just requires you to be at your computer

---

## Which Should You Choose?

### Use Browser Auth (Skip Service Account) if:
- You're doing occasional releases
- You want simpler setup
- You're always at your computer when releasing

### Use Service Account if:
- You have CI/CD pipelines
- You want to automate releases
- You're releasing very frequently
- You want to submit from a remote server

---

## Current Recommendation

**Just press Enter and use browser auth!** It's simpler and works great for your current needs.
