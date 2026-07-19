# GEX (Gamma Exposure) Implementation Plan

## Overview
This document outlines a strategic approach to implementing Gamma Exposure (GEX) calculations in ExplainThis, based on analysis of the proven open-source implementation by [Matteo-Ferrara/gex-tracker](https://github.com/Matteo-Ferrara/gex-tracker) which uses CBOE's free delayed data API.

## What is GEX?
Gamma Exposure represents the dollar amount of gamma exposure market makers have at different strike prices. Based on the reference implementation, it's calculated as:

**For Calls (assuming dealers are long):**
```
Call GEX = Spot Price × Gamma × Open Interest × 100 × Spot Price × 0.01
```

**For Puts (assuming dealers are short):**
```
Put GEX = -(Spot Price × Gamma × Open Interest × 100 × Spot Price × 0.01)
```

**Key Insights:**
- **Positive GEX**: Market makers are long gamma → they sell when price rises, buy when price falls (stabilizing)
- **Negative GEX**: Market makers are short gamma → they buy when price rises, sell when price falls (amplifying)
- **GEX Levels**: Act as support/resistance levels where options flow concentrates

## 🎯 Data Fetching Strategy: CBOE Delayed Options Data

**Reality Check**: After analyzing the reference implementation, here's how CBOE data actually works:

### CBOE Data Structure & Size
```
Single Symbol Request: /api/global/delayed_quotes/options/SPY.json
├── Response Size: ~200KB - 2MB per symbol (not "large"!)
├── Contains: ~500-2000 options contracts per symbol
├── Update Frequency: Every 15 minutes (delayed data)
└── Coverage: All major symbols (SPY, QQQ, AAPL, etc.)
```

**Key Insight**: The data isn't "large" - it's just comprehensive per symbol!

### Actual CBOE API Structure
Based on analysis of working implementations, the CBOE endpoint returns:
```json
{
  "data": {
    "current_price": 450.25,
    "timestamp": "2025-07-27T18:30:00Z",
    "options": [
      {
        "option": "SPY250119C00450000",  // Format: TICKER + YYMMDD + C/P + STRIKE*1000
        "bid": 15.50,
        "ask": 16.00,
        "last": 15.75,
        "volume": 1234,
        "open_interest": 5678,
        "implied_volatility": 0.1845,
        "gamma": 0.0123,
        "delta": 0.6789,
        // ... other Greeks
      }
    ]
  }
}
```

### Smart Data Fetching Strategy
The "large data" challenge is solved by understanding CBOE's structure:

1. **Per-Symbol Requests**: Data is fetched per symbol, not all at once
2. **Manageable Size**: Each symbol returns 200KB-2MB (very reasonable)
3. **Smart Filtering**: We can filter client-side after fetch
4. **Caching**: 15-minute cache aligns with CBOE update frequency

### Data Volume Analysis
```typescript
// Example: SPY options data
const spyDataSize = {
  rawResponse: "~1.5MB",           // JSON response from CBOE
  optionsCount: "~1,200 contracts", // All strikes, all expirations
  afterFiltering: "~200 contracts", // ±15% from ATM, <45 days
  processedGEX: "~50KB",           // Final GEX calculations
  cacheStorage: "~10KB/symbol"     // Stored results
};

// For 10 symbols (SPY, QQQ, AAPL, MSFT, NVDA, TSLA, GOOGL, AMZN, META, SPX):
const totalDataUsage = {
  perUpdate: "~15MB raw → ~500KB processed",
  dailyBandwidth: "~200MB",  // Updates every 15 minutes
  storageGrowth: "~100KB/day/symbol" // Historical GEX levels
};
```

### Implementation Code Example
```typescript
// server/gex/cboeDataFetcher.ts
class CBOEDataFetcher {
  private baseUrl = 'https://cdn.cboe.com/api/global/delayed_quotes/options';
  
  async fetchOptionsData(symbol: string): Promise<CBOEOptionsResponse> {
    try {
      const url = `${this.baseUrl}/${symbol}.json`;
      console.log(`📥 Fetching options data for ${symbol}...`);
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ExplainThis-GEX/1.0'
        },
        timeout: 30000
      });

      if (!response.ok) {
        throw new Error(`CBOE API error: ${response.status}`);
      }

      const data = await response.json();
      console.log(`✅ Fetched ${data.data.options.length} contracts for ${symbol}`);
      
      return data;
    } catch (error) {
      console.error(`❌ Failed to fetch options data for ${symbol}:`, error);
      throw error;
    }
  }
  
  // Smart filtering to reduce data volume
  filterRelevantOptions(options: CBOEOption[], spotPrice: number): CBOEOption[] {
    const maxDTE = 45; // Days to expiration
    const priceRange = { min: spotPrice * 0.85, max: spotPrice * 1.15 };
    
    return options.filter(option => {
      const { strike, daysToExpiry } = this.parseOptionSymbol(option.option);
      
      return (
        daysToExpiry <= maxDTE &&
        strike >= priceRange.min &&
        strike <= priceRange.max &&
        option.open_interest > 10 // Minimum liquidity filter
      );
    });
  }
}
```

### Reference Implementation Insights:
1. **Zero Cost**: Uses CBOE's free delayed data (15-20 minute delay)
2. **Simple Architecture**: Just pandas + requests + matplotlib 
3. **Smart Parsing**: Extracts strike, expiration, and type from option symbol
4. **Proven Formula**: `spot * gamma * OI * 100 * spot * 0.01` with puts negated
5. **Data Filtering**: Limits to ±15% from ATM and 1 year expiration
6. **Minimal Dependencies**: Only needs pandas, requests, matplotlib

## Revised Implementation Strategy

### Phase 1: MVP Implementation (1-2 weeks) 🚀
**Goal**: Build working GEX tracker using CBOE delayed API with smart data management

#### Data Management Approach:
- ✅ **Per-Symbol Fetching**: Request only symbols we need (start with SPY, QQQ)
- ✅ **Smart Filtering**: Filter to ±15% strikes, <45 DTE after fetching
- ✅ **Efficient Caching**: 15-minute cache aligned with CBOE updates
- ✅ **Progressive Loading**: Fetch symbols on-demand, not all at once

#### Bandwidth & Storage Planning:
```typescript
// Example usage patterns
const dataUsage = {
  initialLoad: {
    spy: "1.2MB",      // ~1,000 options contracts
    qqq: "0.8MB",      // ~600 contracts  
    aapl: "1.5MB",     // ~1,200 contracts
    total: "3.5MB"     // For 3 symbols
  },
  
  afterFiltering: {
    spy: "120KB",      // ~150 relevant contracts
    qqq: "80KB",       // ~100 relevant contracts
    aapl: "150KB",     // ~180 relevant contracts
    total: "350KB"     // 90% reduction!
  },
  
  updateFrequency: "15 minutes", // Matches CBOE delay
  dailyBandwidth: "~50MB",       // Very reasonable
  monthlyStorage: "~500MB"       // Including historical data
};
```

#### MVP Scope - Smart Data Pipeline:
```typescript
// server/gex/gexPipeline.ts
class GEXPipeline {
  private fetcher = new CBOEDataFetcher();
  private calculator = new GEXCalculator();
  private cache = new Map<string, CachedGEXData>();

  async processSymbol(symbol: string): Promise<GEXResult> {
    // Step 1: Check cache (15-minute TTL)
    const cached = this.getCachedData(symbol);
    if (cached && !this.isExpired(cached)) {
      return cached.gexData;
    }

    // Step 2: Fetch raw options data (~1-2MB)
    console.log(`📥 Fetching options data for ${symbol}...`);
    const rawData = await this.fetcher.fetchOptionsData(symbol);
    
    // Step 3: Smart filtering (reduces to ~100-200KB)
    const filteredOptions = this.fetcher.filterRelevantOptions(
      rawData.data.options, 
      rawData.data.current_price
    );
    console.log(`📊 Filtered ${rawData.data.options.length} → ${filteredOptions.length} contracts`);

    // Step 4: Calculate GEX using proven formula
    const gexData = this.calculator.calculateGEX(
      rawData.data.current_price,
      filteredOptions
    );

    // Step 5: Cache processed result (~10KB)
    this.cacheData(symbol, gexData);
    
    return gexData;
  }
}

// Proven GEX calculation from reference implementation
function calculateGEX(spotPrice: number, options: CBOEOption[]): GEXData {
  const strikes = new Map<number, { callGEX: number; putGEX: number }>();
  
  options.forEach(option => {
    const { strike, type } = parseOptionSymbol(option.option);
    const gex = spotPrice * option.gamma * option.open_interest * 100 * spotPrice * 0.01;
    
    if (!strikes.has(strike)) {
      strikes.set(strike, { callGEX: 0, putGEX: 0 });
    }
    
    const strikeData = strikes.get(strike)!;
    if (type === 'C') {
      strikeData.callGEX += gex;
    } else {
      strikeData.putGEX += gex; // Note: Reference negates puts in final calculation
    }
  });
  
  return {
    totalGEX: Array.from(strikes.values()).reduce((sum, s) => sum + s.callGEX - s.putGEX, 0),
    byStrike: Array.from(strikes.entries()).map(([strike, data]) => ({
      strike,
      callGEX: data.callGEX,
      putGEX: data.putGEX,
      netGEX: data.callGEX - data.putGEX
    }))
  };
}
```

### Phase 2: Production Integration (1-2 weeks)
**Goal**: Integrate GEX into ExplainThis with proper caching and UI

#### Backend Implementation:
```typescript
// server/gex/gexService.ts
class GEXService {
  private cache = new Map<string, { data: GEXData; timestamp: number }>();
  
  async getGEXData(symbol: string): Promise<GEXData> {
    // Check cache (15-minute TTL for delayed data)
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
      return cached.data;
    }
    
    // Fetch from CBOE
    const url = `https://cdn.cboe.com/api/global/delayed_quotes/options/${symbol}.json`;
    const response = await fetch(url);
    const data = await response.json();
    
    // Calculate GEX using proven formula
    const gexData = this.calculateGEX(data.data.current_price, data.data.options);
    
    // Cache result
    this.cache.set(symbol, { data: gexData, timestamp: Date.now() });
    return gexData;
  }
}
```

#### Frontend Components:
```typescript
// client/src/components/gex/GEXChart.tsx
function GEXChart({ symbol }: { symbol: string }) {
  const { data: gexData } = useQuery({
    queryKey: ['gex', symbol],
    queryFn: () => fetch(`/api/gex/${symbol}`).then(r => r.json()),
    refetchInterval: 15 * 60 * 1000, // 15 minutes
  });
  
  // Bar chart showing GEX by strike (like reference implementation)
  return <ResponsiveBar data={gexData.byStrike} ... />;
}
```

### Phase 3: Advanced Features (2-3 weeks)
**Goal**: Add sophisticated analysis beyond the reference implementation

#### Enhanced Features:
1. **Multiple Symbols**: SPX, SPY, QQQ, AAPL, MSFT, NVDA, TSLA
2. **GEX Flip Detection**: Alert when total GEX crosses zero
3. **Historical Tracking**: Store daily GEX snapshots
4. **Comparative Analysis**: Compare GEX across symbols
5. **Smart Alerts**: Notify on significant GEX changes

#### API Endpoints:
```typescript
// GET /api/gex/:symbol
// GET /api/gex/:symbol/levels      // Support/resistance levels
// GET /api/gex/:symbol/history     // Historical GEX data
// GET /api/gex/compare/:symbols    // Multi-symbol comparison
```

## Technical Architecture (Revised)

### Backend Structure:
```
📁 server/gex/
├── 📄 cboeClient.ts         # CBOE API client (HTTP requests)
├── 📄 gexCalculator.ts      # GEX calculation logic (from reference)
├── 📄 gexService.ts         # Main service with caching
├── 📄 optionParser.ts       # Parse option symbols
└── 📄 gexRoutes.ts          # Express routes

📁 server/jobs/
└── 📄 gexUpdater.ts         # Background updates every 15 minutes
```

### Data Flow:
```
CBOE Free API → Parse Options → Calculate GEX → Cache → Frontend
     ↓              ↓              ↓           ↓         ↓
   HTTP GET     Symbol Regex    Proven      15min    React
  (No Auth)     Extraction      Formula     Cache    Charts
```

## Cost-Benefit Analysis (Revised)

### Development Investment:
- **Time**: 4-7 weeks (1-1.5 months) - Much faster with proven approach!
- **Data Costs**: $0/month - CBOE delayed API is FREE! 🎉
- **Infrastructure**: $20-50/month for basic caching/storage

### Massive Advantages:
- ✅ **Zero Data Costs**: Eliminates our biggest concern
- ✅ **Proven Implementation**: Reference code validates our approach
- ✅ **Fast Development**: Can directly adapt working formulas
- ✅ **All Major Symbols**: SPX, SPY, QQQ all available
- ✅ **Real GEX Data**: Same source as other GEX tools

## Risk Mitigation

### Technical Risks:
1. **Data Quality**: Use multiple sources, implement data validation
2. **Performance**: Aggressive caching, smart filtering
3. **Costs**: Start with limited symbols, scale gradually

### Market Risks:
1. **Regulatory Changes**: Monitor CBOE data licensing changes
2. **Competition**: Focus on unique presentation and insights
3. **User Adoption**: Start with SPY/QQQ that most traders watch

## Success Metrics

### Phase 1 Success:
- [ ] Accurate GEX calculation for SPY matches TradingView
- [ ] Data pipeline processes 1,000 contracts in <30 seconds
- [ ] Frontend displays clean GEX chart

### Phase 2 Success:
- [ ] Support 5 symbols with 30-minute updates
- [ ] Data costs under $300/month
- [ ] 95% uptime for GEX calculations

### Phase 3 Success:
- [ ] 20+ symbols supported
- [ ] Real-time updates working
- [ ] User engagement metrics show GEX as top feature

### Production Success:
- [ ] 50+ symbols with 15-minute updates
- [ ] Sub-second API response times
- [ ] Positive user feedback on GEX accuracy

## Next Steps

1. **Research Phase**: Evaluate data providers and set up test accounts
2. **MVP Development**: Build basic GEX calculation for SPY
3. **Validation**: Compare results with TradingView and other sources
4. **Iteration**: Expand symbols and features based on accuracy

---

*This plan assumes a methodical approach to building production-quality GEX functionality while managing costs and complexity. The key is starting small with high-quality data for a few symbols rather than trying to process all options data at once.*
