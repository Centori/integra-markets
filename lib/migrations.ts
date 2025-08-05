import { supabase } from './supabase';

// Database setup and migration functions
export const migrations = {
  // Create profiles table
  async createProfilesTable() {
    console.log('🚀 Creating profiles table...');
    
    const { data, error } = await supabase.rpc('create_profiles_table');
    
    if (error) {
      console.error('❌ Error creating profiles table:', error);
      return false;
    }
    
    console.log('✅ Profiles table created successfully');
    return true;
  },

  // Create trades table
  async createTradesTable() {
    console.log('🚀 Creating trades table...');
    
    const { data, error } = await supabase.rpc('create_trades_table');
    
    if (error) {
      console.error('❌ Error creating trades table:', error);
      return false;
    }
    
    console.log('✅ Trades table created successfully');
    return true;
  },

  // Run all migrations
  async runAllMigrations() {
    console.log('🚀 Running database migrations...');
    
    try {
      // First, let's check if we can create the functions we need
      await this.createDatabaseFunctions();
      
      // Then create the tables
      const profilesSuccess = await this.createProfilesTable();
      const tradesSuccess = await this.createTradesTable();
      
      if (profilesSuccess && tradesSuccess) {
        console.log('✅ All migrations completed successfully!');
        return true;
      } else {
        console.log('⚠️ Some migrations failed');
        return false;
      }
    } catch (error) {
      console.error('❌ Migration error:', error);
      return false;
    }
  },

  // Create the RPC functions needed for migrations
  async createDatabaseFunctions() {
    console.log('🚀 Creating database functions...');
    
    // Create profiles table function
    const createProfilesFunction = `
      CREATE OR REPLACE FUNCTION create_profiles_table()
      RETURNS void AS $$
      BEGIN
        -- Create profiles table if it doesn't exist
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

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
        DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

        -- Create policies
        CREATE POLICY "Users can view own profile" 
          ON profiles FOR SELECT 
          USING (auth.uid() = id);

        CREATE POLICY "Users can update own profile" 
          ON profiles FOR UPDATE 
          USING (auth.uid() = id);

        CREATE POLICY "Users can insert own profile" 
          ON profiles FOR INSERT 
          WITH CHECK (auth.uid() = id);

        -- Create trigger for updated_at
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = now();
          RETURN NEW;
        END;
        $$ language 'plpgsql';

        DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
        CREATE TRIGGER update_profiles_updated_at
          BEFORE UPDATE ON profiles
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      END;
      $$ LANGUAGE plpgsql;
    `;

    // Create trades table function
    const createTradesFunction = `
      CREATE OR REPLACE FUNCTION create_trades_table()
      RETURNS void AS $$
      BEGIN
        -- Create trades table if it doesn't exist
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

        -- Enable RLS
        ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view own trades" ON trades;
        DROP POLICY IF EXISTS "Users can insert own trades" ON trades;
        DROP POLICY IF EXISTS "Users can update own trades" ON trades;
        DROP POLICY IF EXISTS "Users can delete own trades" ON trades;

        -- Create policies
        CREATE POLICY "Users can view own trades" 
          ON trades FOR SELECT 
          USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert own trades" 
          ON trades FOR INSERT 
          WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update own trades" 
          ON trades FOR UPDATE 
          USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete own trades" 
          ON trades FOR DELETE 
          USING (auth.uid() = user_id);

        -- Create trigger for updated_at
        DROP TRIGGER IF EXISTS update_trades_updated_at ON trades;
        CREATE TRIGGER update_trades_updated_at
          BEFORE UPDATE ON trades
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      END;
      $$ LANGUAGE plpgsql;
    `;

    try {
      // Execute the function creation SQL directly
      const { error: profilesFuncError } = await supabase.rpc('exec_sql', { 
        sql: createProfilesFunction 
      });
      
      if (profilesFuncError) {
        // Try using direct SQL execution instead
        const { error: directError1 } = await supabase.from('_').select('*').limit(0);
        // This will fail, but let's try a different approach
        
        console.log('⚠️ Unable to create functions via RPC, you may need to run the SQL manually');
        return false;
      }

      const { error: tradesFuncError } = await supabase.rpc('exec_sql', { 
        sql: createTradesFunction 
      });
      
      if (tradesFuncError) {
        console.log('⚠️ Unable to create trades function');
        return false;
      }

      console.log('✅ Database functions created successfully');
      return true;
    } catch (error) {
      console.error('❌ Error creating database functions:', error);
      console.log('ℹ️ You may need to run the SQL manually in the Supabase dashboard');
      return false;
    }
  },

  // Simple table existence check
  async checkTablesExist() {
    console.log('🔍 Checking if tables exist...');
    
    try {
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

// Export the migration runner
export const runMigrations = migrations.runAllMigrations.bind(migrations);
export const checkTables = migrations.checkTablesExist.bind(migrations);
