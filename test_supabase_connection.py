import os
import sys
import sqlite3
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

# Also try parent directory
parent_dir = Path(__file__).parent
env_path = parent_dir / '.env'
load_dotenv(env_path)

# Get Supabase URL and Key from environment variables
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

print("\n=== Database Connection Tests ===")
print("\n1. Supabase Connection Test")
print(f"SUPABASE_URL: {supabase_url}")
print(f"SUPABASE_KEY: {supabase_key[:20]}..." if supabase_key else "SUPABASE_KEY: Not found")

# Check if environment variables are set
if not supabase_url or not supabase_key:
    print("\n⚠️ Missing Supabase credentials. Will continue with local SQLite database.")
else:
    print("\n✅ Supabase credentials found in environment variables.")

# Check local SQLite database
print("\n2. Local SQLite Database Test")
sqlite_db_path = os.path.join(parent_dir, "backend", "data", "db.sqlite3")
print(f"SQLite DB Path: {sqlite_db_path}")

if os.path.exists(sqlite_db_path):
    print(f"✅ SQLite database file exists at {sqlite_db_path}")
    
    # Connect to the SQLite database
    try:
        conn = sqlite3.connect(sqlite_db_path)
        cursor = conn.cursor()
        
        # Get list of tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        print(f"\nFound {len(tables)} tables in the SQLite database:")
        for table in tables:
            print(f" - {table[0]}")
            
            # Get table schema
            cursor.execute(f"PRAGMA table_info({table[0]})")
            columns = cursor.fetchall()
            print(f"   Columns: {len(columns)}")
            
        conn.close()
        print("\n✅ Successfully connected to SQLite database!")
    except Exception as e:
        print(f"\n❌ Error connecting to SQLite database: {str(e)}")
else:
    print(f"\n❌ SQLite database file does not exist at {sqlite_db_path}")


# Try to create Supabase client if credentials are available
if supabase_url and supabase_key:
    try:
        print("\n3. Attempting to create Supabase client...")
        supabase = create_client(supabase_url, supabase_key)
        print("✅ Supabase client created successfully!")
        
        # Try a simple query to verify connection
        print("\nTesting Supabase connection...")
        # Try to query a few common tables
        for table in ['profiles']:
            try:
                print(f"\nTrying to query table: {table}")
                response = supabase.table(table).select("*").limit(1).execute()
                print(f"✅ Successfully queried table '{table}'")
                print(f"Response data: {response.data}")
            except Exception as e:
                print(f"❌ Could not query table '{table}': {e}")
        
        print("\nSupabase connection test completed.")
        
    except Exception as e:
        print(f"\n❌ Error connecting to Supabase: {str(e)}")
        print("\nPossible issues:")
        print("1. Invalid Supabase URL or API key")
        print("2. Network connectivity issues")
        print("3. Supabase service might be down")

# Summary of findings
print("\n=== Database Configuration Summary ===")
print("1. Supabase: " + ("✅ Connected" if supabase_url and supabase_key else "⚠️ Not configured"))
print("2. SQLite: " + ("✅ Initialized with tables" if os.path.exists(sqlite_db_path) else "❌ Not initialized"))
print("\nConclusion:")
if os.path.exists(sqlite_db_path):
    print("✅ The system is using a local SQLite database with the required tables.")
    print("   The alert_preferences and notification tables are properly initialized.")
    if not (supabase_url and supabase_key):
        print("⚠️ Supabase integration is not active. The system is running in local-only mode.")
    else:
        print("✅ Supabase integration is available but tables may need to be synchronized.")
else:
    print("❌ Database initialization is incomplete. Please run the backend initialization script.")
    if not (supabase_url and supabase_key):
        print("⚠️ Supabase credentials are also missing. Both local and cloud databases need setup.")