// Quick test to check if Supabase credentials are loading
require('dotenv').config();

console.log('\n🔍 Checking Supabase Environment Variables:\n');
console.log('='.repeat(50));

const configs = [
  { name: 'EXPO_PUBLIC_SUPABASE_URL', value: process.env.EXPO_PUBLIC_SUPABASE_URL },
  { name: 'EXPO_PUBLIC_SUPABASE_ANON_KEY', value: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY },
  { name: 'SUPABASE_URL', value: process.env.SUPABASE_URL },
  { name: 'SUPABASE_KEY', value: process.env.SUPABASE_KEY }
];

let hasExpoVars = false;
let hasStandardVars = false;

configs.forEach(({ name, value }) => {
  if (value) {
    // For URLs, show the domain; for keys, show first 10 chars only
    let display = value;
    if (name.includes('URL')) {
      try {
        const url = new URL(value);
        display = `${url.protocol}//${url.hostname}`;
      } catch {
        display = 'Invalid URL format';
      }
    } else if (name.includes('KEY')) {
      display = value.substring(0, 10) + '...' + value.substring(value.length - 4);
    }
    console.log(`✅ ${name}: ${display}`);
    
    if (name.startsWith('EXPO_PUBLIC_')) hasExpoVars = true;
    else hasStandardVars = true;
  } else {
    console.log(`❌ ${name}: Not set`);
  }
});

console.log('\n' + '='.repeat(50));
console.log('\n📊 Status Summary:\n');

if (hasExpoVars) {
  console.log('✅ Expo/React Native web build variables are set');
  console.log('   These will work for: npm run build:web:prod');
} else {
  console.log('❌ Missing EXPO_PUBLIC_SUPABASE_* variables');
}

if (hasStandardVars) {
  console.log('✅ Standard Supabase variables are set');
  console.log('   These will work for: Backend Python services');
}

console.log('\n🚀 Next Steps for Vercel Deployment:\n');
console.log('1. These environment variables need to be added to Vercel:');
console.log('   - Go to: https://vercel.com/dashboard');
console.log('   - Select your project');
console.log('   - Go to Settings → Environment Variables');
console.log('   - Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
console.log('\n2. Or use Vercel CLI:');
console.log('   vercel env add EXPO_PUBLIC_SUPABASE_URL production');
console.log('   vercel env add EXPO_PUBLIC_SUPABASE_ANON_KEY production');

// Test if we can actually load the Supabase client
console.log('\n' + '='.repeat(50));
console.log('\n🔌 Testing Supabase Client Creation:\n');

try {
  const { createClient } = require('@supabase/supabase-js');
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;
  
  if (url && key) {
    const supabase = createClient(url, key);
    console.log('✅ Supabase client created successfully!');
    console.log('   Your local environment is configured correctly.');
  } else {
    console.log('❌ Cannot create Supabase client - missing credentials');
  }
} catch (error) {
  console.log('❌ Error creating Supabase client:', error.message);
}

console.log('\n' + '='.repeat(50));
