#!/usr/bin/env node

/**
 * Test script to verify Supabase configuration and credentials
 */

const { config } = require('dotenv');
const path = require('path');

// Load environment variables
config({ path: path.resolve(__dirname, '.env') });
config({ path: path.resolve(__dirname, '.env.local') });
config({ path: path.resolve(__dirname, '.env.production') });

console.log('🔍 Checking Supabase Environment Variables...\n');
console.log('=' .repeat(60));

// Check for different possible environment variable names
const envVars = {
  'EXPO_PUBLIC_SUPABASE_URL': process.env.EXPO_PUBLIC_SUPABASE_URL,
  'EXPO_PUBLIC_SUPABASE_ANON_KEY': process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'SUPABASE_URL': process.env.SUPABASE_URL,
  'SUPABASE_ANON_KEY': process.env.SUPABASE_ANON_KEY,
  'SUPABASE_KEY': process.env.SUPABASE_KEY,
};

let hasValidConfig = false;
let supabaseUrl = '';
let supabaseKey = '';

// Check each environment variable
Object.entries(envVars).forEach(([key, value]) => {
  if (value) {
    // Mask the key for security (show only first 10 and last 4 characters)
    const maskedValue = key.includes('KEY') && value.length > 20
      ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
      : value;
    
    console.log(`✅ ${key}: ${maskedValue}`);
    
    // Store the URL and key if found
    if (key.includes('URL') && !supabaseUrl) {
      supabaseUrl = value;
    }
    if ((key.includes('KEY') || key.includes('ANON')) && !supabaseKey) {
      supabaseKey = value;
    }
  } else {
    console.log(`❌ ${key}: Not set`);
  }
});

console.log('\n' + '=' .repeat(60));

// Validate Supabase URL format
if (supabaseUrl) {
  console.log('\n📍 Validating Supabase URL format...');
  
  try {
    const url = new URL(supabaseUrl);
    console.log(`  ✅ Valid URL format: ${url.protocol}//${url.hostname}`);
    
    if (url.hostname.includes('supabase')) {
      console.log('  ✅ Appears to be a Supabase URL');
      hasValidConfig = true;
    } else {
      console.log('  ⚠️  URL doesn\'t contain "supabase" - please verify');
    }
  } catch (error) {
    console.log(`  ❌ Invalid URL format: ${error.message}`);
  }
}

// Validate Supabase Key format
if (supabaseKey) {
  console.log('\n🔑 Validating Supabase Key format...');
  
  if (supabaseKey.startsWith('eyJ')) {
    console.log('  ✅ Key appears to be a valid JWT token');
    
    // Try to decode the JWT header (base64)
    try {
      const headerBase64 = supabaseKey.split('.')[0];
      const header = JSON.parse(Buffer.from(headerBase64, 'base64').toString());
      console.log(`  ✅ JWT Algorithm: ${header.alg || 'Unknown'}`);
      console.log(`  ✅ JWT Type: ${header.typ || 'Unknown'}`);
    } catch (e) {
      console.log('  ⚠️  Could not decode JWT header');
    }
  } else {
    console.log('  ⚠️  Key doesn\'t appear to be a JWT token');
  }
}

console.log('\n' + '=' .repeat(60));

// Test actual Supabase connection
if (supabaseUrl && supabaseKey) {
  console.log('\n🔌 Testing Supabase Connection...\n');
  
  const { createClient } = require('@supabase/supabase-js');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('  ✅ Supabase client created successfully');
    
    // Try a simple health check
    console.log('  🔄 Attempting to connect to Supabase...');
    
    supabase
      .from('_test_connection')
      .select('count')
      .limit(1)
      .then(({ data, error }) => {
        if (error && error.code === '42P01') {
          // Table doesn't exist, but connection works
          console.log('  ✅ Connection successful! (Table doesn\'t exist, which is expected)');
        } else if (error) {
          console.log(`  ⚠️  Connection test returned error: ${error.message}`);
          console.log('      This might be normal if RLS is enabled');
        } else {
          console.log('  ✅ Connection successful!');
        }
        
        console.log('\n' + '=' .repeat(60));
        console.log('\n📊 Summary:');
        console.log(`  URL configured: ${supabaseUrl ? '✅' : '❌'}`);
        console.log(`  Key configured: ${supabaseKey ? '✅' : '❌'}`);
        console.log(`  Ready for deployment: ${supabaseUrl && supabaseKey ? '✅' : '❌'}`);
        
        if (!supabaseUrl || !supabaseKey) {
          console.log('\n⚠️  Action Required:');
          console.log('  1. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env');
          console.log('  2. Add these same variables to Vercel dashboard');
        } else {
          console.log('\n✅ Configuration looks good!');
          console.log('\n📝 Next steps:');
          console.log('  1. Make sure these environment variables are added to Vercel');
          console.log('  2. Go to vercel.com → Your Project → Settings → Environment Variables');
          console.log('  3. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
        }
        
        process.exit(0);
      })
      .catch(err => {
        console.log(`  ❌ Connection failed: ${err.message}`);
        process.exit(1);
      });
  } catch (error) {
    console.log(`  ❌ Failed to create Supabase client: ${error.message}`);
    process.exit(1);
  }
} else {
  console.log('\n❌ Cannot test connection - missing URL or Key');
  console.log('\n📝 Please ensure you have set:');
  console.log('  - EXPO_PUBLIC_SUPABASE_URL');
  console.log('  - EXPO_PUBLIC_SUPABASE_ANON_KEY');
  console.log('\nIn your .env file');
  process.exit(1);
}
