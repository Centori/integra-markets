#!/usr/bin/env node

/**
 * Test script to verify refresh functionality and backend connectivity
 */

const API_BASE_URL = 'http://192.168.0.208:8000';

// Colors for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function testEndpoint(name, url, method = 'GET', body = null) {
  console.log(`\n${colors.blue}Testing: ${name}${colors.reset}`);
  console.log(`URL: ${url}`);
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      console.log(`${colors.green}✓ SUCCESS${colors.reset} - Status: ${response.status}`);
      console.log('Response:', JSON.stringify(data, null, 2).substring(0, 300) + '...');
      return { success: true, data };
    } else {
      console.log(`${colors.red}✗ FAILED${colors.reset} - Status: ${response.status}`);
      console.log('Error:', data);
      return { success: false, error: data };
    }
  } catch (error) {
    console.log(`${colors.red}✗ ERROR${colors.reset} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log(`${colors.yellow}${'='.repeat(60)}`);
  console.log('     Integra Markets Backend & Refresh Test');
  console.log(`${'='.repeat(60)}${colors.reset}`);
  
  let successCount = 0;
  let totalTests = 0;
  
  // Test 1: Health Check
  totalTests++;
  const health = await testEndpoint('Health Check', `${API_BASE_URL}/health`);
  if (health.success) successCount++;
  
  // Test 2: Root Endpoint
  totalTests++;
  const root = await testEndpoint('Root Endpoint', `${API_BASE_URL}/`);
  if (root.success) successCount++;
  
  // Test 3: Market Data (Used by refresh)
  totalTests++;
  const market = await testEndpoint('Market Real-time Data', `${API_BASE_URL}/api/market/realtime`);
  if (market.success) {
    successCount++;
    console.log(`${colors.yellow}Market Data Status: ${market.data.status}${colors.reset}`);
  }
  
  // Test 4: Market Sentiment (Used by TodayDashboard)
  totalTests++;
  const sentiment = await testEndpoint('Market Sentiment', `${API_BASE_URL}/api/sentiment/market`);
  if (sentiment.success) successCount++;
  
  // Test 5: Alert Preferences
  totalTests++;
  const prefs = await testEndpoint('Alert Preferences', `${API_BASE_URL}/api/alerts/preferences`);
  if (prefs.success) successCount++;
  
  // Test 6: Active Alerts
  totalTests++;
  const alerts = await testEndpoint('Active Alerts', `${API_BASE_URL}/api/alerts/active`);
  if (alerts.success) {
    successCount++;
    console.log(`${colors.yellow}Active Alerts Count: ${alerts.data.count}${colors.reset}`);
  }
  
  // Test 7: Sentiment Analysis (POST)
  totalTests++;
  const analysis = await testEndpoint(
    'Sentiment Analysis', 
    `${API_BASE_URL}/api/sentiment`,
    'POST',
    { text: 'Oil prices surge on OPEC+ production cuts', commodity: 'OIL' }
  );
  if (analysis.success) {
    successCount++;
    console.log(`${colors.yellow}Analysis Method: ${analysis.data.method}${colors.reset}`);
  }
  
  // Test 8: Test Notification
  totalTests++;
  const notification = await testEndpoint(
    'Test Notification', 
    `${API_BASE_URL}/api/test/notification`,
    'POST'
  );
  if (notification.success) successCount++;
  
  // Summary
  console.log(`\n${colors.yellow}${'='.repeat(60)}`);
  console.log('                    TEST SUMMARY');
  console.log(`${'='.repeat(60)}${colors.reset}`);
  
  const passRate = Math.round((successCount / totalTests) * 100);
  const statusColor = passRate === 100 ? colors.green : passRate >= 75 ? colors.yellow : colors.red;
  
  console.log(`${statusColor}Passed: ${successCount}/${totalTests} tests (${passRate}%)${colors.reset}`);
  
  if (passRate === 100) {
    console.log(`\n${colors.green}✅ All systems operational!${colors.reset}`);
    console.log('The app refresh function should be working with live data.');
  } else if (passRate >= 75) {
    console.log(`\n${colors.yellow}⚠️  Most systems operational${colors.reset}`);
    console.log('The app should work but some features may be limited.');
  } else {
    console.log(`\n${colors.red}❌ Backend issues detected${colors.reset}`);
    console.log('The app will fall back to mock data.');
  }
  
  // Check specific features
  console.log(`\n${colors.blue}Feature Status:${colors.reset}`);
  console.log(`• Real-time market data: ${market.success && market.data.status === 'live' ? '✅ Live' : '⚠️  Mock'}`);
  console.log(`• AI Sentiment (GROQ): ${analysis.success && analysis.data.method?.includes('groq') ? '✅ Active' : '⚠️  Fallback'}`);
  console.log(`• Alert system: ${alerts.success ? '✅ Working' : '❌ Not working'}`);
  console.log(`• Notifications: ${notification.success ? '✅ Ready' : '❌ Not ready'}`);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test suite failed:${colors.reset}`, error);
  process.exit(1);
});
