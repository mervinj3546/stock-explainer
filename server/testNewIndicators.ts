/**
 * Test script for new technical indicators
 * Tests Bollinger Bands, ATR, OBV, and Donchian Channels
 */

import { getTechnicalIndicators } from './technicalAnalysis';

async function testNewIndicators() {
  console.log('🧪 Testing new technical indicators...\n');
  
  // Mock request and response objects for testing
  const mockReq = {
    query: { ticker: 'AAPL' }
  } as any;
  
  const mockRes = {
    json: (data: any) => {
      console.log('📊 Technical Indicators Response:');
      console.log('=====================================');
      
      // Test data availability
      const indicators = data;
      
      console.log(`📈 Data Points: ${indicators.prices?.length || 0}`);
      console.log(`\n🔵 Bollinger Bands:`);
      console.log(`  - Upper Band: ${indicators.bollingerUpper?.slice(-5) || 'N/A'}`);
      console.log(`  - Middle Band: ${indicators.bollingerMiddle?.slice(-5) || 'N/A'}`);
      console.log(`  - Lower Band: ${indicators.bollingerLower?.slice(-5) || 'N/A'}`);
      
      console.log(`\n📊 ATR (Average True Range):`);
      console.log(`  - Last 5 values: ${indicators.atr?.slice(-5) || 'N/A'}`);
      
      console.log(`\n📈 OBV (On Balance Volume):`);
      console.log(`  - Last 5 values: ${indicators.obv?.slice(-5) || 'N/A'}`);
      
      console.log(`\n🔺 Donchian Channels:`);
      console.log(`  - Upper Channel: ${indicators.donchianUpper?.slice(-5) || 'N/A'}`);
      console.log(`  - Lower Channel: ${indicators.donchianLower?.slice(-5) || 'N/A'}`);
      
      // Check data integrity
      console.log(`\n✅ Data Integrity Check:`);
      console.log(`  - Bollinger Bands: ${indicators.bollingerUpper?.length > 0 ? '✓' : '✗'}`);
      console.log(`  - ATR: ${indicators.atr?.length > 0 ? '✓' : '✗'}`);
      console.log(`  - OBV: ${indicators.obv?.length > 0 ? '✓' : '✗'}`);
      console.log(`  - Donchian: ${indicators.donchianUpper?.length > 0 ? '✓' : '✗'}`);
      
      return data;
    },
    status: (code: number) => mockRes,
  } as any;
  
  try {
    await getTechnicalIndicators(mockReq, mockRes);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testNewIndicators().catch(console.error);
}

export { testNewIndicators };
