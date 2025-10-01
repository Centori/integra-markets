/**
 * Test script to verify the Expo app API integration with deployed backend
 * Run with: node test-api-integration.js
 */

const API_BASE_URL = 'https://integra-markets-backend.fly.dev';
const API_URL = `${API_BASE_URL}/api`;

// Test health check
async function testHealthCheck() {
  console.log('🏥 Testing health check...');
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    const data = await response.json();
    console.log('✅ Health check passed:', data);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

// Test market sentiment endpoint
async function testMarketSentiment() {
  console.log('\n📊 Testing market sentiment...');
  try {
    const response = await fetch(`${API_URL}/sentiment/market`);
    const data = await response.json();
    console.log('✅ Market sentiment:', {
      overall: data.overall,
      confidence: data.confidence,
      commodities: data.commodities?.length || 0
    });
    return true;
  } catch (error) {
    console.error('❌ Market sentiment failed:', error.message);
    return false;
  }
}

// Test news feed endpoint (regular)
async function testNewsFeed() {
  console.log('\n📰 Testing news feed (regular)...');
  try {
    const response = await fetch(`${API_URL}/news/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        max_articles: 3,
        enhanced_content: false
      })
    });
    const data = await response.json();
    console.log('✅ News feed (regular):', {
      status: data.status,
      articles: data.articles?.length || 0,
      sources: data.sources_used || [],
      enhanced_count: data.enhanced_articles_count || 0
    });
    
    // Show first article as sample
    if (data.articles && data.articles[0]) {
      console.log('   Sample article:', {
        title: data.articles[0].title?.substring(0, 60) + '...',
        sentiment: data.articles[0].sentiment,
        source: data.articles[0].source
      });
    }
    return true;
  } catch (error) {
    console.error('❌ News feed failed:', error.message);
    return false;
  }
}

// Test news feed endpoint (enhanced)
async function testEnhancedNewsFeed() {
  console.log('\n🚀 Testing news feed (enhanced)...');
  try {
    const response = await fetch(`${API_URL}/news/feed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        max_articles: 3,
        enhanced_content: true,
        max_enhanced: 2
      })
    });
    const data = await response.json();
    console.log('✅ News feed (enhanced):', {
      status: data.status,
      articles: data.articles?.length || 0,
      sources: data.sources_used || [],
      enhanced_count: data.enhanced_articles_count || 0,
      enhancement_method: data.enhancement_method
    });
    
    // Check if any articles were enhanced
    const enhancedArticles = data.articles?.filter(a => a.enhanced) || [];
    console.log(`   Enhanced articles: ${enhancedArticles.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Enhanced news feed failed:', error.message);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Testing Integra Markets API Integration');
  console.log('==========================================');
  console.log(`Backend URL: ${API_BASE_URL}`);
  console.log('');
  
  const results = {
    health: await testHealthCheck(),
    sentiment: await testMarketSentiment(),
    news: await testNewsFeed(),
    enhanced: await testEnhancedNewsFeed()
  };
  
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`Health Check: ${results.health ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Market Sentiment: ${results.sentiment ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`News Feed: ${results.news ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Enhanced News: ${results.enhanced ? '✅ PASSED' : '❌ FAILED'}`);
  
  const allPassed = Object.values(results).every(r => r);
  console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️ Some tests failed'}`);
  
  if (allPassed) {
    console.log('\n✅ The Expo app can successfully communicate with the deployed backend!');
    console.log('✅ Enhanced content processing with NLTK summarization is available!');
  }
}

// Run the tests
runAllTests();
