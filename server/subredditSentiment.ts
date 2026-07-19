// Subreddit-specific sentiment analysis with 36-hour persistent caching
import { analyzeSentimentAdvanced } from './sentimentAnalysis';
import { XMLParser } from 'fast-xml-parser';
import { storage } from './storage';

export interface SubredditSentiment {
  subreddit: string;
  displayName: string;
  score: number;
  sentiment: string;
  confidence: number;
  postsAnalyzed: number;
  characteristics: string[];
  posts: Array<{
    title: string;
    score: number;
    sentiment: number;
  }>;
}

export interface StockTwitsSentiment {
  platform: string;
  displayName: string;
  score: number;
  sentiment: string;
  confidence: number;
  postsAnalyzed: number;
  characteristics: string[];
  posts: Array<{
    title: string;
    score: number;
    sentiment: number;
  }>;
}

export interface EnhancedSentimentData {
  overall: {
    score: number;
    sentiment: string;
    confidence: number;
    postsAnalyzed: number;
  };
  subreddits: SubredditSentiment[];
  stocktwits: StockTwitsSentiment | null;
  insights: string[];
  noDataFound: boolean;
}

// Cache duration for Reddit sentiment data (36 hours)
const REDDIT_CACHE_DURATION = 36 * 60 * 60 * 1000; // 36 hours in milliseconds

// Legacy in-memory cache for backward compatibility (6 hours)
const subredditSentimentCache = new Map<string, {
  data: EnhancedSentimentData;
  timestamp: number;
  expiresAt: number;
}>();

const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

// Persistent Reddit sentiment cache functions
async function getCachedRedditSentiment(ticker: string): Promise<EnhancedSentimentData | null> {
  try {
    const cachedData = await storage.getTickerData(ticker.toUpperCase(), 'reddit-sentiment');
    
    if (cachedData && cachedData.createdAt) {
      const age = Date.now() - new Date(cachedData.createdAt).getTime();
      const ageHours = Math.round(age / (1000 * 60 * 60));
      
      // Check if cache is still valid (36 hours)
      if (age < REDDIT_CACHE_DURATION) {
        console.log(`📊 Reddit sentiment cache HIT for ${ticker} (age: ${ageHours} hours)`);
        return cachedData.data as EnhancedSentimentData;
      } else {
        console.log(`📊 Reddit sentiment cache EXPIRED for ${ticker} (age: ${ageHours} hours)`);
      }
    }
    
    console.log(`📊 Reddit sentiment cache MISS for ${ticker}`);
    return null;
  } catch (error) {
    console.error(`Error getting cached Reddit sentiment for ${ticker}:`, error);
    return null;
  }
}

async function setCachedRedditSentiment(ticker: string, data: EnhancedSentimentData): Promise<void> {
  try {
    await storage.saveTickerData(ticker.toUpperCase(), 'reddit-sentiment', data);
    console.log(`💾 Cached Reddit sentiment for ${ticker} (expires in 36 hours)`);
  } catch (error) {
    console.error(`Error caching Reddit sentiment for ${ticker}:`, error);
  }
}

async function isRedditSentimentCacheExpired(ticker: string): Promise<boolean> {
  try {
    return await storage.isCacheExpired(ticker.toUpperCase(), 'reddit-sentiment');
  } catch (error) {
    console.error(`Error checking Reddit sentiment cache expiry for ${ticker}:`, error);
    return true; // Assume expired on error
  }
}

// Initialize XML parser
const xmlParser = new XMLParser();

// Reddit RSS cache for individual posts (30 minutes)
const redditRssCache = new Map<string, {
  data: any[];
  timestamp: number;
  expiresAt: number;
}>();

const RSS_CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds (more aggressive caching)

// Reddit API access token cache (expires every hour)
let redditAccessToken: { token: string; expiresAt: number } | null = null;

// Get Reddit OAuth2 access token
async function getRedditAccessToken(): Promise<string | null> {
  try {
    // Check if we have a valid cached token
    if (redditAccessToken && Date.now() < redditAccessToken.expiresAt) {
      return redditAccessToken.token;
    }

    console.log(`🔑 Fetching Reddit OAuth2 access token...`);
    
    const clientId = process.env.REDDIT_CLIENT_ID; // From your app: Ez1qtxipAZDC2Ps-ZA8HBw
    const clientSecret = process.env.REDDIT_CLIENT_SECRET; // From your app: A3Eb-6HaKzQE4DKp9vQ4D8QQ5EN7Vw
    
    if (!clientId || !clientSecret) {
      console.log(`❌ Reddit API credentials not found in environment`);
      return null;
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    
    const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'ExplainThis-StockAnalysis/1.0 by Creepy-Buy1588'
      },
      body: 'grant_type=client_credentials'
    });

    if (!tokenResponse.ok) {
      console.log(`❌ Failed to get Reddit access token: ${tokenResponse.status}`);
      return null;
    }

    const tokenData = await tokenResponse.json();
    const expiresAt = Date.now() + (tokenData.expires_in * 1000) - 60000; // 1 minute buffer
    
    redditAccessToken = {
      token: tokenData.access_token,
      expiresAt
    };

    console.log(`✅ Reddit access token obtained, expires in ${Math.round(tokenData.expires_in / 60)} minutes`);
    return tokenData.access_token;
    
  } catch (error) {
    console.error(`Error getting Reddit access token:`, error);
    return null;
  }
}

// Official Reddit API search function (respects 100 calls/min rate limit)
async function fetchRedditPosts(ticker: string): Promise<RedditPost[]> {
  try {
    console.log(`🔍 Fetching Reddit posts via official API for "${ticker}"...`);
    
    const accessToken = await getRedditAccessToken();
    if (!accessToken) {
      console.log(`❌ No Reddit access token available`);
      return [];
    }

    // Use official Reddit API search endpoint
    const searchUrl = `https://oauth.reddit.com/search?q=${encodeURIComponent(ticker)}&limit=10&sort=new&type=link`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'ExplainThis-StockAnalysis/1.0 by Creepy-Buy1588'
      }
    });

    if (!searchResponse.ok) {
      console.log(`❌ Failed to fetch Reddit API search for ${ticker}: ${searchResponse.status}`);
      return [];
    }

    const searchData = await searchResponse.json();
    const children = searchData?.data?.children || [];
    
    console.log(`📊 Found ${children.length} posts via Reddit API for ${ticker}`);
    
    const posts: RedditPost[] = [];
    for (const child of children.slice(0, 8)) {
      try {
        const postData = child.data;
        if (postData && postData.title) {
          posts.push({
            id: postData.id,
            title: postData.title || '',
            selftext: postData.selftext || '',
            ups: postData.ups || 0,
            permalink: postData.permalink || '',
            subreddit: postData.subreddit || 'unknown',
            created_utc: postData.created_utc || 0
          });
        }
      } catch (error) {
        console.error(`Error processing Reddit API post:`, error);
      }
    }

    return posts;
  } catch (error) {
    console.error(`Error fetching Reddit API search for ${ticker}:`, error);
    return [];
  }
}

// Subreddit-specific search function for targeted analysis
async function fetchSubredditPosts(ticker: string, subreddit: string): Promise<RedditPost[]> {
  try {
    console.log(`🔍 Fetching Reddit posts from r/${subreddit} for "${ticker}"...`);
    
    const accessToken = await getRedditAccessToken();
    if (!accessToken) {
      console.log(`❌ No Reddit access token available`);
      return [];
    }

    // Search specific subreddit using Reddit API
    const searchUrl = `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(ticker)}&restrict_sr=on&limit=8&sort=new&type=link`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'ExplainThis-StockAnalysis/1.0 by Creepy-Buy1588'
      }
    });

    if (!searchResponse.ok) {
      console.log(`❌ Failed to fetch Reddit API search for r/${subreddit}: ${searchResponse.status}`);
      return [];
    }

    const searchData = await searchResponse.json();
    const children = searchData?.data?.children || [];
    
    console.log(`📊 Found ${children.length} posts in r/${subreddit} for ${ticker}`);
    
    const posts: RedditPost[] = [];
    let filteredOutCount = 0;
    for (const child of children) {
      try {
        const postData = child.data;
        if (postData && postData.title) {
          const title = postData.title || '';
          const selftext = postData.selftext || '';
          
          // Filter: Only include posts where ticker appears in title (most focused discussions)
          const titleUpperCase = title.toUpperCase();
          const tickerUpperCase = ticker.toUpperCase();
          
          // Check for ticker in multiple formats: AAPL, $AAPL
          const hasTickerInTitle = titleUpperCase.includes(tickerUpperCase) || titleUpperCase.includes(`$${tickerUpperCase}`);
          
          // Only include if ticker is mentioned in title (highest relevance)
          if (hasTickerInTitle) {
            posts.push({
              id: postData.id,
              title: title,
              selftext: selftext,
              ups: postData.ups || 0,
              permalink: postData.permalink || '',
              subreddit: postData.subreddit || 'unknown',
              created_utc: postData.created_utc || 0
            });
          } else {
            filteredOutCount++;
          }
        }
      } catch (error) {
        console.error(`Error processing Reddit API post from r/${subreddit}:`, error);
      }
    }

    if (filteredOutCount > 0) {
      console.log(`🔍 Filtered out ${filteredOutCount} posts without ticker in title, ${posts.length} title-focused posts remain`);
    }

    return posts;
  } catch (error) {
    console.error(`Error fetching Reddit API search for r/${subreddit}:`, error);
    return [];
  }
}

// Reddit post interface for RSS parsing
interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  ups: number;
  permalink: string;
  subreddit: string;
  created_utc: number;
}

// Fetch Reddit RSS feed for a subreddit and ticker
async function fetchRedditRss(subreddit: string, ticker: string): Promise<RedditPost[]> {
  const cacheKey = `${subreddit}_${ticker}`;
  const cachedData = redditRssCache.get(cacheKey);
  const now = Date.now();

  // Return cached data if available and not expired
  if (cachedData && now < cachedData.expiresAt) {
    const minutesOld = Math.floor((now - cachedData.timestamp) / (1000 * 60));
    console.log(`📊 RSS Cache HIT for r/${subreddit} ${ticker} (age: ${minutesOld} minutes)`);
    return cachedData.data;
  }

  try {
    console.log(`🔍 Fetching RSS for r/${subreddit} searching "${ticker}"...`);
    
    // Fetch RSS feed
    const rssUrl = `https://www.reddit.com/r/${subreddit}/search.rss?q=${ticker}&restrict_sr=1&sort=new&limit=5`;
    const rssResponse = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'ExplainThis-StockAnalysis/1.0 by Creepy-Buy1588'
      }
    });

    if (!rssResponse.ok) {
      console.log(`❌ Failed to fetch RSS from r/${subreddit}: ${rssResponse.status}`);
      return [];
    }

    const rssText = await rssResponse.text();
    const rssData = xmlParser.parse(rssText);
    
    // Handle both RSS and Atom feed formats
    let items = [];
    
    // Check for Atom feed format first (Reddit uses this)
    if (rssData?.feed?.entry) {
      items = Array.isArray(rssData.feed.entry) ? rssData.feed.entry : [rssData.feed.entry];
      console.log(`📊 Found ${items.length} posts in Atom feed for r/${subreddit}`);
    }
    // Fallback to RSS format
    else if (rssData?.rss?.channel?.item) {
      items = Array.isArray(rssData.rss.channel.item) ? rssData.rss.channel.item : [rssData.rss.channel.item];
      console.log(`📊 Found ${items.length} posts in RSS feed for r/${subreddit}`);
    }
    
    if (items.length === 0) {
      console.log(`✅ No posts found in r/${subreddit} feed for ${ticker}`);
      return [];
    }

    // Extract post IDs and fetch details for top 10 posts
    const posts: RedditPost[] = [];
    const limitedItems = items.slice(0, 10);

    for (const item of limitedItems) {
      try {
        // Handle both Atom and RSS formats
        let postId = '';
        let itemTitle = '';
        let itemLink = '';
        
        // Atom feed format (Reddit's format)
        if (item.id && typeof item.id === 'string') {
          // Atom feed: id is usually like "t3_1mdckz0"
          postId = item.id.replace('t3_', '');
          itemTitle = item.title || '';
          itemLink = item.link?.href || item.link || '';
        }
        // RSS format fallback
        else if (item.link) {
          // Extract post ID from link (format: https://www.reddit.com/r/subreddit/comments/postid/title/)
          const linkMatch = item.link.match(/\/comments\/([a-z0-9]+)\//);
          if (linkMatch) {
            postId = linkMatch[1];
            itemTitle = item.title || '';
            itemLink = item.link;
          }
        }
        
        if (!postId) {
          console.log(`⚠️ Could not extract post ID from item`);
          continue;
        }
        
        // Fetch detailed post data
        console.log(`🔍 Fetching details for post ${postId}...`);
        const detailUrl = `https://www.reddit.com/comments/${postId}.json`;
        const detailResponse = await fetch(detailUrl, {
          headers: {
            'User-Agent': 'ExplainThis-StockAnalysis/1.0 by Creepy-Buy1588'
          }
        });

        if (!detailResponse.ok) {
          console.log(`❌ Failed to fetch post details for ${postId}: ${detailResponse.status}`);
          continue;
        }

        const detailData = await detailResponse.json();
        const postData = detailData[0]?.data?.children?.[0]?.data;

        if (postData) {
          posts.push({
            id: postData.id,
            title: postData.title || itemTitle || '',
            selftext: postData.selftext || '',
            ups: postData.ups || 0,
            permalink: postData.permalink || itemLink || '',
            subreddit: postData.subreddit || subreddit,
            created_utc: postData.created_utc || 0
          });
          console.log(`✅ Successfully fetched details for post: "${(postData.title || itemTitle).substring(0, 50)}..."`);
        } else {
          // If detailed fetch fails, use RSS/Atom data
          posts.push({
            id: postId,
            title: itemTitle,
            selftext: '',
            ups: 1, // Default since we don't have upvote data from RSS
            permalink: itemLink,
            subreddit: subreddit,
            created_utc: Math.floor(Date.now() / 1000)
          });
          console.log(`✅ Using RSS data for post: "${itemTitle.substring(0, 50)}..."`);
        }

        // Rate limiting - be very respectful to Reddit (increased delays)
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second between post detail requests
        
      } catch (error) {
        console.error(`Error fetching post details:`, error);
      }
    }

    // Cache the results
    const expiresAt = now + RSS_CACHE_DURATION;
    redditRssCache.set(cacheKey, {
      data: posts,
      timestamp: now,
      expiresAt
    });

    console.log(`💾 Cached ${posts.length} Reddit posts for r/${subreddit} ${ticker} (expires in 2 hours)`);
    return posts;

  } catch (error) {
    console.error(`Error fetching Reddit RSS for r/${subreddit}:`, error);
    return [];
  }
}

// Subreddit configurations with characteristics
const SUBREDDIT_CONFIG = {
  'wallstreetbets': {
    displayName: 'r/WallStreetBets',
    characteristics: ['High Risk', 'YOLO Plays', 'Momentum Trading', 'Options Heavy']
  },
  'investing': {
    displayName: 'r/investing',
    characteristics: ['Long Term', 'Fundamentals', 'Diversified', 'Risk Aware']
  },
  'stocks': {
    displayName: 'r/stocks',
    characteristics: ['General Discussion', 'DD Posts', 'News Focus', 'Balanced Views']
  },
  'StockMarket': {
    displayName: 'r/StockMarket',
    characteristics: ['Market Analysis', 'Technical Focus', 'News Driven', 'Broad Coverage']
  },
  'SecurityAnalysis': {
    displayName: 'r/SecurityAnalysis',
    characteristics: ['Deep Analysis', 'Value Focus', 'Research Heavy', 'Academic']
  },
  'ValueInvesting': {
    displayName: 'r/ValueInvesting',
    characteristics: ['Value Focus', 'Warren Buffett Style', 'Long Term Hold', 'Fundamental Analysis']
  }
};

export async function analyzeSubredditSentiments(ticker: string, forceRefresh: boolean = false): Promise<EnhancedSentimentData> {
  console.log(`🔍 Analyzing subreddit sentiments for ${ticker}...`);
  
  // Check persistent cache first (36 hours) - skip cache if forceRefresh is true
  if (!forceRefresh) {
    const cachedData = await getCachedRedditSentiment(ticker);
    if (cachedData) {
      console.log(`✅ Using cached Reddit sentiment for ${ticker}`);
      return cachedData;
    }
  } else {
    console.log(`🔄 Forcing fresh Reddit sentiment fetch for ${ticker} (refresh requested)`);
  }

  // No cache hit or refresh requested, analyze fresh data
  console.log(`🔍 Fetching fresh Reddit sentiment for ${ticker}...`);

  const results: SubredditSentiment[] = [];

  // Target 3 specific subreddits for comprehensive coverage
  const targetSubreddits = ['wallstreetbets', 'investing', 'stocks'];
  
  // Search each subreddit individually for better coverage
  for (let i = 0; i < targetSubreddits.length; i++) {
    const subreddit = targetSubreddits[i];
    
    try {
      console.log(`🔍 Searching r/${subreddit} for ${ticker}... (${i + 1}/${targetSubreddits.length})`);
      
      const posts = await fetchSubredditPosts(ticker, subreddit);
      
      if (posts.length > 0) {
        console.log(`✅ Found ${posts.length} posts in r/${subreddit}`);
        
        // Analyze sentiment for each post
        const sentiments = posts.map((post) => ({
          title: post.title,
          text: post.selftext || post.title,
          score: post.ups,
          source: 'reddit'
        }));

        // Analyze sentiment for the combined text
        const combinedText = sentiments.map((s) => s.text).join(' ');
        const overallSentiment = analyzeSentimentAdvanced(combinedText);
        const config = SUBREDDIT_CONFIG[subreddit as keyof typeof SUBREDDIT_CONFIG];

        // Convert score to sentiment string
        const sentimentString = overallSentiment.score >= 60 ? 'Bullish' : 
                               overallSentiment.score >= 55 ? 'Slightly Bullish' : 
                               overallSentiment.score >= 45 ? 'Neutral' : 
                               overallSentiment.score >= 40 ? 'Slightly Bearish' : 'Bearish';

        results.push({
          subreddit,
          displayName: config.displayName,
          score: overallSentiment.score,
          sentiment: sentimentString,
          confidence: overallSentiment.confidence,
          postsAnalyzed: posts.length,
          characteristics: config.characteristics,
          posts: posts.slice(0, 3).map((post) => ({
            title: post.title,
            score: post.ups,
            sentiment: overallSentiment.score
          }))
        });
      } else {
        console.log(`✅ Found 0 posts in r/${subreddit}`);
      }

      // Add 5-second delay between subreddit calls (except after the last one)
      if (i < targetSubreddits.length - 1) {
        console.log(`⏱️ Waiting 5 seconds before next subreddit search...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error) {
      console.error(`Error analyzing r/${subreddit}:`, error);
      
      // Still add delay even on error to be respectful
      if (i < targetSubreddits.length - 1) {
        console.log(`⏱️ Waiting 5 seconds before next subreddit search...`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  // Analyze StockTwits sentiment
  let stocktwitsData: StockTwitsSentiment | null = null;
  try {
    console.log(`🔍 Analyzing StockTwits for ${ticker}...`);
    
    const stocktwitsUrl = `https://api.stocktwits.com/api/2/streams/symbol/${ticker}.json`;
    const stocktwitsResponse = await fetch(stocktwitsUrl);
    
    if (stocktwitsResponse.ok) {
      const stocktwitsJson = await stocktwitsResponse.json();
      
      if (stocktwitsJson.messages && stocktwitsJson.messages.length > 0) {
        const messages = stocktwitsJson.messages.slice(0, 20);
        console.log(`✅ Found ${messages.length} StockTwits messages`);
        
        const sentiments = messages.map((message: any) => ({
          title: message.body,
          text: message.body,
          score: 1,
          source: 'stocktwits'
        }));

        const combinedText = sentiments.map((s: any) => s.text).join(' ');
        const overallSentiment = analyzeSentimentAdvanced(combinedText);

        // Convert score to sentiment string
        const sentimentString = overallSentiment.score >= 60 ? 'Bullish' : 
                               overallSentiment.score >= 55 ? 'Slightly Bullish' : 
                               overallSentiment.score >= 45 ? 'Neutral' : 
                               overallSentiment.score >= 40 ? 'Slightly Bearish' : 'Bearish';

        stocktwitsData = {
          platform: 'stocktwits',
          displayName: 'StockTwits',
          score: overallSentiment.score,
          sentiment: sentimentString,
          confidence: overallSentiment.confidence,
          postsAnalyzed: messages.length,
          characteristics: ['Real-time Chat', 'Trader Focus', 'Quick Takes', 'Market Pulse'],
          posts: messages.slice(0, 3).map((message: any) => ({
            title: message.body.substring(0, 100) + (message.body.length > 100 ? '...' : ''),
            score: 1,
            sentiment: overallSentiment.score
          }))
        };
      } else {
        console.log(`✅ Found 0 StockTwits messages`);
      }
    } else {
      console.log(`❌ Failed to fetch StockTwits data: ${stocktwitsResponse.status}`);
    }
  } catch (error) {
    console.error(`Error analyzing StockTwits:`, error);
  }

  // Calculate overall sentiment
  const allScores = results.map(r => r.score);
  if (stocktwitsData) {
    allScores.push(stocktwitsData.score);
  }
  
  // No mock data - only show real Reddit communities with actual mentions
  
  const overallScore = allScores.length > 0 
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 50;

  const overallSentiment = overallScore >= 60 ? 'Bullish' : 
                          overallScore >= 55 ? 'Slightly Bullish' : 
                          overallScore >= 45 ? 'Neutral' : 
                          overallScore >= 40 ? 'Slightly Bearish' : 'Bearish';

  // Calculate total posts analyzed
  const totalPostsAnalyzed = results.reduce((sum, r) => sum + r.postsAnalyzed, 0) + 
                            (stocktwitsData ? stocktwitsData.postsAnalyzed : 0);

  // Generate insights with information about searched communities (reduced to top 3 most active)
  const searchedSubreddits = ['wallstreetbets', 'investing', 'stocks'];
  const insights = [];
  
  if (results.length === 0 && !stocktwitsData) {
    insights.push(`No mentions found across ${searchedSubreddits.length} popular stock subreddits`);
    insights.push(`Searched: ${searchedSubreddits.map(s => `r/${s}`).join(', ')}`);
  } else {
    if (results.length > 0) {
      const foundSubreddits = results.map(r => r.subreddit);
      insights.push(`Found discussions in ${results.length}/${searchedSubreddits.length} Reddit communities`);
      insights.push(`Active in: ${foundSubreddits.map(s => `r/${s}`).join(', ')}`);
      
      // Mention which ones had no mentions if some were missing
      const missingSubreddits = searchedSubreddits.filter(s => !foundSubreddits.includes(s));
      if (missingSubreddits.length > 0 && missingSubreddits.length < searchedSubreddits.length) {
        insights.push(`No mentions in: ${missingSubreddits.map(s => `r/${s}`).join(', ')}`);
      }
    }
    if (stocktwitsData) {
      insights.push(`StockTwits sentiment: ${stocktwitsData.sentiment}`);
    }
    if (overallScore >= 70) {
      insights.push('Strong bullish sentiment detected across social platforms');
    } else if (overallScore <= 30) {
      insights.push('Bearish sentiment detected across social platforms');
    }
  }

  const enhancedData: EnhancedSentimentData = {
    overall: {
      score: overallScore,
      sentiment: overallSentiment,
      confidence: Math.min(90, Math.max(50, (results.length + (stocktwitsData ? 1 : 0)) * 15)),
      postsAnalyzed: totalPostsAnalyzed
    },
    subreddits: results,
    stocktwits: stocktwitsData,
    insights: insights,
    noDataFound: results.length === 0  // True if no Reddit communities have mentions
  };

  // Cache the results persistently for 36 hours
  await setCachedRedditSentiment(ticker, enhancedData);
  
  console.log(`✅ Subreddit sentiment analysis complete for ${ticker}: ${overallScore}% across ${results.length} communities${stocktwitsData ? ' + StockTwits' : ''}`);

  return enhancedData;
}

// Cache management functions
export function getSubredditSentimentCacheStats() {
  const now = Date.now();
  const entries = Array.from(subredditSentimentCache.entries());
  
  return {
    totalEntries: entries.length,
    validEntries: entries.filter(([_, value]) => now < value.expiresAt).length,
    expiredEntries: entries.filter(([_, value]) => now >= value.expiresAt).length,
    cacheSize: JSON.stringify(Array.from(subredditSentimentCache.entries())).length
  };
}

export function cleanupSubredditSentimentCache() {
  const now = Date.now();
  let removedCount = 0;
  
  subredditSentimentCache.forEach((value, key) => {
    if (now >= value.expiresAt) {
      subredditSentimentCache.delete(key);
      removedCount++;
    }
  });
  
  console.log(`🧹 Cleaned up ${removedCount} expired subreddit sentiment cache entries`);
  return removedCount;
}

// Auto cleanup every hour
setInterval(cleanupSubredditSentimentCache, 60 * 60 * 1000);
