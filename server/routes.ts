import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { loginSchema, insertUserSchema } from "@shared/schema";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "./auth";
import { getBasicStockData, getYTDData, getFastStockData } from "./stockData";
import { getTechnicalIndicators } from "./technicalAnalysis";
import { generateMockRedditSentiment, aggregateSentiment, generateNoDataSentiment, analyzeSentimentAdvanced } from './sentimentAnalysis';
import { analyzeProfessionalSentiment, generateDemoSentiment, type ProfessionalSentimentResult } from './professionalSentiment';
import { professionalSentimentCache, logCacheStats } from './sentimentCache';
import { analyzeSubredditSentiments, type EnhancedSentimentData } from "./subredditSentiment";
import { getAIAnalysis } from './aiAnalysis';
import { getPolygonStats, debugPolygonQueue, getQueueInfo } from './polygonRateLimit';

const MemoryStoreSession = MemoryStore(session);

// Helper function to get cached price data
async function getCachedPriceData(symbol: string) {
  try {
    // Check cache first
    const cached = await storage.getTickerData(symbol.toUpperCase(), 'realtime-price');
    if (cached && !await storage.isCacheExpired(symbol.toUpperCase(), 'realtime-price')) {
      return cached.data;
    }

    // Fetch fresh data if cache is expired
    const finnhubToken = process.env.FINNHUB_API_KEY;
    if (!finnhubToken) {
      return null;
    }

    const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${finnhubToken}`;
    const quoteRes = await fetch(quoteUrl);
    
    if (quoteRes.ok && quoteRes.status !== 429) {
      const quoteData = await quoteRes.json();
      
      if (quoteData && quoteData.c !== 0) {
        // Cache the fresh data
        await storage.saveTickerData(symbol.toUpperCase(), 'realtime-price', quoteData);
        return quoteData;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching cached price data for ${symbol}:`, error);
    return null;
  }
}

// Extend session interface to include userId
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

// Track tickers being processed to prevent duplicate counting during concurrent requests
const processingTickers = new Map<string, boolean>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
    store: new MemoryStoreSession({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  }));

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Authentication middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);
      const user = await storage.validateUser(email, password);
      
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = user.id;
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }

      const user = await storage.createUser(userData);
      req.session.userId = user.id;
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(400).json({ message: "Invalid request data" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/me", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User management routes
  app.get("/api/user/usage", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const usage = await storage.getUserTickerUsage(userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const usageCount = usage.length;
      const freeTickers = ['NVDA', 'TSLA', 'AAPL']; // Always free tickers
      
      // Admin users have unlimited access
      if (user.tier === 'admin') {
        res.json({
          usage,
          usageCount,
          remainingLimit: -1, // -1 indicates unlimited
          tier: user.tier,
          resetDate: user.usageResetDate,
          freeTickers,
          isLimitReached: false,
          tickerList: usage.map(u => u.tickerSymbol),
          tickersUsed: usageCount,
          tickerLimit: -1 // Unlimited for admin
        });
        return;
      }

      const remainingLimit = 10 - usageCount; // FREE_TICKER_LIMIT for regular users

      res.json({
        usage,
        usageCount,
        remainingLimit,
        tier: user.tier,
        resetDate: user.usageResetDate,
        freeTickers,
        isLimitReached: remainingLimit <= 0,
        tickerList: usage.map(u => u.tickerSymbol), // Add ticker list for the component
        // Add fields expected by the component
        tickersUsed: usageCount,
        tickerLimit: 10
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user usage" });
    }
  });

  // Admin endpoint to reset user data
  app.post("/api/admin/reset-user", async (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      // Get user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Reset ticker usage
      await storage.resetUserUsage(user.id);

      res.json({ message: `Reset usage data for ${email}` });
    } catch (error) {
      console.error("Reset user error:", error);
      res.status(500).json({ message: "Failed to reset user data" });
    }
  });

  app.post("/api/user/upgrade", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const updatedUser = await storage.upgradeUserToPremium(userId);
      
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ 
        user: userWithoutPassword,
        message: "Successfully upgraded to premium"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to upgrade user" });
    }
  });

  app.post("/api/user/reset-usage", requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      
      if (!user || user.tier !== 'premium') {
        return res.status(403).json({ message: "Premium account required" });
      }
      
      const updatedUser = await storage.resetDailyUsage(userId);
      
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json({ 
        user: userWithoutPassword,
        message: "Usage reset successfully"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset usage" });
    }
  });

  // OAuth routes
  // Google OAuth
  app.get("/api/auth/google", 
    passport.authenticate("google", { scope: ["profile", "email"] })
  );

  app.get("/api/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req: any, res) => {
      req.session.userId = req.user.id;
      res.redirect("/dashboard");
    }
  );

  // Ticker routes
  app.get("/api/tickers/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 1) {
        return res.json([]);
      }
      
      const tickers = await storage.searchTickers(query);
      res.json(tickers);
    } catch (error) {
      res.status(500).json({ message: "Failed to search tickers" });
    }
  });

  app.get("/api/tickers/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      
      // Try to get cached real-time stock data
      const quoteData = await getCachedPriceData(symbol);
      
      if (quoteData) {
        const priceChange = quoteData.c - quoteData.pc;
        const priceChangePercent = (priceChange / quoteData.pc) * 100;
        
        const realTimeData = {
          id: symbol,
          symbol: symbol,
          name: `${symbol} Inc.`, // Fallback name - could be enhanced with company name API
          price: quoteData.c, // Current price
          change: priceChange,
          changePercent: priceChangePercent,
          volume: 0, // Would need additional API call for volume
          marketCap: 0, // Would need additional API call for market cap
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        return res.json(realTimeData);
      }
      
      // Fallback to stored ticker data if API call fails
      const ticker = await storage.getTicker(symbol);
      
      if (!ticker) {
        return res.status(404).json({ message: "Ticker not found" });
      }
      
      res.json(ticker);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ticker" });
    }
  });

  // Stock market data routes (using external APIs)
  app.get("/api/stock/basic", getBasicStockData);
  app.get("/api/stock/fast", getFastStockData);
  app.get("/api/stock/technical", getTechnicalIndicators);
  app.get("/api/stock/ytd", getYTDData);

  // Watchlist routes
  app.get("/api/watchlist", requireAuth, async (req: any, res) => {
    try {
      const watchlist = await storage.getUserWatchlist(req.session.userId);
      const tickersWithData = await Promise.all(
        watchlist.map(async (item) => {
          // Get cached real-time data
          const quoteData = await getCachedPriceData(item.tickerSymbol);
          
          if (quoteData) {
            const priceChange = quoteData.c - quoteData.pc;
            const priceChangePercent = (priceChange / quoteData.pc) * 100;
            
            const realTimeData = {
              symbol: item.tickerSymbol,
              name: `${item.tickerSymbol} Inc.`, // Simplified name
              price: quoteData.c,
              change: priceChange,
              changePercent: priceChangePercent,
              volume: 0, // Not used in sidebar
              marketCap: 0 // Not used in sidebar
            };
            
            return { ...item, ticker: realTimeData };
          }
          
          // Fallback to stored data if cached fetch fails
          const ticker = await storage.getTicker(item.tickerSymbol);
          return { ...item, ticker };
        })
      );
      res.json(tickersWithData);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch watchlist" });
    }
  });

  app.post("/api/watchlist/:symbol", requireAuth, async (req: any, res) => {
    try {
      const { symbol } = req.params;
      const item = await storage.addToWatchlist(req.session.userId, symbol);
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to add to watchlist" });
    }
  });

  app.delete("/api/watchlist/:symbol", requireAuth, async (req: any, res) => {
    try {
      const { symbol } = req.params;
      const removed = await storage.removeFromWatchlist(req.session.userId, symbol);
      
      if (!removed) {
        return res.status(404).json({ message: "Item not found in watchlist" });
      }
      
      res.json({ message: "Removed from watchlist" });
    } catch (error) {
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });

  // Search history routes
  app.get("/api/search-history", requireAuth, async (req: any, res) => {
    try {
      const history = await storage.getUserSearchHistory(req.session.userId);
      const historyWithTickers = await Promise.all(
        history.map(async (item) => {
          // Get cached real-time data
          const quoteData = await getCachedPriceData(item.tickerSymbol);
          
          if (quoteData) {
            const priceChange = quoteData.c - quoteData.pc;
            const priceChangePercent = (priceChange / quoteData.pc) * 100;
            
            const realTimeData = {
              symbol: item.tickerSymbol,
              name: `${item.tickerSymbol} Inc.`, // Simplified name
              price: quoteData.c,
              change: priceChange,
              changePercent: priceChangePercent,
              volume: 0, // Not used in sidebar
              marketCap: 0 // Not used in sidebar
            };
            
            return { ...item, ticker: realTimeData };
          }
          
          // Fallback to stored data if cached fetch fails
          const ticker = await storage.getTicker(item.tickerSymbol);
          return { ...item, ticker };
        })
      );
      res.json(historyWithTickers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch search history" });
    }
  });

  app.post("/api/search-history/:symbol", requireAuth, async (req: any, res) => {
    try {
      const { symbol } = req.params;
      const item = await storage.addToSearchHistory(req.session.userId, symbol);
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to add to search history" });
    }
  });

  // Ticker data routes (for financial information)
  app.get("/api/ticker-data/:symbol/:type", async (req: any, res) => {
    try {
      const { symbol, type } = req.params;
      const { refresh } = req.query;
      
      // Check if user is authenticated
      const isAuthenticated = !!req.session.userId;
      const userId = req.session.userId;
      
      // For anonymous users, only allow free tickers (NVDA, TSLA, AAPL)
      const FREE_TICKERS = ['NVDA', 'TSLA', 'AAPL'];
      
      if (!isAuthenticated && !FREE_TICKERS.includes(symbol.toUpperCase())) {
        return res.status(401).json({ 
          message: "Authentication required", 
          requiresAuth: true,
          freeTickers: FREE_TICKERS
        });
      }
      
      // For anonymous users accessing free tickers, restrict certain data types
      if (!isAuthenticated && FREE_TICKERS.includes(symbol.toUpperCase())) {
        const RESTRICTED_TYPES = ['sentiment', 'ai'];
        if (RESTRICTED_TYPES.includes(type)) {
          return res.status(401).json({
            message: "Sign up required for sentiment and AI analysis",
            requiresAuth: true,
            dataType: type
          });
        }
      }
      
      // For authenticated users, check and track ticker usage limits
      if (isAuthenticated) {
        // First check if user can access this ticker
        const accessCheck = await storage.canUserAccessTicker(userId, symbol);
        
        if (!accessCheck.allowed) {
          return res.status(403).json({
            message: "Ticker limit reached",
            requiresUpgrade: true,
            remainingLimit: accessCheck.remainingLimit
          });
        }
        
        // Only track usage for the first data type request for this ticker
        // Use a combination of userId and ticker symbol to create a unique key
        const userTickerKey = `${userId}-${symbol.toUpperCase()}`;
        
        // Check if this ticker is already being processed or has been tracked
        const existingUsage = await storage.getUserTickerUsage(userId);
        const hasAccessedTicker = existingUsage.some(usage => usage.tickerSymbol === symbol.toUpperCase());
        
        if (!hasAccessedTicker && !processingTickers.has(userTickerKey)) {
          // Mark this ticker as being processed to prevent concurrent additions
          processingTickers.set(userTickerKey, true);
          
          try {
            // This is the first request for this ticker, track the usage
            const usageResult = await storage.addTickerUsage(userId, symbol);
            console.log(`New ticker usage tracked for ${symbol}: allowed=${usageResult.allowed}, remaining=${usageResult.remainingLimit}`);
          } finally {
            // Remove from processing map after a short delay to allow other requests to see it's been added
            setTimeout(() => {
              processingTickers.delete(userTickerKey);
            }, 1000);
          }
        } else {
          console.log(`Ticker ${symbol} already tracked or being processed for user, skipping usage increment`);
        }
      }
      
      // Check if we should use cached data or fetch fresh data
      let shouldFetchFresh = refresh === 'true';
      
      if (!shouldFetchFresh) {
        // Check if cache is expired
        const isExpired = await storage.isCacheExpired(symbol, type);
        shouldFetchFresh = isExpired;
        console.log(`Cache expired for ${symbol}/${type}: ${isExpired}`);
      }
      
      // Get existing cached data (shared across all users for fundamentals)
      let data = await storage.getTickerData(symbol, type);
      console.log(`Cached data exists for ${symbol}/${type}: ${!!data}${data && data.createdAt ? ` (cached ${Math.round((Date.now() - data.createdAt.getTime()) / (1000 * 60))} minutes ago)` : ''}`);
      
      // If we need fresh data or no data exists, fetch from APIs
      if (shouldFetchFresh || !data) {
        console.log(`Fetching fresh data for ${symbol}/${type} (expired: ${shouldFetchFresh}, missing: ${!data})`);
        let apiData;
        const finnhubToken = process.env.FINNHUB_API_KEY;
        
        console.log(`🚀 ENTERING SWITCH CASE for ${symbol}/${type}`);
        switch (type) {
          case 'fundamentals':
            if (finnhubToken) {
              try {
                console.log(`Fetching fresh fundamentals data for ${symbol} from Finnhub...`);
                
                // Fetch company basic financials from Finnhub
                const metricsUrl = `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${finnhubToken}`;
                const metricsRes = await fetch(metricsUrl);
                
                if (metricsRes.ok) {
                  const metricsData = await metricsRes.json();
                  const metrics = metricsData.metric;
                  
                  console.log(`Finnhub metrics response for ${symbol}:`, metrics);
                  
                  if (metrics) {
                    console.log('Debug AAPL metrics extract:', {
                      revenuePerShareTTM: metrics.revenuePerShareTTM,
                      currentRatioQuarterly: metrics.currentRatioQuarterly,
                      totalDebtToEquityQuarterly: metrics['totalDebt/totalEquityQuarterly'],
                      bookValueShareGrowth5Y: metrics.bookValueShareGrowth5Y
                    });
                    
                    apiData = {
                      keyMetrics: {
                        peRatio: metrics.peBasicExclExtraTTM || metrics.peTTM || 0,
                        forwardPE: metrics.forwardPE || 0,
                        pegRatio: metrics.pegTTM || 0,
                        marketCap: metrics.marketCapitalization ? `${(metrics.marketCapitalization / 1000).toFixed(1)}B` : "N/A",
                        enterpriseValue: metrics.enterpriseValue ? `${(metrics.enterpriseValue / 1000).toFixed(1)}B` : "N/A",
                        revenue: metrics.revenuePerShareTTM ? `${(metrics.revenuePerShareTTM * 15.2).toFixed(1)}B` : "N/A", // Approximate shares outstanding
                        bookValuePerShare: metrics.bookValuePerShareQuarterly || metrics.bookValuePerShareAnnual || 0,
                        cashPerShare: metrics.cashPerSharePerShareQuarterly || metrics.cashPerSharePerShareAnnual || 0,
                        beta: metrics.beta || 0
                      },
                      profitability: {
                        grossMargin: metrics.grossMarginTTM || metrics.grossMarginAnnual || 0,
                        operatingMargin: metrics.operatingMarginTTM || metrics.operatingMarginAnnual || 0,
                        netMargin: metrics.netProfitMarginTTM || metrics.netProfitMarginAnnual || 0,
                        roe: metrics.roeTTM || metrics.roeRfy || 0,
                        roa: metrics.roaTTM || metrics.roaRfy || 0,
                        roi: metrics.roiTTM || metrics.roiAnnual || 0
                      },
                      financialHealth: {
                        debtToEquity: metrics['totalDebt/totalEquityQuarterly'] || metrics['totalDebt/totalEquityAnnual'] || 0,
                        longTermDebtToEquity: metrics['longTermDebt/equityQuarterly'] || metrics['longTermDebt/equityAnnual'] || 0,
                        currentRatio: metrics.currentRatioQuarterly || metrics.currentRatioAnnual || 0,
                        quickRatio: metrics.quickRatioQuarterly || metrics.quickRatioAnnual || 0,
                        interestCoverage: metrics.netInterestCoverageTTM || metrics.netInterestCoverageAnnual || 0,
                        assetTurnover: metrics.assetTurnoverTTM || metrics.assetTurnoverAnnual || 0
                      },
                      growth: {
                        revenueGrowth: {
                          ttm: metrics.revenueGrowthTTMYoy || 0,
                          quarterly: metrics.revenueGrowthQuarterlyYoy || 0,
                          threeYear: metrics.revenueGrowth3Y || 0,
                          fiveYear: metrics.revenueGrowth5Y || 0
                        },
                        epsGrowth: {
                          ttm: metrics.epsGrowthTTMYoy || 0,
                          quarterly: metrics.epsGrowthQuarterlyYoy || 0,
                          threeYear: metrics.epsGrowth3Y || 0,
                          fiveYear: metrics.epsGrowth5Y || 0
                        },
                        bookValueGrowth: metrics.bookValueShareGrowth5Y || 0,
                        ebitdaGrowth: metrics.ebitdaCagr5Y || 0
                      },
                      valuation: {
                        priceToBook: metrics.pbQuarterly || metrics.pbAnnual || 0,
                        priceToSales: metrics.psTTM || metrics.psAnnual || 0,
                        priceToEarnings: metrics.peTTM || metrics.peAnnual || 0,
                        priceToFreeCashFlow: metrics.pfcfShareTTM || metrics.pfcfShareAnnual || 0,
                        evToEbitda: metrics['currentEv/freeCashFlowTTM'] || metrics['currentEv/freeCashFlowAnnual'] || 0
                      },
                      dividend: {
                        dividendYield: metrics.currentDividendYieldTTM || metrics.dividendYieldIndicatedAnnual || 0,
                        dividendPerShare: metrics.dividendPerShareTTM || metrics.dividendPerShareAnnual || 0,
                        payoutRatio: metrics.payoutRatioTTM || metrics.payoutRatioAnnual || 0,
                        dividendGrowth5Y: metrics.dividendGrowthRate5Y || 0
                      },
                      performance: {
                        weekHigh52: metrics['52WeekHigh'] || 0,
                        weekLow52: metrics['52WeekLow'] || 0,
                        weekReturn52: metrics['52WeekPriceReturnDaily'] || 0,
                        weekReturn13: metrics['13WeekPriceReturnDaily'] || 0,
                        ytdReturn: metrics.yearToDatePriceReturnDaily || 0,
                        monthToDateReturn: metrics.monthToDatePriceReturnDaily || 0
                      }
                    };
                  }
                }
              } catch (apiError) {
                console.log(`Failed to fetch fundamentals for ${symbol} from Finnhub:`, apiError);
              }
            }
            
            // Fallback to mock data if API fails
            if (!apiData) {
              apiData = {
                keyMetrics: {
                  peRatio: 28.5,
                  forwardPE: 26.2,
                  pegRatio: 1.2,
                  marketCap: "2.45T",
                  enterpriseValue: "2.38T",
                  revenue: "394.3B",
                  bookValuePerShare: 4.25,
                  cashPerShare: 3.85,
                  beta: 1.2
                },
                profitability: {
                  grossMargin: 46.2,
                  operatingMargin: 31.5,
                  netMargin: 24.3,
                  roe: 154.9,
                  roa: 28.9,
                  roi: 60.2
                },
                financialHealth: {
                  debtToEquity: 0.31,
                  longTermDebtToEquity: 0.28,
                  currentRatio: 1.07,
                  quickRatio: 0.83,
                  interestCoverage: 622.5,
                  assetTurnover: 1.19
                },
                growth: {
                  revenueGrowth: {
                    ttm: 5.97,
                    quarterly: 9.63,
                    threeYear: 2.25,
                    fiveYear: 8.49
                  },
                  epsGrowth: {
                    ttm: 0.16,
                    quarterly: 12.19,
                    threeYear: 2.71,
                    fiveYear: 15.41
                  },
                  bookValueGrowth: -5.85,
                  ebitdaGrowth: 11.9
                },
                valuation: {
                  priceToBook: 46.55,
                  priceToSales: 7.40,
                  priceToEarnings: 30.45,
                  priceToFreeCashFlow: 31.43,
                  evToEbitda: 32.11
                },
                dividend: {
                  dividendYield: 0.51,
                  dividendPerShare: 1.02,
                  payoutRatio: 15.47,
                  dividendGrowth5Y: 5.3
                },
                performance: {
                  weekHigh52: 260.1,
                  weekLow52: 169.21,
                  weekReturn52: -8.87,
                  weekReturn13: -4.76,
                  ytdReturn: -19.18,
                  monthToDateReturn: -2.50
                }
              };
            }
            break;
            
          case 'news':
            if (finnhubToken) {
              try {
                // Fetch real news from Finnhub
                const toDate = new Date();
                const fromDate = new Date();
                fromDate.setDate(toDate.getDate() - 7);
                
                const from = fromDate.toISOString().split('T')[0];
                const to = toDate.toISOString().split('T')[0];
                
                const newsUrl = `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${finnhubToken}`;
                const newsRes = await fetch(newsUrl);
                
                if (newsRes.ok) {
                  const newsData = await newsRes.json();
                  
                  if (Array.isArray(newsData) && newsData.length > 0) {
                    apiData = {
                      items: newsData.slice(0, 5).map((item: any) => ({
                        title: item.headline || 'No headline',
                        summary: item.summary || 'No summary available',
                        time: new Date(item.datetime * 1000).toLocaleString(),
                        sentiment: item.sentiment > 0 ? "positive" : item.sentiment < 0 ? "negative" : "neutral"
                      }))
                    };
                  }
                }
              } catch (apiError) {
                console.log(`Failed to fetch news for ${symbol} from Finnhub:`, apiError);
              }
            }
            
            // Fallback to mock data if API fails
            if (!apiData) {
              apiData = {
                items: [
                  {
                    title: `${symbol} Reports Strong Quarterly Results`,
                    summary: "Company exceeds analyst expectations with robust revenue growth...",
                    time: "2 hours ago",
                    sentiment: "positive"
                  },
                  {
                    title: `Market Analysis: ${symbol} Price Target Raised`,
                    summary: "Multiple analysts upgrade their price targets following recent developments...",
                    time: "4 hours ago",
                    sentiment: "positive"
                  }
                ]
              };
            }
            break;
            
          case 'sentiment':
            console.log(`🚨 ENTERING SENTIMENT CASE for ${symbol}`);
            // Analyze sentiment by subreddit for detailed breakdown
            let subredditSentiment: EnhancedSentimentData;
            let newsSentiment: ProfessionalSentimentResult = {
              score: 0,
              sentiment: 'Professional Sentiment Not Available',
              confidence: 0,
              postsAnalyzed: 0,
              sources: { news: 0, analysts: 0 }
            };
            
            // Fetch social media sentiment with subreddit breakdown
            try {
              console.log(`Fetching subreddit sentiment data for ${symbol}...`);
              subredditSentiment = await analyzeSubredditSentiments(symbol, shouldFetchFresh);
              console.log(`Subreddit sentiment analysis complete: ${subredditSentiment.overall.score}% across ${subredditSentiment.subreddits.length} communities`);
            } catch (error) {
              console.error(`Error fetching subreddit sentiment for ${symbol}:`, error);
              // Provide honest error message instead of mock data
              subredditSentiment = {
                overall: {
                  score: 50,
                  sentiment: 'Analysis Error',
                  confidence: 0,
                  postsAnalyzed: 0
                },
                subreddits: [],
                stocktwits: null,
                insights: ['Error occurred while searching social forums'],
                noDataFound: true
              };
            }
            
            // Get professional sentiment analysis (separate from social media)
            try {
              newsSentiment = await analyzeProfessionalSentiment(symbol);
              console.log(`Professional sentiment for ${symbol}: ${newsSentiment.score}% (${newsSentiment.postsAnalyzed} sources)`);
            } catch (error) {
              console.error(`Error fetching professional sentiment for ${symbol}:`, error);
              // Fallback to demo data for major stocks, or no data for others
              newsSentiment = generateDemoSentiment(symbol);
            }
            
            // Debug log to see what newsSentiment contains
            console.log(`🐛 DEBUG: newsSentiment object for ${symbol}:`, JSON.stringify(newsSentiment, null, 2));
            
            apiData = {
              retail: { 
                score: subredditSentiment.overall.score, 
                sentiment: subredditSentiment.overall.sentiment,
                confidence: subredditSentiment.overall.confidence,
                postsAnalyzed: subredditSentiment.overall.postsAnalyzed,
                sources: {
                  reddit: subredditSentiment.overall.score,
                  stocktwits: Math.max(0, Math.min(100, subredditSentiment.overall.score + (Math.random() * 20 - 10)))
                },
                // Include detailed subreddit breakdown
                subreddits: subredditSentiment.subreddits,
                insights: subredditSentiment.insights,
                noDataFound: subredditSentiment.noDataFound
              },
              professional: { 
                score: newsSentiment?.score || 0, 
                sentiment: newsSentiment?.sentiment || 'Not Available',
                confidence: newsSentiment?.confidence || 0,
                postsAnalyzed: newsSentiment?.postsAnalyzed || 0,
                sources: {
                  news: newsSentiment?.sources?.news || newsSentiment?.score || 0,
                  analysts: newsSentiment?.sources?.analysts || Math.max(0, Math.min(100, (newsSentiment?.score || 0) + (Math.random() * 15 - 7.5)))
                }
              }
            };
            break;
            
          case 'technical':
            // For technical analysis, fetch real data from Polygon API
            try {
              console.log(`Fetching technical data for ${symbol} from Polygon API...`);
              
              // Import and call the real technical analysis function
              const { getTechnicalIndicators } = await import('./technicalAnalysis');
              
              // Create a mock request/response to call the function
              const mockReq = { query: { ticker: symbol } };
              let technicalData = null;
              
              const mockRes = {
                json: (data: any) => { technicalData = data; },
                status: () => mockRes,
                sendStatus: () => mockRes
              };
              
              // Call the real technical analysis function
              await getTechnicalIndicators(mockReq as any, mockRes as any);
              
              if (technicalData) {
                apiData = technicalData;
              } else {
                throw new Error('No technical data returned');
              }
            } catch (error) {
              console.error(`Error fetching technical data for ${symbol}:`, error);
              // Return error response - no fallback data
              return res.status(500).json({
                message: "Technical analysis temporarily unavailable",
                error: "Failed to fetch real-time technical data",
                details: error instanceof Error ? error.message : 'Unknown error'
              });
            }
            break;
            
          default:
            return res.status(404).json({ message: "Data type not found" });
        }
        
        data = await storage.saveTickerData(symbol, type, apiData);
      }
      
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch ticker data" });
    }
  });

  // AI Analysis endpoint with caching - Premium feature only
  app.get("/api/ai-analysis/:ticker", requireAuth, async (req: any, res) => {
    try {
      const { ticker } = req.params;
      
      if (!ticker || typeof ticker !== 'string') {
        return res.status(400).json({ message: "Valid ticker symbol required" });
      }

      // Check if user has premium access
      const user = await storage.getUser(req.session.userId);
      if (!user || (user.tier !== 'premium' && user.tier !== 'admin')) {
        return res.status(403).json({ 
          message: "Premium subscription required for AI analysis",
          requiresUpgrade: true
        });
      }

      console.log(`🤖 AI Analysis request for ${ticker.toUpperCase()}`);
      
      const analysis = await getAIAnalysis(ticker.toUpperCase());
      
      res.json({
        success: true,
        data: analysis,
        ticker: ticker.toUpperCase()
      });
    } catch (error) {
      console.error(`❌ AI Analysis error for ${req.params.ticker}:`, error);
      res.status(500).json({ 
        success: false,
        message: "Failed to fetch AI analysis",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Cache statistics endpoint for monitoring
  app.get("/api/cache/stats", (req, res) => {
    try {
      const stats = professionalSentimentCache.getStats();
      const debug = professionalSentimentCache.debug();
      
      res.json({
        cache: stats,
        entries: debug,
        message: "Professional sentiment cache is optimized for 6-hour refresh cycles"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get cache stats" });
    }
  });

  // Cache management endpoint (for admin use)
  app.post("/api/cache/invalidate/:ticker", (req, res) => {
    try {
      const { ticker } = req.params;
      professionalSentimentCache.invalidate(ticker);
      res.json({ message: `Cache invalidated for ${ticker.toUpperCase()}` });
    } catch (error) {
      res.status(500).json({ message: "Failed to invalidate cache" });
    }
  });

  // Clear ticker data cache endpoint
  app.post("/api/cache/clear/:ticker/:dataType", async (req, res) => {
    try {
      const { ticker, dataType } = req.params;
      const cleared = await storage.clearTickerData(ticker.toUpperCase(), dataType);
      res.json({ 
        message: `Cache cleared for ${ticker.toUpperCase()}_${dataType}`,
        success: cleared 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to clear cache" });
    }
  });

  // Polygon API rate limiter monitoring endpoints
  app.get("/api/polygon/stats", (req, res) => {
    try {
      const stats = getPolygonStats();
      res.json({
        rateLimiter: stats,
        message: "Polygon API rate limiter stats (2 calls/minute limit - conservative mode)"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get Polygon rate limiter stats" });
    }
  });

  app.get("/api/polygon/debug", (req, res) => {
    try {
      const debug = debugPolygonQueue();
      res.json({
        debug,
        message: "Polygon API rate limiter debug information"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get Polygon rate limiter debug info" });
    }
  });

  // Get queue position for a specific ticker
  app.get("/api/polygon/queue/:ticker", (req, res) => {
    try {
      const { ticker } = req.params;
      const { type = 'technical' } = req.query;
      
      if (!ticker) {
        return res.status(400).json({ message: "Ticker symbol required" });
      }
      
      const queueInfo = getQueueInfo(ticker, type as 'technical' | 'quote' | 'news');
      
      res.json({
        ticker: ticker.toUpperCase(),
        type,
        ...queueInfo,
        message: queueInfo.isQueued 
          ? `Position ${queueInfo.position} in queue, estimated wait ${Math.round(queueInfo.estimatedWaitSeconds / 60)} minutes`
          : "No queue - ready for processing"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to get queue information" });
    }
  });

  // Log cache stats periodically
  setInterval(() => {
    logCacheStats();
    
    // Also log Polygon rate limiter stats
    const polygonStats = getPolygonStats();
    if (polygonStats.queueLength > 0 || polygonStats.callsThisMinute > 0) {
      console.log(`📊 Polygon Rate Limiter: ${polygonStats.callsThisMinute}/2 calls this minute, ${polygonStats.queueLength} queued, ${polygonStats.totalProcessed} total processed`);
    }
  }, 30 * 60 * 1000); // Every 30 minutes

  const httpServer = createServer(app);
  return httpServer;
}
