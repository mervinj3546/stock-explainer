import { Request, Response } from 'express';
import { storage } from './storage';
import { makePolygonRequest } from './polygonRateLimit';

interface HistoricalPrice {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TechnicalIndicators {
  ema8: number[];
  ema21: number[];
  ema34: number[];
  ema50: number[];
  macd: number[];
  signal: number[];
  histogram: number[];
  rsi: number[];
  bollingerUpper: number[];
  bollingerMiddle: number[];
  bollingerLower: number[];
  atr: number[];
  obv: number[];
  donchianUpper: number[];
  donchianLower: number[];
  prices: HistoricalPrice[];
}

// Calculate Exponential Moving Average
function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  if (prices.length === 0) return ema;
  
  // First EMA value is just the first price
  ema[0] = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema[i] = (prices[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  
  return ema;
}

// Calculate MACD (Moving Average Convergence Divergence)
function calculateMACD(prices: number[]): { macd: number[], signal: number[], histogram: number[] } {
  const ema8 = calculateEMA(prices, 8);
  const ema21 = calculateEMA(prices, 21);
  
  const macd = ema8.map((value, index) => value - ema21[index]);
  const signal = calculateEMA(macd, 9);
  const histogram = macd.map((value, index) => value - signal[index]);
  
  return { macd, signal, histogram };
}

// Calculate RSI (Relative Strength Index)
function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  
  if (prices.length < period + 1) return rsi;
  
  for (let i = period; i < prices.length; i++) {
    let gains = 0;
    let losses = 0;
    
    for (let j = i - period + 1; j <= i; j++) {
      const change = prices[j] - prices[j - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - (100 / (1 + rs));
    }
  }
  
  return rsi;
}

// Calculate Simple Moving Average
function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma[i] = sum / period;
  }
  
  return sma;
}

// Calculate Standard Deviation
function calculateStandardDeviation(prices: number[], period: number, sma: number[]): number[] {
  const stdDev: number[] = [];
  
  for (let i = period - 1; i < prices.length; i++) {
    const slice = prices.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
    stdDev[i] = Math.sqrt(variance);
  }
  
  return stdDev;
}

// Calculate Bollinger Bands
function calculateBollingerBands(prices: number[], period: number = 20, multiplier: number = 2): {
  upper: number[];
  middle: number[];
  lower: number[];
} {
  const middle = calculateSMA(prices, period);
  const stdDev = calculateStandardDeviation(prices, period, middle);
  
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (middle[i] !== undefined && stdDev[i] !== undefined) {
      upper[i] = middle[i] + (stdDev[i] * multiplier);
      lower[i] = middle[i] - (stdDev[i] * multiplier);
    }
  }
  
  return { upper, middle, lower };
}

// Calculate True Range
function calculateTrueRange(high: number[], low: number[], close: number[]): number[] {
  const trueRange: number[] = [];
  
  trueRange[0] = high[0] - low[0]; // First value
  
  for (let i = 1; i < high.length; i++) {
    const tr1 = high[i] - low[i];
    const tr2 = Math.abs(high[i] - close[i - 1]);
    const tr3 = Math.abs(low[i] - close[i - 1]);
    trueRange[i] = Math.max(tr1, tr2, tr3);
  }
  
  return trueRange;
}

// Calculate Average True Range (ATR)
function calculateATR(high: number[], low: number[], close: number[], period: number = 14): number[] {
  const trueRange = calculateTrueRange(high, low, close);
  return calculateSMA(trueRange, period);
}

// Calculate On Balance Volume (OBV)
function calculateOBV(close: number[], volume: number[]): number[] {
  const obv: number[] = [];
  
  obv[0] = volume[0]; // First value
  
  for (let i = 1; i < close.length; i++) {
    if (close[i] > close[i - 1]) {
      obv[i] = obv[i - 1] + volume[i]; // Price up, add volume
    } else if (close[i] < close[i - 1]) {
      obv[i] = obv[i - 1] - volume[i]; // Price down, subtract volume
    } else {
      obv[i] = obv[i - 1]; // Price unchanged, keep same OBV
    }
  }
  
  return obv;
}

// Calculate Donchian Channels
function calculateDonchianChannels(high: number[], low: number[], period: number = 20): {
  upper: number[];
  lower: number[];
} {
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = period - 1; i < high.length; i++) {
    const highSlice = high.slice(i - period + 1, i + 1);
    const lowSlice = low.slice(i - period + 1, i + 1);
    
    upper[i] = Math.max(...highSlice);
    lower[i] = Math.min(...lowSlice);
  }
  
  return { upper, lower };
}

export async function getTechnicalIndicators(req: Request, res: Response) {
  const { ticker } = req.query;
  
  if (!ticker || typeof ticker !== 'string') {
    return res.status(400).json({ error: 'Missing ticker parameter' });
  }

  const normalizedTicker = ticker.trim().toUpperCase();
  const polygonToken = process.env.POLYGON_API_KEY;

  if (!polygonToken) {
    return res.status(500).json({ error: 'Polygon API key not configured' });
  }

  try {
    console.log(`Fetching technical indicators for ${normalizedTicker}...`);
    
    // Check cache first
    const cachedTechnical = await storage.getTickerData(normalizedTicker, 'technical');
    if (cachedTechnical && !await storage.isCacheExpired(normalizedTicker, 'technical')) {
      console.log(`Using cached technical data for ${normalizedTicker}`);
      return res.json(cachedTechnical.data);
    }
    
    console.log(`Fetching fresh technical data for ${normalizedTicker} from Polygon API...`);
    
    // Get 6 months of daily data for technical analysis
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const fromDate = sixMonthsAgo.toISOString().split('T')[0];
    const toDate = new Date().toISOString().split('T')[0];
    
    // Fetch historical data from Polygon using rate limiter
    const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/${normalizedTicker}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&limit=200&apikey=${polygonToken}`;
    
    // Use rate limiter for the API call
    const polygonData = await makePolygonRequest(polygonUrl, normalizedTicker, 'technical');
    
    if (polygonData.status !== "OK" && polygonData.status !== "DELAYED") {
      throw new Error(`No data available: ${polygonData.message || 'Unknown error'}`);
    }
    
    if (!polygonData.results || polygonData.results.length === 0) {
      throw new Error('No historical data found');
    }
    
    // Transform Polygon data to our format
    const historicalData: HistoricalPrice[] = polygonData.results.map((item: any) => ({
      date: new Date(item.t).toISOString().split('T')[0],
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
      volume: item.v
    }));
    
    // Extract data for calculations
    const closingPrices = historicalData.map(item => item.close);
    const highPrices = historicalData.map(item => item.high);
    const lowPrices = historicalData.map(item => item.low);
    const volumes = historicalData.map(item => item.volume);
    
    // Calculate technical indicators
    const ema8 = calculateEMA(closingPrices, 8);
    const ema21 = calculateEMA(closingPrices, 21);
    const ema34 = calculateEMA(closingPrices, 34);
    const ema50 = calculateEMA(closingPrices, 50);
    const macdData = calculateMACD(closingPrices);
    const rsi = calculateRSI(closingPrices, 14);
    
    // Calculate new technical indicators
    const bollingerData = calculateBollingerBands(closingPrices, 20, 2);
    const atr = calculateATR(highPrices, lowPrices, closingPrices, 14);
    const obv = calculateOBV(closingPrices, volumes);
    const donchianData = calculateDonchianChannels(highPrices, lowPrices, 20);
    
    const response: TechnicalIndicators = {
      ema8,
      ema21,
      ema34,
      ema50,
      macd: macdData.macd,
      signal: macdData.signal,
      histogram: macdData.histogram,
      rsi,
      bollingerUpper: bollingerData.upper,
      bollingerMiddle: bollingerData.middle,
      bollingerLower: bollingerData.lower,
      atr,
      obv,
      donchianUpper: donchianData.upper,
      donchianLower: donchianData.lower,
      prices: historicalData
    };
    
    // Cache the technical data for 12 hours
    await storage.saveTickerData(normalizedTicker, 'technical', response);
    console.log(`Technical data cached for ${normalizedTicker}`);
    
    console.log(`Technical indicators calculated for ${normalizedTicker}: ${historicalData.length} data points`);
    res.json(response);
    
  } catch (error) {
    console.error('Error fetching technical indicators:', error);
    res.status(500).json({ 
      error: 'Failed to fetch technical indicators',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
