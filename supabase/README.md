# Supabase Database Setup

## Setting up the user_preferences table

The backend requires a `user_preferences` table to store and retrieve user-specific settings for news feeds.

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor (usually in the left sidebar)
3. Copy the entire contents of `create_user_preferences_table.sql`
4. Paste it into the SQL editor
5. Click "Run" to execute the script

### Option 2: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres"
```

Then run:
```bash
supabase db execute -f supabase/create_user_preferences_table.sql
```

### Option 3: Using psql

```bash
psql "postgresql://postgres:[YOUR-PASSWORD]@[YOUR-PROJECT-REF].supabase.co:5432/postgres" -f supabase/create_user_preferences_table.sql
```

## What this creates

The script will create:

1. **user_preferences table** with the following columns:
   - `id`: UUID primary key
   - `user_id`: Unique identifier for each user
   - `commodities`: Array of commodities the user is interested in
   - `sources`: Array of news sources to fetch from
   - `regions`: Array of regions of interest
   - `keywords`: Array of keywords to filter news
   - `websiteURLs`: Array of custom website URLs for news fetching
   - `alertThreshold`: Alert sensitivity level (low/medium/high)
   - `created_at`: Timestamp of record creation
   - `updated_at`: Timestamp of last update

2. **Row Level Security (RLS)** policies for secure access

3. **Test data** for two users:
   - `test-user`: Oil and gold commodities with OilPrice.com and Kitco.com as custom sources
   - `demo-user`: Agricultural commodities with Agriculture.com and Farms.com as custom sources

## Verifying the setup

After running the script, you can verify the table was created:

```sql
-- Check if table exists
SELECT * FROM public.user_preferences;

-- Check specific user preferences
SELECT * FROM public.user_preferences WHERE user_id = 'test-user';
```

## Troubleshooting

If you get an error about the table already existing, you can drop it first:

```sql
DROP TABLE IF EXISTS public.user_preferences CASCADE;
```

Then run the creation script again.

## Environment Variables

Make sure your backend has the correct Supabase credentials:

```env
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
```
