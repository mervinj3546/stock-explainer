// RSS News fetcher for stock-specific news
// Provides structured news data for Primary Details tab

interface RSSNewsItem {
  headline: string;
  summary: string;
  url: string;
  datetime: number;
  source?: string;
}

// Company name mapping for major stocks to improve filtering
const COMPANY_NAMES: { [ticker: string]: string[] } = {
  'AAPL': ['Apple', 'iPhone', 'iPad', 'Mac', 'iOS'],
  'MSFT': ['Microsoft', 'Windows', 'Office', 'Azure', 'Xbox'],
  'GOOGL': ['Google', 'Alphabet', 'YouTube', 'Android', 'Gmail'],
  'GOOG': ['Google', 'Alphabet', 'YouTube', 'Android', 'Gmail'],
  'AMZN': ['Amazon', 'AWS', 'Prime', 'Alexa'],
  'TSLA': ['Tesla', 'Elon Musk', 'Model S', 'Model 3', 'Model Y', 'Model X', 'Cybertruck'],
  'META': ['Meta', 'Facebook', 'Instagram', 'WhatsApp', 'Metaverse'],
  'NVDA': ['Nvidia', 'GeForce', 'RTX', 'GPU'],
  'NFLX': ['Netflix', 'streaming'],
  'CRM': ['Salesforce'],
  'ORCL': ['Oracle'],
  'ADBE': ['Adobe', 'Photoshop', 'Creative Cloud'],
  'PYPL': ['PayPal'],
  'INTC': ['Intel'],
  'AMD': ['AMD', 'Ryzen', 'Radeon'],
  'CSCO': ['Cisco'],
  'IBM': ['IBM'],
  'QCOM': ['Qualcomm'],
  'TXN': ['Texas Instruments'],
  'AVGO': ['Broadcom'],
  'NOW': ['ServiceNow'],
  'INTU': ['Intuit', 'QuickBooks', 'TurboTax'],
  'UBER': ['Uber'],
  'LYFT': ['Lyft'],
  'SHOP': ['Shopify'],
  'SQ': ['Square', 'Block'],
  'TWTR': ['Twitter'],
  'SNAP': ['Snapchat', 'Snap Inc'],
  'PINS': ['Pinterest'],
  'SPOT': ['Spotify'],
  'ROKU': ['Roku'],
  'ZM': ['Zoom'],
  'DOCU': ['DocuSign'],
  'WORK': ['Slack'],
  'TEAM': ['Atlassian'],
  'OKTA': ['Okta'],
  'SNOW': ['Snowflake'],
  'PLTR': ['Palantir'],
  'RBLX': ['Roblox'],
  'COIN': ['Coinbase'],
  'HOOD': ['Robinhood'],
  // ETFs
  'SPY': ['SPDR S&P 500', 'S&P 500'],
  'QQQ': ['Nasdaq-100', 'QQQ', 'Invesco QQQ'],
  'IWM': ['Russell 2000'],
  'VTI': ['Vanguard Total Stock'],
  'VOO': ['Vanguard S&P 500']
};

// Check if article is relevant to the ticker
function isArticleRelevant(headline: string, summary: string, ticker: string): boolean {
  const tickerUpper = ticker.toUpperCase();
  const searchText = `${headline} ${summary}`.toLowerCase();
  
  // Always include if ticker symbol is mentioned
  if (searchText.includes(tickerUpper.toLowerCase()) || searchText.includes(`$${tickerUpper.toLowerCase()}`)) {
    return true;
  }
  
  // Check for company names and related terms
  const companyTerms = COMPANY_NAMES[tickerUpper] || [];
  for (const term of companyTerms) {
    if (searchText.includes(term.toLowerCase())) {
      return true;
    }
  }
  
  return false;
}

// Parse RSS XML to extract news items with enhanced metadata and filtering
async function parseRSSFeed(rssUrl: string, sourceName: string, ticker: string): Promise<RSSNewsItem[]> {
  try {
    const response = await fetch(rssUrl);
    if (!response.ok) {
      console.log(`Failed to fetch RSS: ${response.status} from ${sourceName}`);
      return [];
    }
    
    const xmlText = await response.text();
    console.log(`📰 Fetched RSS feed from ${sourceName}, length: ${xmlText.length}`);
    
    // Simple XML parsing for RSS items
    const items: RSSNewsItem[] = [];
    const itemMatches = xmlText.match(/<item[^>]*>[\s\S]*?<\/item>/gi);
    
    if (itemMatches) {
      for (const itemXml of itemMatches) {
        // Extract title
        const titleMatch = itemXml.match(/<title[^>]*><!\[CDATA\[(.*?)\]\]><\/title>|<title[^>]*>(.*?)<\/title>/i);
        const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
        
        // Extract description
        const descMatch = itemXml.match(/<description[^>]*><!\[CDATA\[(.*?)\]\]><\/description>|<description[^>]*>(.*?)<\/description>/i);
        const description = descMatch ? (descMatch[1] || descMatch[2] || '').trim() : '';
        
        // Extract link/URL
        const linkMatch = itemXml.match(/<link[^>]*>(.*?)<\/link>/i);
        const link = linkMatch ? linkMatch[1].trim() : '';
        
        // Extract publication date
        const pubDateMatch = itemXml.match(/<pubDate[^>]*>(.*?)<\/pubDate>/i);
        const pubDate = pubDateMatch ? pubDateMatch[1].trim() : '';
        
        if (title) {
          // Filter articles to only include relevant ones
          if (!isArticleRelevant(title, description, ticker)) {
            continue; // Skip irrelevant articles
          }

          // Convert publication date to timestamp
          let timestamp = Date.now() / 1000; // Default to now
          if (pubDate) {
            try {
              const parsedDate = new Date(pubDate);
              timestamp = parsedDate.getTime() / 1000;
            } catch (error) {
              console.log(`Could not parse date: ${pubDate}`);
            }
          }

          items.push({
            headline: title.replace(/<[^>]*>/g, ''), // Strip any remaining HTML
            summary: description.replace(/<[^>]*>/g, ''),
            url: link,
            datetime: timestamp,
            source: sourceName
          });
        }
      }
    }
    
    console.log(`📋 Parsed ${items.length} relevant news items for ${ticker} from ${sourceName}`);
    return items;
  } catch (error) {
    console.error(`Error parsing RSS feed from ${sourceName}:`, error);
    return [];
  }
}

// Fetch financial news from RSS feeds (unlimited, free)
export async function fetchRSSNews(ticker: string): Promise<RSSNewsItem[]> {
  const newsArticles: RSSNewsItem[] = [];
  
  try {
    console.log(`🔍 Fetching RSS news for ${ticker}...`);
    
    // Primary source: Nasdaq RSS feed for the specific symbol
    const nasdaqRssUrl = `https://www.nasdaq.com/feed/rssoutbound?symbol=${ticker.toLowerCase()}`;
    console.log(`📡 Trying Nasdaq RSS: ${nasdaqRssUrl}`);
    
    const nasdaqNews = await parseRSSFeed(nasdaqRssUrl, 'Nasdaq', ticker);
    newsArticles.push(...nasdaqNews);
    
    // Secondary sources: Try Yahoo Finance RSS if available
    const yahooRssUrls = [
      {
        url: `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${ticker.toUpperCase()}&region=US&lang=en-US`,
        name: 'Yahoo Finance'
      },
      {
        url: `https://finance.yahoo.com/rss/headline?s=${ticker.toUpperCase()}`,
        name: 'Yahoo Finance (Alt)'
      }
    ];
    
    for (const { url: rssUrl, name } of yahooRssUrls) {
      try {
        console.log(`📡 Trying ${name}: ${rssUrl}`);
        const additionalNews = await parseRSSFeed(rssUrl, name, ticker);
        newsArticles.push(...additionalNews);
      } catch (error) {
        console.log(`❌ Could not fetch from ${name}`);
      }
    }

    // Remove duplicates based on headline similarity
    const uniqueNews = newsArticles.filter((article, index, array) => {
      return array.findIndex(a => 
        a.headline.toLowerCase().trim() === article.headline.toLowerCase().trim()
      ) === index;
    });

    // Sort by publication date (newest first)
    uniqueNews.sort((a, b) => b.datetime - a.datetime);

    console.log(`✅ Fetched ${uniqueNews.length} unique news articles for ${ticker} from RSS feeds`);
    return uniqueNews.slice(0, 20); // Limit to 20 most recent articles

  } catch (error) {
    console.error(`❌ Error fetching RSS news for ${ticker}:`, error);
    return [];
  }
}

export type { RSSNewsItem };
