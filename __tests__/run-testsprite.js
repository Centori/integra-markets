#!/usr/bin/env node

/**
 * TestSprite Runner Wrapper
 * Runs TestSprite tests with proper module loading
 */

async function runTestSprite() {
  console.log('🚀 Starting TestSprite AI Testing Framework...\n');
  
  try {
    // Dynamic import to handle ES modules
    const { default: TestSprite } = await import('./TestSprite.js');
    
    // Create TestSprite instance
    const testSprite = new TestSprite();
    
    // Initialize TestSprite
    await testSprite.initialize();
    
    // Check command line arguments
    const args = process.argv.slice(2);
    const testType = args[0];
    
    let results;
    
    // Run specific tests or all tests
    switch (testType) {
      case 'frontend':
        console.log('Running frontend tests only...\n');
        results = await testSprite.runFrontendTests();
        break;
      case 'api':
        console.log('Running API tests only...\n');
        results = await testSprite.runAPITests();
        break;
      case 'auth':
        console.log('Running authentication tests only...\n');
        results = await testSprite.runAuthTests();
        break;
      default:
        console.log('Running all tests...\n');
        results = await testSprite.runAllTests();
    }
    
    // Display summary
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    if (results.summary) {
      console.log(`Overall Pass Rate: ${results.summary.overall.passRate}%`);
      console.log(`Total Tests: ${results.summary.overall.total}`);
      console.log(`Passed: ${results.summary.overall.passed}`);
      console.log(`Failed: ${results.summary.overall.failed}`);
    }
    
    // Check API connection status
    console.log('\n🌐 API Connection Status:');
    console.log('=========================');
    
    // Simple API health check
    try {
      const response = await fetch('http://172.20.10.7:8000/health');
      if (response.ok) {
        console.log('✅ Backend API is ONLINE (Real-time data available)');
        const health = await response.json();
        console.log(`   Status: ${health.status}`);
        console.log(`   Supabase Connected: ${health.supabase_connected}`);
      } else {
        console.log('⚠️ Backend API returned error (Using fallback data)');
      }
    } catch (error) {
      console.log('❌ Backend API is OFFLINE (Using mock data)');
      console.log(`   Error: ${error.message}`);
    }
    
    // Check NLTK/FinBERT availability
    console.log('\n🤖 NLP Models Status:');
    console.log('====================');
    try {
      const modelResponse = await fetch('http://172.20.10.7:8000/api/models/status');
      if (modelResponse.ok) {
        const models = await modelResponse.json();
        console.log('✅ NLP Models Available:');
        console.log(`   NLTK: ${models.nltk_available ? '✓' : '✗'}`);
        console.log(`   FinBERT: ${models.finbert_available ? '✓' : '✗'}`);
        console.log(`   VADER: ${models.vader_available ? '✓' : '✗'}`);
      } else {
        console.log('⚠️ Cannot check model status');
      }
    } catch (error) {
      console.log('❌ NLP Models unavailable (Using basic sentiment)');
    }
    
    // Clean up
    await testSprite.cleanup();
    
    // Exit with appropriate code
    const exitCode = results.summary && results.summary.overall.failed > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ TestSprite execution failed:', error);
    process.exit(1);
  }
}

// Run TestSprite
runTestSprite().catch(console.error);
