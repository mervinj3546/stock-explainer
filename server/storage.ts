import { 
  users, 
  tickers, 
  userWatchlists, 
  userSearchHistory, 
  userTickerUsage,
  tickerData,
  type User, 
  type InsertUser,
  type OAuthUser,
  type LoginUser,
  type Ticker,
  type InsertTicker,
  type UserWatchlist,
  type UserSearchHistory,
  type UserTickerUsage,
  type TickerData
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";
import { db } from "./db";
import { eq, and, desc, ilike, count } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByProviderId(provider: string, providerId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createOAuthUser(user: OAuthUser): Promise<User>;
  linkOAuthProvider(userId: string, oauthData: { provider: string; providerId: string; profilePicture?: string }): Promise<User>;
  validateUser(email: string, password: string): Promise<User | null>;
  
  // Ticker usage operations
  getUserTickerUsage(userId: string): Promise<UserTickerUsage[]>;
  addTickerUsage(userId: string, tickerSymbol: string): Promise<{ allowed: boolean; usage: UserTickerUsage | null; remainingLimit: number }>;
  getUserTickerCount(userId: string): Promise<number>;
  canUserAccessTicker(userId: string, tickerSymbol: string): Promise<{ allowed: boolean; reason?: string; remainingLimit: number }>;
  upgradeUserToPremium(userId: string): Promise<User>;
  resetDailyUsage(userId: string): Promise<User>;
  resetUserUsage(userId: string): Promise<void>;
  
  // Ticker operations
  getTicker(symbol: string): Promise<Ticker | undefined>;
  searchTickers(query: string): Promise<Ticker[]>;
  createOrUpdateTicker(ticker: InsertTicker): Promise<Ticker>;
  
  // Watchlist operations
  getUserWatchlist(userId: string): Promise<UserWatchlist[]>;
  addToWatchlist(userId: string, tickerSymbol: string): Promise<UserWatchlist>;
  removeFromWatchlist(userId: string, tickerSymbol: string): Promise<boolean>;
  
  // Search history operations
  getUserSearchHistory(userId: string): Promise<UserSearchHistory[]>;
  addToSearchHistory(userId: string, tickerSymbol: string): Promise<UserSearchHistory>;
  
  // Ticker data operations
  getTickerData(tickerSymbol: string, dataType: string): Promise<TickerData | undefined>;
  saveTickerData(tickerSymbol: string, dataType: string, data: any): Promise<TickerData>;
  clearTickerData(tickerSymbol: string, dataType: string): Promise<boolean>;
  isCacheExpired(tickerSymbol: string, dataType: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users = new Map<string, User>();
  private tickers = new Map<string, Ticker>();
  private watchlists = new Map<string, UserWatchlist>();
  private searchHistory = new Map<string, UserSearchHistory>();
  private tickerUsage = new Map<string, UserTickerUsage>();
  private tickerDataStore = new Map<string, TickerData>();

  // Free tier constants
  private readonly FREE_TICKER_LIMIT = 10;
  private readonly FREE_TICKERS = ['NVDA', 'TSLA', 'AAPL']; // Always free access

  constructor() {
    this.users = new Map();
    this.tickers = new Map();
    this.watchlists = new Map();
    this.searchHistory = new Map();
    this.tickerDataStore = new Map();
    
    // Seed with some sample tickers and demo user
    this.seedTickers();
    this.seedDemoUser();
    this.seedPremiumUser();
    this.seedAdminUser();
  }

  private async seedTickers() {
    // Update with more recent realistic stock prices (these are fallback values only)
    const sampleTickers = [
      { symbol: "AAPL", name: "Apple Inc.", price: 213.88, change: 0.12, changePercent: 0.06, volume: 75000000, marketCap: 2450000000000 },
      { symbol: "TSLA", name: "Tesla, Inc.", price: 245.67, change: -3.56, changePercent: -1.45, volume: 45000000, marketCap: 780000000000 },
      { symbol: "MSFT", name: "Microsoft Corporation", price: 513.71, change: 2.83, changePercent: 0.55, volume: 35000000, marketCap: 2800000000000 },
      { symbol: "NVDA", name: "NVIDIA Corporation", price: 418.77, change: 13.44, changePercent: 3.21, volume: 55000000, marketCap: 1030000000000 },
      { symbol: "AMZN", name: "Amazon.com, Inc.", price: 127.45, change: 0.57, changePercent: 0.45, volume: 28000000, marketCap: 1320000000000 },
    ];

    for (const ticker of sampleTickers) {
      await this.createOrUpdateTicker(ticker);
    }
  }

  private async seedDemoUser() {
    // Create demo user: demo@example.com / demo123
    const demoId = "demo-user-id";
    const hashedPassword = await bcrypt.hash("demo123", 10);
    const demoUser: User = {
      id: demoId,
      email: "demo@example.com",
      password: hashedPassword,
      firstName: "Demo",
      lastName: "User",
      profilePicture: null,
      provider: null,
      providerId: null,
      emailVerified: null,
      tier: "free",
      tickersUsed: 0,
      usageResetDate: null,
      createdAt: new Date(),
    };
    this.users.set(demoId, demoUser);

    // Do not add any sample watchlist items - let user add them organically
    // Do not add any sample search history - let user build it through actual searches
    
    // Clear any existing hardcoded data for demo user (in case server has been restarted)
    this.clearDemoUserData(demoId);
  }

  private async seedAdminUser() {
    // Only create admin user if password is provided in environment
    if (!process.env.ADMIN_PASSWORD) {
      return;
    }

    const adminId = "admin-user-id";
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
    const adminUser: User = {
      id: adminId,
      email: "admin@explainthis.app",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "User",
      profilePicture: null,
      provider: null,
      providerId: null,
      emailVerified: new Date(), // Admin is pre-verified
      tier: "admin", // Special admin tier with unlimited access
      tickersUsed: 0,
      usageResetDate: null,
      createdAt: new Date(),
    };
    this.users.set(adminId, adminUser);
  }

  private async seedPremiumUser() {
    // Create premium test user: premium@example.com / premium123
    const premiumId = "premium-user-id";
    const hashedPassword = await bcrypt.hash("premium123", 10);
    const premiumUser: User = {
      id: premiumId,
      email: "premium@example.com",
      password: hashedPassword,
      firstName: "Premium",
      lastName: "User",
      profilePicture: null,
      provider: null,
      providerId: null,
      emailVerified: new Date(), // Premium user is verified
      tier: "premium", // Premium tier with daily resets
      tickersUsed: 0,
      usageResetDate: new Date().toISOString().split('T')[0], // Today's date
      createdAt: new Date(),
    };
    this.users.set(premiumId, premiumUser);
  }

  private clearDemoUserData(demoUserId: string) {
    // Remove all existing watchlist items for demo user
    Array.from(this.watchlists.entries()).forEach(([id, item]) => {
      if (item.userId === demoUserId) {
        this.watchlists.delete(id);
      }
    });
    
    // Remove all existing search history for demo user
    Array.from(this.searchHistory.entries()).forEach(([id, item]) => {
      if (item.userId === demoUserId) {
        this.searchHistory.delete(id);
      }
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByProviderId(provider: string, providerId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => 
      user.provider === provider && user.providerId === providerId
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const hashedPassword = insertUser.password ? await bcrypt.hash(insertUser.password, 10) : null;
    const user: User = {
      ...insertUser,
      id,
      password: hashedPassword,
      firstName: insertUser.firstName || null,
      lastName: insertUser.lastName || null,
      profilePicture: null,
      provider: 'local',
      providerId: null,
      emailVerified: null,
      tier: 'free',
      tickersUsed: 0,
      usageResetDate: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async createOAuthUser(oauthUser: OAuthUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      email: oauthUser.email,
      password: null, // OAuth users don't have passwords
      firstName: oauthUser.firstName || null,
      lastName: oauthUser.lastName || null,
      profilePicture: oauthUser.profilePicture || null,
      provider: oauthUser.provider,
      providerId: oauthUser.providerId,
      emailVerified: new Date(), // OAuth emails are pre-verified
      tier: 'free',
      tickersUsed: 0,
      usageResetDate: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async linkOAuthProvider(userId: string, oauthData: { provider: string; providerId: string; profilePicture?: string }): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const updatedUser: User = {
      ...user,
      provider: oauthData.provider,
      providerId: oauthData.providerId,
      profilePicture: oauthData.profilePicture || user.profilePicture,
      emailVerified: new Date(),
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.password) return null; // No password means OAuth user
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Ticker usage methods
  async getUserTickerUsage(userId: string): Promise<UserTickerUsage[]> {
    return Array.from(this.tickerUsage.values()).filter(usage => usage.userId === userId);
  }

  async getUserTickerCount(userId: string): Promise<number> {
    const usageList = await this.getUserTickerUsage(userId);
    return usageList.length;
  }

  async addTickerUsage(userId: string, tickerSymbol: string): Promise<{ allowed: boolean; usage: UserTickerUsage | null; remainingLimit: number }> {
    const symbol = tickerSymbol.toUpperCase();
    
    // Get user to check tier
    const user = await this.getUser(userId);
    if (!user) {
      return { allowed: false, usage: null, remainingLimit: 0 };
    }

    // Admin users have unlimited access
    if (user.tier === 'admin') {
      return { allowed: true, usage: null, remainingLimit: -1 }; // -1 indicates unlimited
    }
    
    // Check if this ticker is always free
    if (this.FREE_TICKERS.includes(symbol)) {
      return { allowed: true, usage: null, remainingLimit: this.FREE_TICKER_LIMIT };
    }

    // Check if user already has access to this ticker
    const existingUsage = Array.from(this.tickerUsage.values()).find(
      usage => usage.userId === userId && usage.tickerSymbol === symbol
    );

    if (existingUsage) {
      // User already has access to this ticker, just update search count
      existingUsage.searchCount = (existingUsage.searchCount || 0) + 1;
      const currentCount = await this.getUserTickerCount(userId);
      const remainingLimit = this.FREE_TICKER_LIMIT - currentCount;
      return { allowed: true, usage: existingUsage, remainingLimit };
    }

    // For premium users, check daily reset
    if (user.tier === 'premium') {
      await this.checkAndResetDailyUsage(userId);
    }

    // Count current unique tickers
    const currentCount = await this.getUserTickerCount(userId);
    
    // Check limits for new ticker access
    if (user.tier === 'free' && currentCount >= this.FREE_TICKER_LIMIT) {
      return { allowed: false, usage: null, remainingLimit: 0 };
    }

    if (user.tier === 'premium' && currentCount >= this.FREE_TICKER_LIMIT) {
      return { allowed: false, usage: null, remainingLimit: 0 };
    }

    // Create new usage record for a new ticker
    const id = randomUUID();
    const newUsage: UserTickerUsage = {
      id,
      userId,
      tickerSymbol: symbol,
      firstSearched: new Date(),
      searchCount: 1,
    };
    
    this.tickerUsage.set(id, newUsage);

    // Calculate new remaining limit (currentCount + 1 because we just added one)
    const remainingLimit = this.FREE_TICKER_LIMIT - (currentCount + 1);
    return { allowed: true, usage: newUsage, remainingLimit };
  }

  async canUserAccessTicker(userId: string, tickerSymbol: string): Promise<{ allowed: boolean; reason?: string; remainingLimit: number }> {
    const symbol = tickerSymbol.toUpperCase();
    
    const user = await this.getUser(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found', remainingLimit: 0 };
    }

    // Admin users have unlimited access
    if (user.tier === 'admin') {
      return { allowed: true, remainingLimit: -1 }; // -1 indicates unlimited
    }
    
    // Free tickers are always accessible
    if (this.FREE_TICKERS.includes(symbol)) {
      return { allowed: true, remainingLimit: this.FREE_TICKER_LIMIT };
    }

    // Check if user already has access to this ticker
    const existingUsage = Array.from(this.tickerUsage.values()).find(
      usage => usage.userId === userId && usage.tickerSymbol === symbol
    );

    if (existingUsage) {
      return { allowed: true, remainingLimit: this.FREE_TICKER_LIMIT };
    }

    // For premium users, check daily reset
    if (user.tier === 'premium') {
      await this.checkAndResetDailyUsage(userId);
    }

    const currentCount = await this.getUserTickerCount(userId);
    const remainingLimit = this.FREE_TICKER_LIMIT - currentCount;

    if (currentCount >= this.FREE_TICKER_LIMIT) {
      const reason = user.tier === 'free' 
        ? 'Free tier limit reached. Upgrade to premium for daily resets.'
        : 'Daily limit reached. Limit resets tomorrow.';
      return { allowed: false, reason, remainingLimit: 0 };
    }

    return { allowed: true, remainingLimit };
  }

  async upgradeUserToPremium(userId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedUser: User = {
      ...user,
      tier: 'premium',
      usageResetDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async resetDailyUsage(userId: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Clear all ticker usage for this user (except free tickers which don't count)
    const userUsage = Array.from(this.tickerUsage.entries()).filter(
      ([_, usage]) => usage.userId === userId && !this.FREE_TICKERS.includes(usage.tickerSymbol)
    );

    userUsage.forEach(([id, _]) => {
      this.tickerUsage.delete(id);
    });

    const updatedUser: User = {
      ...user,
      tickersUsed: 0,
      usageResetDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  private async checkAndResetDailyUsage(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user || user.tier !== 'premium') return;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const lastReset = user.usageResetDate;

    if (lastReset !== today) {
      await this.resetDailyUsage(userId);
    }
  }

  async resetUserUsage(userId: string): Promise<void> {
    // Clear all ticker usage for the user
    const userUsage = Array.from(this.tickerUsage.entries()).filter(
      ([_, usage]) => usage.userId === userId
    );
    
    userUsage.forEach(([id]) => {
      this.tickerUsage.delete(id);
    });

    // Reset user's ticker count (note: we removed the tickersUsed field but keeping for compatibility)
    const user = this.users.get(userId);
    if (user) {
      this.users.set(userId, {
        ...user,
        tickersUsed: 0,
        usageResetDate: new Date().toISOString().split('T')[0]
      });
    }
  }

  async getTicker(symbol: string): Promise<Ticker | undefined> {
    return this.tickers.get(symbol.toUpperCase());
  }

  async searchTickers(query: string): Promise<Ticker[]> {
    const searchQuery = query.toLowerCase();
    return Array.from(this.tickers.values()).filter(ticker =>
      ticker.symbol.toLowerCase().includes(searchQuery) ||
      ticker.name.toLowerCase().includes(searchQuery)
    );
  }

  async createOrUpdateTicker(insertTicker: InsertTicker): Promise<Ticker> {
    const ticker: Ticker = {
      id: randomUUID(),
      ...insertTicker,
      symbol: insertTicker.symbol.toUpperCase(),
      volume: insertTicker.volume || null,
      marketCap: insertTicker.marketCap || null,
      updatedAt: new Date(),
    };
    this.tickers.set(ticker.symbol, ticker);
    return ticker;
  }

  async getUserWatchlist(userId: string): Promise<UserWatchlist[]> {
    return Array.from(this.watchlists.values()).filter(item => item.userId === userId);
  }

  async addToWatchlist(userId: string, tickerSymbol: string): Promise<UserWatchlist> {
    const id = randomUUID();
    const watchlistItem: UserWatchlist = {
      id,
      userId,
      tickerSymbol: tickerSymbol.toUpperCase(),
      addedAt: new Date(),
    };
    this.watchlists.set(id, watchlistItem);
    return watchlistItem;
  }

  async removeFromWatchlist(userId: string, tickerSymbol: string): Promise<boolean> {
    const item = Array.from(this.watchlists.values()).find(
      w => w.userId === userId && w.tickerSymbol === tickerSymbol.toUpperCase()
    );
    if (item) {
      this.watchlists.delete(item.id);
      return true;
    }
    return false;
  }

  async getUserSearchHistory(userId: string): Promise<UserSearchHistory[]> {
    return Array.from(this.searchHistory.values())
      .filter(item => item.userId === userId)
      .sort((a, b) => new Date(b.searchedAt!).getTime() - new Date(a.searchedAt!).getTime())
      .slice(0, 10); // Return last 10 searches
  }

  async addToSearchHistory(userId: string, tickerSymbol: string): Promise<UserSearchHistory> {
    const id = randomUUID();
    const historyItem: UserSearchHistory = {
      id,
      userId,
      tickerSymbol: tickerSymbol.toUpperCase(),
      searchedAt: new Date(),
    };
    this.searchHistory.set(id, historyItem);
    return historyItem;
  }

  async getTickerData(tickerSymbol: string, dataType: string): Promise<TickerData | undefined> {
    const key = `${tickerSymbol.toUpperCase()}_${dataType}`;
    return Array.from(this.tickerDataStore.values()).find(
      data => data.tickerSymbol === tickerSymbol.toUpperCase() && data.dataType === dataType
    );
  }

  async saveTickerData(tickerSymbol: string, dataType: string, data: any): Promise<TickerData> {
    const id = randomUUID();
    const tickerDataItem: TickerData = {
      id,
      tickerSymbol: tickerSymbol.toUpperCase(),
      dataType,
      data,
      createdAt: new Date(),
    };
    this.tickerDataStore.set(id, tickerDataItem);
    return tickerDataItem;
  }

  async clearTickerData(tickerSymbol: string, dataType: string): Promise<boolean> {
    const existingData = Array.from(this.tickerDataStore.entries()).find(
      ([_, data]) => data.tickerSymbol === tickerSymbol.toUpperCase() && data.dataType === dataType
    );
    if (existingData) {
      this.tickerDataStore.delete(existingData[0]);
      return true;
    }
    return false;
  }

  async isCacheExpired(tickerSymbol: string, dataType: string): Promise<boolean> {
    const data = await this.getTickerData(tickerSymbol, dataType);
    if (!data || !data.createdAt) return true;

    const now = new Date();
    const cacheAge = now.getTime() - data.createdAt.getTime();
    
    // Cache expiry rules based on data type
    switch (dataType) {
      case 'fundamentals':
        return cacheAge > 24 * 60 * 60 * 1000; // 24 hours for fundamentals
      case 'news':
        return cacheAge > 30 * 60 * 1000; // 30 minutes for news
      case 'technical':
        return cacheAge > 12 * 60 * 60 * 1000; // 12 hours for technical indicators
      case 'sentiment':
        return cacheAge > 30 * 60 * 1000; // 30 minutes for sentiment analysis
      case 'ytd':
        return cacheAge > 12 * 60 * 60 * 1000; // 12 hours for YTD data
      case 'realtime-price':
        return cacheAge > 1 * 60 * 1000; // 1 minute for real-time price data
      default:
        return cacheAge > 60 * 60 * 1000; // 1 hour default
    }
  }
}

export class DbStorage implements IStorage {
  constructor() {
    // Initialize with demo data
    this.seedDatabase();
    this.seedPremiumUser();
    this.seedAdminUser();
  }

  private async seedDatabase() {
    try {
      // Check if demo user already exists
      const existingDemo = await db
        .select()
        .from(users)
        .where(eq(users.email, "demo@example.com"))
        .limit(1);

      if (existingDemo.length === 0) {
        // Create demo user
        const hashedPassword = await bcrypt.hash("demo123", 10);
        const [demoUser] = await db
          .insert(users)
          .values({
            id: "demo-user-id",
            email: "demo@example.com",
            password: hashedPassword,
            firstName: "Demo",
            lastName: "User",
          })
          .returning();

        // Seed sample tickers
        const sampleTickers = [
          { symbol: "AAPL", name: "Apple Inc.", price: 213.88, change: 0.12, changePercent: 0.06, volume: 75000000, marketCap: 2450000000000 },
          { symbol: "TSLA", name: "Tesla, Inc.", price: 245.67, change: -3.56, changePercent: -1.45, volume: 45000000, marketCap: 780000000000 },
          { symbol: "MSFT", name: "Microsoft Corporation", price: 513.71, change: 2.83, changePercent: 0.55, volume: 35000000, marketCap: 2800000000000 },
          { symbol: "NVDA", name: "NVIDIA Corporation", price: 418.77, change: 13.44, changePercent: 3.21, volume: 55000000, marketCap: 1030000000000 },
          { symbol: "AMZN", name: "Amazon.com, Inc.", price: 127.45, change: 0.57, changePercent: 0.45, volume: 28000000, marketCap: 1320000000000 },
        ];

        for (const ticker of sampleTickers) {
          await this.createOrUpdateTicker(ticker);
        }

        // Add sample watchlist for demo user
        const watchlistItems = ["AAPL", "TSLA", "MSFT"];
        for (const symbol of watchlistItems) {
          await db.insert(userWatchlists).values({
            userId: demoUser.id,
            tickerSymbol: symbol,
          });
        }

        // Add sample search history
        const searchItems = ["AAPL", "TSLA", "MSFT", "NVDA"];
        for (const symbol of searchItems) {
          await db.insert(userSearchHistory).values({
            userId: demoUser.id,
            tickerSymbol: symbol,
          });
        }

        // Add sample ticker data
        const sampleData = {
          news: {
            headlines: [
              { title: "Apple Reports Strong Q4 Earnings", source: "Reuters", time: "2 hours ago" },
              { title: "New iPhone Sales Exceed Expectations", source: "Bloomberg", time: "4 hours ago" },
              { title: "Apple Stock Reaches New High", source: "CNBC", time: "6 hours ago" }
            ]
          },
          sentiment: {
            bullish: 65,
            bearish: 35,
            neutral: 45,
            sentiment_score: 0.75
          },
          fundamentals: {
            pe_ratio: 28.5,
            market_cap: 2450000000000,
            revenue: 394000000000,
            profit_margin: 0.25
          },
          technical: {
            sma_20: 145.67,
            sma_50: 142.34,
            rsi: 58.3,
            macd: 2.45
          }
        };

        for (const dataType of ['news', 'sentiment', 'fundamentals', 'technical']) {
          await db.insert(tickerData).values({
            tickerSymbol: 'AAPL',
            dataType,
            data: sampleData[dataType as keyof typeof sampleData],
          });
        }
      }
    } catch (error) {
      console.error('Error seeding database:', error);
    }
  }

  private async seedAdminUser() {
    try {
      // Only create admin user if password is provided in environment
      if (!process.env.ADMIN_PASSWORD) {
        return;
      }

      // Check if admin user already exists
      const existingAdmin = await db
        .select()
        .from(users)
        .where(eq(users.email, "admin@explainthis.app"))
        .limit(1);

      if (existingAdmin.length === 0) {
        // Create admin user
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);
        await db
          .insert(users)
          .values({
            email: "admin@explainthis.app",
            password: hashedPassword,
            firstName: "Admin",
            lastName: "User",
            provider: "local",
            emailVerified: new Date(), // Admin is pre-verified
            tier: "admin", // Special admin tier with unlimited access
            tickersUsed: 0,
          });
        console.log('✅ Admin user created successfully');
      }
    } catch (error) {
      console.error('Error seeding admin user:', error);
    }
  }

  private async seedPremiumUser() {
    try {
      // Check if premium user already exists
      const existingPremium = await db
        .select()
        .from(users)
        .where(eq(users.email, "premium@example.com"))
        .limit(1);

      if (existingPremium.length === 0) {
        // Create premium user
        const hashedPassword = await bcrypt.hash("premium123", 10);
        await db
          .insert(users)
          .values({
            email: "premium@example.com",
            password: hashedPassword,
            firstName: "Premium",
            lastName: "User",
            provider: "local",
            emailVerified: new Date(), // Premium user is verified
            tier: "premium", // Premium tier with daily resets
            tickersUsed: 0,
            usageResetDate: new Date().toISOString().split('T')[0], // Today's date
          });
        console.log('✅ Premium user created successfully');
      }
    } catch (error) {
      console.error('Error seeding premium user:', error);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0];
  }

  async getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0];
  }

  async getUserByProviderId(provider: string, providerId: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.provider, provider), eq(users.providerId, providerId)))
      .limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const hashedPassword = user.password ? await bcrypt.hash(user.password, 10) : null;
    const [newUser] = await db
      .insert(users)
      .values({
        ...user,
        password: hashedPassword,
        provider: 'local',
      })
      .returning();
    return newUser;
  }

  async createOAuthUser(oauthUser: OAuthUser): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({
        email: oauthUser.email,
        firstName: oauthUser.firstName,
        lastName: oauthUser.lastName,
        profilePicture: oauthUser.profilePicture,
        provider: oauthUser.provider,
        providerId: oauthUser.providerId,
        emailVerified: new Date(),
        password: null, // OAuth users don't have passwords
      })
      .returning();
    return newUser;
  }

  async linkOAuthProvider(userId: string, oauthData: { provider: string; providerId: string; profilePicture?: string }): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        provider: oauthData.provider,
        providerId: oauthData.providerId,
        profilePicture: oauthData.profilePicture,
        emailVerified: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error('User not found');
    }
    
    return updatedUser;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.password) return null; // No password means OAuth user

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  // Ticker usage methods for DbStorage
  private readonly FREE_TICKER_LIMIT = 10;
  private readonly FREE_TICKERS = ['NVDA', 'TSLA', 'AAPL']; // Always free access

  async getUserTickerUsage(userId: string): Promise<UserTickerUsage[]> {
    const result = await db
      .select()
      .from(userTickerUsage)
      .where(eq(userTickerUsage.userId, userId));
    return result;
  }

  async getUserTickerCount(userId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(userTickerUsage)
      .where(eq(userTickerUsage.userId, userId));
    return result[0]?.count || 0;
  }

  async addTickerUsage(userId: string, tickerSymbol: string): Promise<{ allowed: boolean; usage: UserTickerUsage | null; remainingLimit: number }> {
    const symbol = tickerSymbol.toUpperCase();
    
    // Get user to check tier
    const user = await this.getUser(userId);
    if (!user) {
      return { allowed: false, usage: null, remainingLimit: 0 };
    }

    // Admin users have unlimited access
    if (user.tier === 'admin') {
      return { allowed: true, usage: null, remainingLimit: -1 }; // -1 indicates unlimited
    }
    
    // Check if this ticker is always free
    if (this.FREE_TICKERS.includes(symbol)) {
      return { allowed: true, usage: null, remainingLimit: this.FREE_TICKER_LIMIT };
    }

    // Check if user already has access to this ticker
    const existingUsage = await db
      .select()
      .from(userTickerUsage)
      .where(and(
        eq(userTickerUsage.userId, userId),
        eq(userTickerUsage.tickerSymbol, symbol)
      ))
      .limit(1);

    if (existingUsage.length > 0) {
      // User already has access to this ticker, just update search count
      const [updatedUsage] = await db
        .update(userTickerUsage)
        .set({ searchCount: (existingUsage[0].searchCount || 0) + 1 })
        .where(eq(userTickerUsage.id, existingUsage[0].id))
        .returning();
      
      const currentCount = await this.getUserTickerCount(userId);
      const remainingLimit = this.FREE_TICKER_LIMIT - currentCount;
      return { allowed: true, usage: updatedUsage, remainingLimit };
    }

    // For premium users, check daily reset
    if (user.tier === 'premium') {
      await this.checkAndResetDailyUsage(userId);
    }

    // Count current unique tickers
    const currentCount = await this.getUserTickerCount(userId);
    
    // Check limits
    if (user.tier === 'free' && currentCount >= this.FREE_TICKER_LIMIT) {
      return { allowed: false, usage: null, remainingLimit: 0 };
    }

    if (user.tier === 'premium' && currentCount >= this.FREE_TICKER_LIMIT) {
      return { allowed: false, usage: null, remainingLimit: 0 };
    }

    // Create new usage record for a new ticker
    const [newUsage] = await db
      .insert(userTickerUsage)
      .values({
        userId,
        tickerSymbol: symbol,
        firstSearched: new Date(),
        searchCount: 1,
      })
      .returning();

    // Calculate new remaining limit (currentCount + 1 because we just added one)
    const remainingLimit = this.FREE_TICKER_LIMIT - (currentCount + 1);
    return { allowed: true, usage: newUsage, remainingLimit };
  }

  async canUserAccessTicker(userId: string, tickerSymbol: string): Promise<{ allowed: boolean; reason?: string; remainingLimit: number }> {
    const symbol = tickerSymbol.toUpperCase();
    
    const user = await this.getUser(userId);
    if (!user) {
      return { allowed: false, reason: 'User not found', remainingLimit: 0 };
    }

    // Admin users have unlimited access
    if (user.tier === 'admin') {
      return { allowed: true, remainingLimit: -1 }; // -1 indicates unlimited
    }
    
    // Free tickers are always accessible
    if (this.FREE_TICKERS.includes(symbol)) {
      return { allowed: true, remainingLimit: this.FREE_TICKER_LIMIT };
    }

    // Check if user already has access to this ticker
    const existingUsage = await db
      .select()
      .from(userTickerUsage)
      .where(and(
        eq(userTickerUsage.userId, userId),
        eq(userTickerUsage.tickerSymbol, symbol)
      ))
      .limit(1);

    if (existingUsage.length > 0) {
      return { allowed: true, remainingLimit: this.FREE_TICKER_LIMIT };
    }

    // For premium users, check daily reset
    if (user.tier === 'premium') {
      await this.checkAndResetDailyUsage(userId);
    }

    const currentCount = await this.getUserTickerCount(userId);
    const remainingLimit = this.FREE_TICKER_LIMIT - currentCount;

    if (currentCount >= this.FREE_TICKER_LIMIT) {
      const reason = user.tier === 'free' 
        ? 'Free tier limit reached. Upgrade to premium for daily resets.'
        : 'Daily limit reached. Limit resets tomorrow.';
      return { allowed: false, reason, remainingLimit: 0 };
    }

    return { allowed: true, remainingLimit };
  }

  async upgradeUserToPremium(userId: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({
        tier: 'premium',
        usageResetDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  }

  async resetDailyUsage(userId: string): Promise<User> {
    // Clear all ticker usage for this user (except free tickers which don't count)
    await db
      .delete(userTickerUsage)
      .where(and(
        eq(userTickerUsage.userId, userId),
        // Only delete non-free tickers
      ));

    // Reset user's ticker count and update reset date
    const [updatedUser] = await db
      .update(users)
      .set({
        tickersUsed: 0,
        usageResetDate: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      })
      .where(eq(users.id, userId))
      .returning();

    if (!updatedUser) {
      throw new Error('User not found');
    }

    return updatedUser;
  }

  private async checkAndResetDailyUsage(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user || user.tier !== 'premium') return;

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const lastReset = user.usageResetDate;

    if (lastReset !== today) {
      await this.resetDailyUsage(userId);
    }
  }

  async resetUserUsage(userId: string): Promise<void> {
    // Clear all ticker usage for the user
    await db
      .delete(userTickerUsage)
      .where(eq(userTickerUsage.userId, userId));

    // Reset user's ticker count and usage date
    await db
      .update(users)
      .set({ 
        tickersUsed: 0,
        usageResetDate: new Date().toISOString().split('T')[0]
      })
      .where(eq(users.id, userId));
  }

  async getTicker(symbol: string): Promise<Ticker | undefined> {
    const result = await db
      .select()
      .from(tickers)
      .where(eq(tickers.symbol, symbol.toUpperCase()))
      .limit(1);
    return result[0];
  }

  async searchTickers(query: string): Promise<Ticker[]> {
    return await db
      .select()
      .from(tickers)
      .where(ilike(tickers.symbol, `%${query.toUpperCase()}%`))
      .limit(10);
  }

  async createOrUpdateTicker(ticker: InsertTicker): Promise<Ticker> {
    const existing = await this.getTicker(ticker.symbol);
    
    if (existing) {
      const [updated] = await db
        .update(tickers)
        .set({ ...ticker, updatedAt: new Date() })
        .where(eq(tickers.symbol, ticker.symbol))
        .returning();
      return updated;
    } else {
      const [newTicker] = await db
        .insert(tickers)
        .values(ticker)
        .returning();
      return newTicker;
    }
  }

  async getUserWatchlist(userId: string): Promise<UserWatchlist[]> {
    return await db
      .select()
      .from(userWatchlists)
      .where(eq(userWatchlists.userId, userId));
  }

  async addToWatchlist(userId: string, tickerSymbol: string): Promise<UserWatchlist> {
    const [watchlistItem] = await db
      .insert(userWatchlists)
      .values({
        userId,
        tickerSymbol: tickerSymbol.toUpperCase(),
      })
      .returning();
    return watchlistItem;
  }

  async removeFromWatchlist(userId: string, tickerSymbol: string): Promise<boolean> {
    const result = await db
      .delete(userWatchlists)
      .where(
        and(
          eq(userWatchlists.userId, userId),
          eq(userWatchlists.tickerSymbol, tickerSymbol.toUpperCase())
        )
      );
    return true;
  }

  async getUserSearchHistory(userId: string): Promise<UserSearchHistory[]> {
    return await db
      .select()
      .from(userSearchHistory)
      .where(eq(userSearchHistory.userId, userId))
      .orderBy(desc(userSearchHistory.searchedAt))
      .limit(10);
  }

  async addToSearchHistory(userId: string, tickerSymbol: string): Promise<UserSearchHistory> {
    const [historyItem] = await db
      .insert(userSearchHistory)
      .values({
        userId,
        tickerSymbol: tickerSymbol.toUpperCase(),
      })
      .returning();
    return historyItem;
  }

  async getTickerData(tickerSymbol: string, dataType: string): Promise<TickerData | undefined> {
    const result = await db
      .select()
      .from(tickerData)
      .where(
        and(
          eq(tickerData.tickerSymbol, tickerSymbol.toUpperCase()),
          eq(tickerData.dataType, dataType)
        )
      )
      .limit(1);
    return result[0];
  }

  async saveTickerData(tickerSymbol: string, dataType: string, data: any): Promise<TickerData> {
    const [tickerDataItem] = await db
      .insert(tickerData)
      .values({
        tickerSymbol: tickerSymbol.toUpperCase(),
        dataType,
        data,
      })
      .returning();
    return tickerDataItem;
  }

  async clearTickerData(tickerSymbol: string, dataType: string): Promise<boolean> {
    const result = await db
      .delete(tickerData)
      .where(
        and(
          eq(tickerData.tickerSymbol, tickerSymbol.toUpperCase()),
          eq(tickerData.dataType, dataType)
        )
      );
    return true;
  }

  async isCacheExpired(tickerSymbol: string, dataType: string): Promise<boolean> {
    const data = await this.getTickerData(tickerSymbol, dataType);
    if (!data || !data.createdAt) return true;

    const now = new Date();
    const cacheAge = now.getTime() - data.createdAt.getTime();
    
    // Cache expiry rules based on data type
    switch (dataType) {
      case 'fundamentals':
        return cacheAge > 24 * 60 * 60 * 1000; // 24 hours for fundamentals
      case 'news':
        return cacheAge > 30 * 60 * 1000; // 30 minutes for news
      case 'technical':
        return cacheAge > 12 * 60 * 60 * 1000; // 12 hours for technical indicators
      case 'sentiment':
        return cacheAge > 30 * 60 * 1000; // 30 minutes for sentiment analysis
      case 'reddit-sentiment':
        return cacheAge > 36 * 60 * 60 * 1000; // 36 hours for Reddit sentiment analysis
      case 'ytd':
        return cacheAge > 12 * 60 * 60 * 1000; // 12 hours for YTD data
      case 'realtime-price':
        return cacheAge > 1 * 60 * 1000; // 1 minute for real-time price data
      default:
        return cacheAge > 60 * 60 * 1000; // 1 hour default
    }
  }
}

export const storage = new DbStorage();
