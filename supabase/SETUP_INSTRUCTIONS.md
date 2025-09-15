# Supabase Database Setup Instructions

## Overview
This directory contains SQL scripts to set up all necessary database tables for the Integra Markets application.

## Required Tables

The application requires the following tables in Supabase:

1. **user_preferences** - Stores user preferences for news feeds and alerts
2. **push_tokens** - Stores device tokens for push notifications
3. **alert_preferences** - Stores detailed alert configuration per user
4. **notifications** - Stores all notifications sent to users
5. **market_alerts** - Stores commodity-specific market alerts

## Setup Steps

### Step 1: Access Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/jcovjmuaysebdfbpbvdh
2. Click on **"SQL Editor"** in the left sidebar
3. Click on **"New query"** button

### Step 2: Run the Complete Setup Script

1. Open the file `complete_setup.sql` from this directory
2. Copy the entire contents of the file
3. Paste it into the SQL Editor
4. Click **"Run"** button (or press Ctrl/Cmd + Enter)

### Step 3: Verify Setup

After running the script, verify that all tables were created:

```sql
-- Run this query to see all your tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- user_preferences
- push_tokens
- alert_preferences
- notifications
- market_alerts

### Step 4: Check Authentication Settings

Ensure email authentication is enabled:

1. Go to **Authentication** → **Providers** in your Supabase dashboard
2. Make sure **Email** provider is enabled
3. Configure email settings:
   - Enable email confirmations (optional but recommended)
   - Set up SMTP if you want custom email templates

### Step 5: Test User Registration

After setup, test that users can register:

1. Run your Expo app
2. Try creating a new account
3. Check the **Authentication** → **Users** tab in Supabase to see if the user was created

## Files in This Directory

- **complete_setup.sql** - Complete setup script with all tables, indexes, policies, and functions
- **create_user_preferences_table.sql** - Individual script for user preferences table only
- **SETUP_INSTRUCTIONS.md** - This file

## Important Notes

### About Row Level Security (RLS)

All tables have Row Level Security enabled with appropriate policies. This ensures:
- Users can only see and modify their own data
- System can insert notifications for any user
- Market alerts are visible to all authenticated users

### About Test Data

The setup script includes test data for two users:
- `test-user` - Sample user with oil and gold preferences
- `demo-user` - Sample user with agricultural commodity preferences

**Remove these in production!**

### Troubleshooting

If you get errors about duplicate tables or policies:
1. The script uses `IF NOT EXISTS` clauses, so it's safe to run multiple times
2. If you need to start fresh, you can drop tables first (BE CAREFUL - this deletes data):

```sql
-- WARNING: This deletes all data!
DROP TABLE IF EXISTS public.user_preferences CASCADE;
DROP TABLE IF EXISTS public.push_tokens CASCADE;
DROP TABLE IF EXISTS public.alert_preferences CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.market_alerts CASCADE;
```

### Authentication Issues

If users can sign up but preferences aren't saving:
1. Check that the user_id format matches between auth.users and user_preferences
2. Verify RLS policies are correctly configured
3. Check Supabase logs for any permission errors

## Next Steps

After setting up the database:

1. **Configure Push Notifications** (if using)
   - Set up Firebase Cloud Messaging
   - Update push notification endpoints in the backend

2. **Set Up Backend Services**
   - Deploy backend to Fly.io
   - Configure environment variables with Supabase credentials

3. **Test End-to-End**
   - Create a user account
   - Set preferences
   - Verify data is saved in Supabase

## Support

For issues or questions:
- Check Supabase logs: Dashboard → Logs → Recent Queries
- Review RLS policies: Database → Tables → [table] → RLS Policies
- Check user permissions: Authentication → Users
