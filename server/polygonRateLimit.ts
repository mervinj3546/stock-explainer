/**
 * Smart Rate Limiting System for Polygon API
 * Handles the 2 API calls per minute limit with intelligent queuing
 * Works with existing storage caching system
 * Note: Queue information is tracked but not shown to users - they see processing state instead
 */

interface QueuedRequest {
  id: string;
  url: string;
  ticker: string;
  type: 'technical' | 'quote' | 'news';
  priority: number; // Lower number = higher priority
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  retryCount?: number;
}

interface RateLimitStats {
  callsThisMinute: number;
  lastResetTime: number;
  queueLength: number;
  totalProcessed: number;
  totalErrors: number;
  averageResponseTime: number;
}

class PolygonRateLimit {
  private queue: QueuedRequest[] = [];
  private callsThisMinute: number = 0;
  private lastResetTime: number = Date.now();
  private isProcessing: boolean = false;
  private readonly MAX_CALLS_PER_MINUTE = 5; // Polygon Basic tier allows 5 calls/minute
  private readonly MINUTE_MS = 60 * 1000;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds
  
  // Statistics tracking
  private totalProcessed: number = 0;
  private totalErrors: number = 0;
  private responseTimes: number[] = [];

  constructor() {
    // Start the queue processor
    this.startQueueProcessor();
    console.log('🚀 Polygon API Rate Limiter initialized (5 calls/minute - Polygon Basic tier)');
  }

  /**
   * Add a request to the queue with intelligent prioritization
   * Note: This works with the existing storage caching system
   */
  async makeRequest(url: string, ticker: string, type: 'technical' | 'quote' | 'news'): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = `${ticker}_${type}_${Date.now()}`;

      // Priority system: technical analysis = 1 (highest), quotes = 2, news = 3
      const priority = type === 'technical' ? 1 : type === 'quote' ? 2 : 3;
      
      const queuedRequest: QueuedRequest = {
        id: requestId,
        url,
        ticker: ticker.toUpperCase(),
        type,
        priority,
        timestamp: Date.now(),
        resolve,
        reject,
        retryCount: 0
      };

      // Insert request in queue based on priority
      this.insertByPriority(queuedRequest);
      
      console.log(`📝 Queued ${ticker} ${type} request (Priority: ${priority}, Queue: ${this.queue.length})`);
      
      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Insert request into queue maintaining priority order
   */
  private insertByPriority(request: QueuedRequest): void {
    // Remove any duplicate requests for the same ticker/type
    this.queue = this.queue.filter(
      item => !(item.ticker === request.ticker && item.type === request.type)
    );
    
    // Find insertion point based on priority
    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      if (this.queue[i].priority > request.priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.queue.splice(insertIndex, 0, request);
  }

  /**
   * Main queue processing loop
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 Starting queue processing (${this.queue.length} requests pending)`);

    while (this.queue.length > 0) {
      // Check if we need to reset the rate limit counter
      this.checkRateReset();
      
      // If we've hit the rate limit, wait for the next minute
      if (this.callsThisMinute >= this.MAX_CALLS_PER_MINUTE) {
        const waitTime = this.getWaitTime();
        console.log(`⏳ Rate limit reached. Waiting ${Math.round(waitTime / 1000)}s for next minute...`);
        await this.sleep(waitTime);
        continue;
      }

      // Process the next request
      const request = this.queue.shift();
      if (!request) continue;

      try {
        await this.executeRequest(request);
      } catch (error) {
        console.error(`❌ Failed to process request ${request.id}:`, error);
      }
    }

    this.isProcessing = false;
    console.log('✅ Queue processing completed');
  }

  /**
   * Execute a single API request with retry logic
   */
  private async executeRequest(request: QueuedRequest): Promise<void> {
    const startTime = Date.now();
    
    try {
      console.log(`🚀 Executing ${request.ticker} ${request.type} API call...`);
      
      // Make the actual API call
      const response = await fetch(request.url);
      const responseTime = Date.now() - startTime;
      
      // Track response time
      this.responseTimes.push(responseTime);
      if (this.responseTimes.length > 100) {
        this.responseTimes.shift(); // Keep last 100 response times
      }

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // Increment call counter and stats
      this.callsThisMinute++;
      this.totalProcessed++;
      
      console.log(`✅ ${request.ticker} ${request.type} completed (${responseTime}ms, ${this.callsThisMinute}/${this.MAX_CALLS_PER_MINUTE} calls this minute)`);
      
      // Resolve the promise
      request.resolve(data);
      
    } catch (error) {
      console.error(`❌ API call failed for ${request.ticker} ${request.type}:`, error);
      
      // Retry logic
      if (request.retryCount! < this.MAX_RETRIES) {
        request.retryCount = (request.retryCount || 0) + 1;
        
        console.log(`🔄 Retrying ${request.ticker} ${request.type} (attempt ${request.retryCount}/${this.MAX_RETRIES})`);
        
        // Add back to queue with delay
        setTimeout(() => {
          this.insertByPriority(request);
          if (!this.isProcessing) {
            this.processQueue();
          }
        }, this.RETRY_DELAY * request.retryCount);
        
        return;
      }
      
      // Max retries exceeded
      this.totalErrors++;
      request.reject(error instanceof Error ? error : new Error('API request failed'));
    }
  }

  /**
   * Check if we need to reset the rate limit counter
   */
  private checkRateReset(): void {
    const now = Date.now();
    if (now - this.lastResetTime >= this.MINUTE_MS) {
      console.log(`🔄 Rate limit reset (${this.callsThisMinute} calls in last minute)`);
      this.callsThisMinute = 0;
      this.lastResetTime = now;
    }
  }

  /**
   * Calculate how long to wait before the next API call is allowed
   */
  private getWaitTime(): number {
    const timeInCurrentMinute = Date.now() - this.lastResetTime;
    return this.MINUTE_MS - timeInCurrentMinute + 1000; // Add 1 second buffer
  }

  /**
   * Get queue position and estimated wait time for a specific request
   */
  getQueueInfo(ticker: string, type: 'technical' | 'quote' | 'news'): {
    position: number;
    estimatedWaitSeconds: number;
    isQueued: boolean;
  } {
    const position = this.queue.findIndex(
      req => req.ticker === ticker.toUpperCase() && req.type === type
    );

    if (position === -1) {
      return {
        position: 0,
        estimatedWaitSeconds: 0,
        isQueued: false
      };
    }

    // Calculate estimated wait time
    // Each API call takes ~2-3 seconds + we can do 2 per minute
    const callsAhead = position + 1;
    const timeToNextSlot = this.getTimeToNextAvailableSlot();
    const additionalWaitTime = Math.max(0, Math.ceil((callsAhead - 1) / 2)) * 60; // Additional minutes
    
    const estimatedWaitSeconds = Math.ceil(timeToNextSlot / 1000) + additionalWaitTime;

    return {
      position: position + 1, // 1-based position
      estimatedWaitSeconds,
      isQueued: true
    };
  }

  /**
   * Calculate time until next available API call slot
   */
  private getTimeToNextAvailableSlot(): number {
    if (this.callsThisMinute < this.MAX_CALLS_PER_MINUTE) {
      return 3000; // ~3 seconds for API call processing
    }
    
    // Need to wait for next minute window
    return this.getWaitTime();
  }
  getStats(): RateLimitStats {
    const avgResponseTime = this.responseTimes.length > 0 
      ? this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length 
      : 0;

    return {
      callsThisMinute: this.callsThisMinute,
      lastResetTime: this.lastResetTime,
      queueLength: this.queue.length,
      totalProcessed: this.totalProcessed,
      totalErrors: this.totalErrors,
      averageResponseTime: Math.round(avgResponseTime)
    };
  }

  /**
   * Get detailed debug information
   */
  debug(): any {
    return {
      stats: this.getStats(),
      queue: this.queue.map(req => ({
        id: req.id,
        ticker: req.ticker,
        type: req.type,
        priority: req.priority,
        age: Date.now() - req.timestamp,
        retryCount: req.retryCount || 0
      })),
      isProcessing: this.isProcessing,
      nextReset: this.lastResetTime + this.MINUTE_MS - Date.now()
    };
  }

  /**
   * Force process the queue (for testing)
   */
  async forceProcess(): Promise<void> {
    if (!this.isProcessing) {
      await this.processQueue();
    }
  }

  /**
   * Clear the queue (emergency use)
   */
  clearQueue(): number {
    const cleared = this.queue.length;
    this.queue.forEach(req => req.reject(new Error('Queue cleared')));
    this.queue = [];
    console.log(`🚨 Cleared ${cleared} queued requests`);
    return cleared;
  }

  /**
   * Simple sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start the queue processor that runs periodically
   */
  private startQueueProcessor(): void {
    // Process queue every 15 seconds to ensure requests don't get stuck
    setInterval(() => {
      if (this.queue.length > 0 && !this.isProcessing) {
        console.log(`⏰ Periodic queue check: ${this.queue.length} requests pending`);
        this.processQueue();
      }
    }, 15 * 1000);
  }
}

// Create singleton instance
export const polygonRateLimit = new PolygonRateLimit();

// Export helper function for easy usage
export async function makePolygonRequest(
  url: string, 
  ticker: string, 
  type: 'technical' | 'quote' | 'news' = 'technical'
): Promise<any> {
  return polygonRateLimit.makeRequest(url, ticker, type);
}

// Export stats and debug functions
export function getPolygonStats(): RateLimitStats {
  return polygonRateLimit.getStats();
}

export function debugPolygonQueue(): any {
  return polygonRateLimit.debug();
}

export function getQueueInfo(ticker: string, type: 'technical' | 'quote' | 'news' = 'technical') {
  return polygonRateLimit.getQueueInfo(ticker, type);
}
