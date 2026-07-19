/**
 * Test script for Polygon API Rate Limiter
 * Tests the queue system with multiple simultaneous requests
 */

import { makePolygonRequest, getPolygonStats, debugPolygonQueue } from './polygonRateLimit';

async function testRateLimiter() {
  console.log('🧪 Testing Polygon API Rate Limiter...\n');
  
  // Test with multiple requests for different tickers
  const testTickers = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META'];
  const polygonToken = process.env.POLYGON_API_KEY;
  
  if (!polygonToken) {
    console.error('❌ POLYGON_API_KEY not found in environment variables');
    return;
  }
  
  console.log(`📊 Initial stats:`, getPolygonStats());
  console.log();
  
  // Create URLs for testing (using yesterday's date)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  const requests = testTickers.map(ticker => {
    const url = `https://api.polygon.io/v2/aggs/ticker/${ticker}/range/1/day/${dateStr}/${dateStr}?adjusted=true&sort=asc&limit=1&apikey=${polygonToken}`;
    return makePolygonRequest(url, ticker, 'technical');
  });
  
  console.log(`🚀 Submitting ${requests.length} requests simultaneously...`);
  
  // Submit all requests at once to test queuing
  const startTime = Date.now();
  
  try {
    const results = await Promise.allSettled(requests);
    const endTime = Date.now();
    
    console.log(`\n✅ All requests completed in ${endTime - startTime}ms`);
    console.log(`📊 Final stats:`, getPolygonStats());
    
    // Show results summary
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    console.log(`\n📈 Results:`);
    console.log(`  ✅ Successful: ${successful}`);
    console.log(`  ❌ Failed: ${failed}`);
    
    // Show debug info
    console.log(`\n🔍 Debug info:`, debugPolygonQueue());
    
    // Show sample data from first successful request
    const firstSuccess = results.find(r => r.status === 'fulfilled');
    if (firstSuccess && firstSuccess.status === 'fulfilled') {
      console.log(`\n📋 Sample response:`, {
        status: firstSuccess.value.status,
        resultsCount: firstSuccess.value.resultsCount,
        adjusted: firstSuccess.value.adjusted
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testRateLimiter().catch(console.error);
}

export { testRateLimiter };
