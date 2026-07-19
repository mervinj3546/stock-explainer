// Professional sentiment cache with 6-hour refresh intervals
// Ensures we stay well within API limits while providing fast responses

import { ProfessionalSentimentResult } from './professionalSentiment';

interface CacheEntry {
  data: ProfessionalSentimentResult;
  timestamp: number;
  expiresAt: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  lastCleanup: number;
}

class ProfessionalSentimentCache {
  private cache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    lastCleanup: Date.now()
  };
  
  // Cache duration: 24 hours (86400000 ms) - prevents rate limiting across all users
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000;
  // Cleanup interval: 1 hour
  private readonly CLEANUP_INTERVAL = 60 * 60 * 1000;

  constructor() {
    // Auto-cleanup expired entries every hour
    setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
  }

  /**
   * Get cached sentiment data for a ticker
   */
  get(ticker: string): ProfessionalSentimentResult | null {
    this.stats.totalRequests++;
    
    const key = ticker.toUpperCase();
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    console.log(`📊 Cache HIT for ${ticker} (age: ${this.getAgeMinutes(entry.timestamp)} minutes)`);
    return entry.data;
  }

  /**
   * Store sentiment data in cache
   */
  set(ticker: string, data: ProfessionalSentimentResult): void {
    const key = ticker.toUpperCase();
    const now = Date.now();
    
    const entry: CacheEntry = {
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION
    };
    
    this.cache.set(key, entry);
    console.log(`💾 Cached sentiment for ${ticker} (expires in 6 hours)`);
  }

  /**
   * Check if data exists and is still fresh
   */
  has(ticker: string): boolean {
    const entry = this.cache.get(ticker.toUpperCase());
    return entry !== undefined && Date.now() <= entry.expiresAt;
  }

  /**
   * Force refresh a ticker (delete from cache)
   */
  invalidate(ticker: string): void {
    const key = ticker.toUpperCase();
    const deleted = this.cache.delete(key);
    if (deleted) {
      console.log(`🗑️ Invalidated cache for ${ticker}`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number; size: number; efficiency: string } {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
      efficiency: this.getEfficiencyReport()
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    });
    
    this.stats.lastCleanup = now;
    
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Get age of entry in minutes
   */
  private getAgeMinutes(timestamp: number): number {
    return Math.round((Date.now() - timestamp) / (1000 * 60));
  }

  /**
   * Get efficiency report
   */
  private getEfficiencyReport(): string {
    const { hits, totalRequests } = this.stats;
    if (totalRequests === 0) return "No requests yet";
    
    const hitRate = (hits / totalRequests) * 100;
    const apiCallsSaved = hits;
    const estimatedDailySavings = apiCallsSaved * (24 / 6); // Extrapolate to daily
    
    return `${hitRate.toFixed(1)}% hit rate, ~${estimatedDailySavings.toFixed(0)} API calls saved/day`;
  }

  /**
   * Get cache contents for debugging
   */
  debug(): Array<{ ticker: string; age: string; expiresIn: string }> {
    const now = Date.now();
    const results: Array<{ ticker: string; age: string; expiresIn: string }> = [];
    
    this.cache.forEach((entry, ticker) => {
      results.push({
        ticker,
        age: `${this.getAgeMinutes(entry.timestamp)} min`,
        expiresIn: `${Math.round((entry.expiresAt - now) / (1000 * 60))} min`
      });
    });
    
    return results;
  }

  /**
   * Preload cache with popular stocks
   */
  async preload(tickers: string[], fetchFunction: (ticker: string) => Promise<ProfessionalSentimentResult>): Promise<void> {
    console.log(`🚀 Preloading cache for ${tickers.length} popular stocks...`);
    
    const promises = tickers.map(async (ticker) => {
      try {
        if (!this.has(ticker)) {
          const data = await fetchFunction(ticker);
          this.set(ticker, data);
          // Add delay to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.error(`Failed to preload ${ticker}:`, error);
      }
    });
    
    await Promise.all(promises);
    console.log(`✅ Cache preload complete`);
  }
}

// Export singleton instance
export const professionalSentimentCache = new ProfessionalSentimentCache();

// Popular stocks to preload for better user experience
export const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 
  'SPY', 'QQQ', 'BRK.B', 'JNJ', 'V', 'WMT', 'PG', 'DIS', 'ADBE', 'CRM'
];

// Cache warming function for server startup
export async function warmCache(fetchFunction: (ticker: string) => Promise<ProfessionalSentimentResult>): Promise<void> {
  // Only warm cache with a subset to avoid hitting rate limits
  const priorityStocks = POPULAR_STOCKS.slice(0, 10);
  await professionalSentimentCache.preload(priorityStocks, fetchFunction);
}

// Utility function to log cache performance
export function logCacheStats(): void {
  const stats = professionalSentimentCache.getStats();
  console.log(`📈 Professional Sentiment Cache Stats:
    Total Requests: ${stats.totalRequests}
    Cache Hits: ${stats.hits} (${stats.hitRate}%)
    Cache Size: ${stats.size} entries
    Efficiency: ${stats.efficiency}
  `);
}
