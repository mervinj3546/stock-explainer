import { storage } from './storage';

// Popular stocks to pre-warm cache for
const POPULAR_STOCKS = [
  // Major Tech
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'TSLA', 'NVDA', 'NFLX',
  // Major Indices ETFs
  'SPY', 'QQQ', 'IWM', 'VTI', 'VOO',
  // Popular Growth
  'AMD', 'CRM', 'ADBE', 'PYPL', 'UBER', 'ZOOM', 'ROKU',
  // Popular Value/Dividend
  'BRK.B', 'JNJ', 'PG', 'KO', 'PFE', 'XOM', 'CVX',
  // Meme/Retail Favorites
  'GME', 'AMC', 'BB', 'NOK', 'PLTR', 'COIN'
];

// Cache warming functions
async function warmTechnicalCache(symbol: string): Promise<boolean> {
  try {
    console.log(`Warming technical cache for ${symbol}...`);
    
    // Check if cache is already fresh
    if (!await storage.isCacheExpired(symbol, 'technical')) {
      console.log(`${symbol} technical cache already fresh`);
      return true;
    }

    // Import and call technical analysis function
    const { getTechnicalIndicators } = await import('./technicalAnalysis');
    
    // Create mock request/response objects
    const mockReq = { query: { ticker: symbol } } as any;
    const mockRes = {
      json: (data: any) => {
        console.log(`✅ ${symbol} technical cache warmed (${Object.keys(data).length} indicators)`);
        return data;
      },
      status: (code: number) => ({
        json: (error: any) => {
          console.error(`❌ Failed to warm ${symbol} technical cache:`, error);
          return error;
        }
      })
    } as any;

    await getTechnicalIndicators(mockReq, mockRes);
    return true;
  } catch (error) {
    console.error(`Error warming technical cache for ${symbol}:`, error);
    return false;
  }
}

async function warmYtdCache(symbol: string): Promise<boolean> {
  try {
    console.log(`Warming YTD cache for ${symbol}...`);
    
    // Check if cache is already fresh
    if (!await storage.isCacheExpired(symbol, 'ytd')) {
      console.log(`${symbol} YTD cache already fresh`);
      return true;
    }

    // Import and call stock data function (which includes YTD)
    const { getBasicStockData } = await import('./stockData');
    
    // Create mock request/response objects
    const mockReq = { query: { ticker: symbol } } as any;
    const mockRes = {
      json: (data: any) => {
        console.log(`✅ ${symbol} YTD cache warmed (${data.ytd ? 'YTD data present' : 'No YTD data'})`);
        return data;
      },
      status: (code: number) => ({
        json: (error: any) => {
          console.error(`❌ Failed to warm ${symbol} YTD cache:`, error);
          return error;
        }
      })
    } as any;

    await getBasicStockData(mockReq, mockRes);
    return true;
  } catch (error) {
    console.error(`Error warming YTD cache for ${symbol}:`, error);
    return false;
  }
}

async function warmPriceCache(symbol: string): Promise<boolean> {
  try {
    console.log(`Warming price cache for ${symbol}...`);
    
    // Check if cache is already fresh
    if (!await storage.isCacheExpired(symbol, 'realtime-price')) {
      console.log(`${symbol} price cache already fresh`);
      return true;
    }

    const finnhubToken = process.env.FINNHUB_API_KEY;
    if (!finnhubToken) {
      console.error('Finnhub API key not configured for cache warming');
      return false;
    }

    const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${finnhubToken}`;
    const response = await fetch(quoteUrl);
    
    if (!response.ok) {
      console.error(`Failed to fetch price for ${symbol}: ${response.status}`);
      return false;
    }

    const data = await response.json();
    
    if (data && data.c !== 0) {
      await storage.saveTickerData(symbol, 'realtime-price', data);
      console.log(`✅ ${symbol} price cache warmed ($${data.c})`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error warming price cache for ${symbol}:`, error);
    return false;
  }
}

// Main cache warming function
export async function warmPopularStocksCache(): Promise<void> {
  console.log(`\n🔥 Starting cache warming for ${POPULAR_STOCKS.length} popular stocks...`);
  
  const startTime = Date.now();
  let successCount = 0;
  let totalOperations = 0;

  for (const symbol of POPULAR_STOCKS) {
    try {
      console.log(`\n📈 Processing ${symbol}...`);
      
      // Warm all cache types for this stock
      const results = await Promise.allSettled([
        warmPriceCache(symbol),
        warmTechnicalCache(symbol),
        warmYtdCache(symbol)
      ]);
      
      const successes = results.filter(r => r.status === 'fulfilled' && r.value === true).length;
      successCount += successes;
      totalOperations += 3;
      
      console.log(`${symbol} completed: ${successes}/3 caches warmed`);
      
      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`Failed to process ${symbol}:`, error);
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`\n🎉 Cache warming completed!`);
  console.log(`📊 Results: ${successCount}/${totalOperations} operations successful`);
  console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
  console.log(`🚀 Popular stocks now have fresh cache for immediate user access\n`);
}

// Background job scheduler
export function startCacheWarmingScheduler(): void {
  console.log('🕐 Starting cache warming scheduler...');
  
  // Initial warming on startup
  setTimeout(warmPopularStocksCache, 5000); // 5 seconds after startup
  
  // Schedule regular warming every 6 hours (half the 12h cache duration)
  setInterval(warmPopularStocksCache, 6 * 60 * 60 * 1000); // 6 hours
  
  // Also warm during market hours (more frequent price updates)
  const warmDuringMarketHours = () => {
    const now = new Date();
    const hour = now.getHours();
    const isWeekday = now.getDay() >= 1 && now.getDay() <= 5;
    const isMarketHours = hour >= 9 && hour <= 16; // 9 AM to 4 PM ET (approximate)
    
    if (isWeekday && isMarketHours) {
      console.log('📈 Market hours detected - warming price cache for popular stocks');
      // Only warm price cache during market hours (more frequent)
      POPULAR_STOCKS.forEach(symbol => {
        warmPriceCache(symbol);
      });
    }
  };
  
  // Price warming every 30 minutes during market hours
  setInterval(warmDuringMarketHours, 30 * 60 * 1000); // 30 minutes
}

// Manual warming function for specific stocks
export async function warmSpecificStocks(symbols: string[]): Promise<void> {
  console.log(`🎯 Manual cache warming for: ${symbols.join(', ')}`);
  
  for (const symbol of symbols) {
    await Promise.allSettled([
      warmPriceCache(symbol.toUpperCase()),
      warmTechnicalCache(symbol.toUpperCase()),
      warmYtdCache(symbol.toUpperCase())
    ]);
  }
  
  console.log(`✅ Manual warming completed for ${symbols.length} stocks`);
}
