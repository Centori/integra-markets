import { createClient } from '@supabase/supabase-js';

// Create admin client with service role key for database setup
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // This should NOT be EXPO_PUBLIC_

let adminClient: any = null;

// Only create admin client if we have the service role key
if (supabaseServiceKey && supabaseServiceKey !== 'your_service_role_key_here') {
  adminClient = createClient(supabaseUrl, supabaseServiceKey);
}

export const setupDatabase = {
  async createTables() {
    if (!adminClient) {
      console.log('⚠️ Service role key not available. Please create tables manually in Supabase dashboard.');
      console.log('SQL to run:');
      console.log(`
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  symbol text not null,
  type text check (type in ('BUY', 'SELL')) not null,
  quantity decimal not null,
  price decimal not null,
  total decimal not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS for trades
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

-- Create policies for trades
CREATE POLICY "Users can view own trades" ON trades FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own trades" ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own trades" ON trades FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own trades" ON trades FOR DELETE USING (auth.uid() = user_id);
      `);
      return false;
    }

    try {
      console.log('🚀 Setting up database tables...');

      // Create profiles table
      const profilesSQL = `
        CREATE TABLE IF NOT EXISTS profiles (
          id uuid references auth.users on delete cascade primary key,
          email text unique not null,
          full_name text,
          avatar_url text,
          created_at timestamp with time zone default timezone('utc'::text, now()) not null,
          updated_at timestamp with time zone default timezone('utc'::text, now()) not null
        );
      `;

      const { error: profilesError } = await adminClient.rpc('exec_sql', { sql: profilesSQL });
      
      if (profilesError) {
        console.error('❌ Error creating profiles table:', profilesError);
        return false;
      }

      // Enable RLS and create policies for profiles
      const profilesPoliciesSQL = `
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
        
        CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
        CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
        CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
      `;

      const { error: profilesPolicyError } = await adminClient.rpc('exec_sql', { sql: profilesPoliciesSQL });
      
      if (profilesPolicyError) {
        console.error('❌ Error setting up profiles policies:', profilesPolicyError);
      }

      // Create trades table
      const tradesSQL = `
        CREATE TABLE IF NOT EXISTS trades (
          id uuid default gen_random_uuid() primary key,
          user_id uuid references auth.users(id) on delete cascade not null,
          symbol text not null,
          type text check (type in ('BUY', 'SELL')) not null,
          quantity decimal not null,
          price decimal not null,
          total decimal not null,
          created_at timestamp with time zone default timezone('utc'::text, now()) not null,
          updated_at timestamp with time zone default timezone('utc'::text, now()) not null
        );
      `;

      const { error: tradesError } = await adminClient.rpc('exec_sql', { sql: tradesSQL });
      
      if (tradesError) {
        console.error('❌ Error creating trades table:', tradesError);
        return false;
      }

      // Enable RLS and create policies for trades
      const tradesPoliciesSQL = `
        ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view own trades" ON trades;
        DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
        DROP POLICY IF EXISTS "Users can update own trades" ON trades;
        DROP POLICY IF EXISTS "Users can delete own trades" ON trades;
        
        CREATE POLICY "Users can view own trades" ON trades FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert own trades" ON trades FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update own trades" ON trades FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete own trades" ON trades FOR DELETE USING (auth.uid() = user_id);
      `;

      const { error: tradesPolicyError } = await adminClient.rpc('exec_sql', { sql: tradesPoliciesSQL });
      
      if (tradesPolicyError) {
        console.error('❌ Error setting up trades policies:', tradesPolicyError);
      }

      console.log('✅ Database setup completed successfully!');
      return true;

    } catch (error) {
      console.error('❌ Database setup error:', error);
      return false;
    }
  },

  async checkTables() {
    console.log('🔍 Checking if tables exist...');
    
    try {
      // Use the regular client to check tables
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!);

      // Try to query the profiles table
      const { error: profilesError } = await supabase
        .from('profiles')
        .select('count', { count: 'exact' })
        .limit(0);

      const profilesExist = !profilesError || profilesError.code !== '42P01';

      // Try to query the trades table
      const { error: tradesError } = await supabase
        .from('trades')
        .select('count', { count: 'exact' })
        .limit(0);

      const tradesExist = !tradesError || tradesError.code !== '42P01';

      console.log(`📊 Tables status:
        - Profiles: ${profilesExist ? '✅ Exists' : '❌ Missing'}
        - Trades: ${tradesExist ? '✅ Exists' : '❌ Missing'}`);

      return {
        profiles: profilesExist,
        trades: tradesExist,
        allExist: profilesExist && tradesExist
      };
    } catch (error) {
      console.error('❌ Error checking tables:', error);
      return {
        profiles: false,
        trades: false,
        allExist: false
      };
    }
  }
};
