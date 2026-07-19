// Sentiment analysis with real Reddit and StockTwits data
// Uses free APIs and word-based sentiment scoring

interface SentimentResult {
  score: number;
  sentiment: string;
  confidence: number;
  postsAnalyzed: number;
}

interface SentimentBreakdown {
  positive: number;
  negative: number;
  neutral: number;
  totalPosts: number;
}

interface SentimentData {
  overall: number;
  sentiment: string;
  confidence: number;
  breakdown: { bullish: number; bearish: number; neutral: number };
  sources: { reddit: number; stocktwits: number };
  postsAnalyzed: number;
  insights: string[];
  noDataFound?: boolean; // Add flag for no data cases
}

// Enhanced sentiment word lists with weights
const positiveWords = [
  // Strong bullish (weight 3)
  { word: 'moon', weight: 3 }, { word: 'rocket', weight: 3 }, { word: 'squeeze', weight: 3 },
  { word: 'breakout', weight: 3 }, { word: 'rally', weight: 3 }, { word: 'surge', weight: 3 },
  
  // Moderate bullish (weight 2)
  { word: 'buy', weight: 2 }, { word: 'bull', weight: 2 }, { word: 'bullish', weight: 2 },
  { word: 'gain', weight: 2 }, { word: 'gains', weight: 2 }, { word: 'growth', weight: 2 },
  { word: 'up', weight: 2 }, { word: 'rise', weight: 2 }, { word: 'strong', weight: 2 },
  
  // Mild bullish (weight 1)
  { word: 'positive', weight: 1 }, { word: 'good', weight: 1 }, { word: 'great', weight: 1 },
  { word: 'excellent', weight: 1 }, { word: 'outperform', weight: 1 }, { word: 'beat', weight: 1 },
  { word: 'exceed', weight: 1 }, { word: 'profit', weight: 1 }, { word: 'revenue', weight: 1 },
  { word: 'earnings', weight: 1 }, { word: 'success', weight: 1 }, { word: 'hold', weight: 1 }
];

const negativeWords = [
  // Strong bearish (weight 3)
  { word: 'crash', weight: 3 }, { word: 'dump', weight: 3 }, { word: 'tank', weight: 3 },
  { word: 'plummet', weight: 3 }, { word: 'collapse', weight: 3 }, { word: 'disaster', weight: 3 },
  
  // Moderate bearish (weight 2)
  { word: 'sell', weight: 2 }, { word: 'bear', weight: 2 }, { word: 'bearish', weight: 2 },
  { word: 'loss', weight: 2 }, { word: 'losses', weight: 2 }, { word: 'decline', weight: 2 },
  { word: 'down', weight: 2 }, { word: 'fall', weight: 2 }, { word: 'weak', weight: 2 },
  
  // Mild bearish (weight 1)
  { word: 'negative', weight: 1 }, { word: 'bad', weight: 1 }, { word: 'poor', weight: 1 },
  { word: 'terrible', weight: 1 }, { word: 'underperform', weight: 1 }, { word: 'miss', weight: 1 },
  { word: 'disappoint', weight: 1 }, { word: 'fail', weight: 1 }, { word: 'drop', weight: 1 }
];

export function analyzeSentimentAdvanced(text: string): { score: number; confidence: number } {
  const words = text.toLowerCase().split(/\s+/);
  let positiveScore = 0;
  let negativeScore = 0;
  let totalSentimentWords = 0;
  
  words.forEach(word => {
    // Remove punctuation
    const cleanWord = word.replace(/[^\w]/g, '');
    
    // Check positive words
    const positiveMatch = positiveWords.find(p => cleanWord.includes(p.word));
    if (positiveMatch) {
      positiveScore += positiveMatch.weight;
      totalSentimentWords++;
    }
    
    // Check negative words
    const negativeMatch = negativeWords.find(n => cleanWord.includes(n.word));
    if (negativeMatch) {
      negativeScore += negativeMatch.weight;
      totalSentimentWords++;
    }
  });
  
  if (totalSentimentWords === 0) {
    return { score: 50, confidence: 20 };
  }
  
  // Calculate sentiment ratio
  const netScore = positiveScore - negativeScore;
  const totalScore = positiveScore + negativeScore;
  
  // Normalize to 0-100 scale
  let normalizedScore;
  if (totalScore === 0) {
    normalizedScore = 50; // Neutral
  } else {
    // Map from -totalScore to +totalScore to 0-100 scale
    normalizedScore = ((netScore / totalScore) + 1) * 50;
  }
  
  // Ensure score is between 0 and 100
  const finalScore = Math.max(0, Math.min(100, Math.round(normalizedScore)));
  
  // Calculate confidence based on number and strength of sentiment words
  const confidence = Math.min(Math.max(totalSentimentWords * 15, 30), 95);
  
  return { 
    score: finalScore, 
    confidence: Math.round(confidence)
  };
}

function getSentimentLabel(score: number): string {
  if (score >= 80) return 'Very Bullish';
  if (score >= 65) return 'Bullish';
  if (score >= 55) return 'Slightly Bullish';
  if (score >= 45) return 'Neutral';
  if (score >= 35) return 'Slightly Bearish';
  if (score >= 20) return 'Bearish';
  return 'Very Bearish';
}

function generateInsights(score: number, confidence: number, sources: { reddit: number; stocktwits: number }, totalPosts: number): string[] {
  const insights: string[] = [];
  
  // Score-based insights
  if (score >= 70) {
    insights.push(`Strong bullish sentiment with ${score}% positive score`);
  } else if (score <= 30) {
    insights.push(`Strong bearish sentiment with ${score}% negative score`);
  } else {
    insights.push(`Mixed sentiment around ${score}%`);
  }
  
  // Confidence insights
  if (confidence >= 80) {
    insights.push(`High confidence analysis (${confidence}%)`);
  } else if (confidence <= 40) {
    insights.push(`Lower confidence due to limited data (${confidence}%)`);
  }
  
  // Source insights
  if (sources.reddit > sources.stocktwits) {
    insights.push(`Primarily driven by Reddit discussions (${sources.reddit} posts)`);
  } else if (sources.stocktwits > sources.reddit) {
    insights.push(`Influenced by StockTwits activity (${sources.stocktwits} posts)`);
  }
  
  // Volume insights
  if (totalPosts < 5) {
    insights.push('Limited social media activity detected');
  } else if (totalPosts > 20) {
    insights.push(`High social media engagement (${totalPosts} posts analyzed)`);
  }
  
  return insights;
}

export function aggregateSentiment(sentiments: Array<{ score: number; confidence: number; source: string }>): SentimentData {
  if (sentiments.length === 0) {
    return {
      overall: 50,
      sentiment: 'Neutral',
      confidence: 0,
      breakdown: { bullish: 0, bearish: 0, neutral: 0 },
      sources: { reddit: 0, stocktwits: 0 },
      postsAnalyzed: 0,
      insights: ['No sentiment data available']
    };
  }

  // Calculate weighted average (higher confidence = more weight)
  const weightedSum = sentiments.reduce((sum, s) => sum + (s.score * s.confidence), 0);
  const totalWeight = sentiments.reduce((sum, s) => sum + s.confidence, 0);
  const avgScore = totalWeight > 0 ? weightedSum / totalWeight : 50;
  
  // Ensure final score is capped at 100
  const finalScore = Math.max(0, Math.min(100, Math.round(avgScore)));
  
  // Calculate confidence (average of all confidences)
  const avgConfidence = Math.round(sentiments.reduce((sum, s) => sum + s.confidence, 0) / sentiments.length);
  
  // Count source breakdown
  const sources = {
    reddit: sentiments.filter(s => s.source === 'reddit').length,
    stocktwits: sentiments.filter(s => s.source === 'stocktwits').length
  };
  
  // Calculate sentiment breakdown
  const bullish = sentiments.filter(s => s.score > 60).length;
  const bearish = sentiments.filter(s => s.score < 40).length;
  const neutral = sentiments.length - bullish - bearish;
  
  const breakdown = {
    bullish: Math.round((bullish / sentiments.length) * 100),
    bearish: Math.round((bearish / sentiments.length) * 100),
    neutral: Math.round((neutral / sentiments.length) * 100)
  };
  
  // Generate insights
  const insights = generateInsights(finalScore, avgConfidence, sources, sentiments.length);
  
  return {
    overall: finalScore,
    sentiment: getSentimentLabel(finalScore),
    confidence: avgConfidence,
    breakdown,
    sources,
    postsAnalyzed: sentiments.length,
    insights
  };
}

// Mock data generators for immediate functionality (keep for fallback)
export function generateMockRedditSentiment(ticker: string): SentimentResult {
  // Simulate some variance based on ticker
  const baseScore = 45 + (ticker.charCodeAt(0) % 30);
  const variance = Math.random() * 20 - 10;
  const score = Math.max(0, Math.min(100, Math.round(baseScore + variance)));
  
  let sentiment: string;
  if (score >= 65) sentiment = "Bullish";
  else if (score >= 55) sentiment = "Slightly Bullish";
  else if (score >= 45) sentiment = "Neutral";
  else if (score >= 35) sentiment = "Slightly Bearish";
  else sentiment = "Bearish";
  
  return { score, sentiment, confidence: 65 + Math.round(Math.random() * 25), postsAnalyzed: 12 };
}

export function generateMockNewsSentiment(ticker: string): SentimentResult {
  // News tends to be more neutral/professional
  const baseScore = 48 + (ticker.charCodeAt(1) % 20);
  const variance = Math.random() * 15 - 7.5;
  const score = Math.max(0, Math.min(100, Math.round(baseScore + variance)));
  
  let sentiment: string;
  if (score >= 60) sentiment = "Positive";
  else if (score >= 52) sentiment = "Slightly Positive";
  else if (score >= 48) sentiment = "Neutral";
  else if (score >= 40) sentiment = "Slightly Negative";
  else sentiment = "Negative";
  
  return { score, sentiment, confidence: 70 + Math.round(Math.random() * 20), postsAnalyzed: 8 };
}

export function generateNoDataSentiment(ticker: string, searchedForums: string[]): SentimentData {
  return {
    overall: 50,
    sentiment: 'No Social Interest Detected',
    confidence: 0,
    breakdown: { bullish: 0, bearish: 0, neutral: 0 },
    sources: { reddit: 0, stocktwits: 0 },
    postsAnalyzed: 0,
    noDataFound: true,
    insights: [
      `No discussions found for ${ticker.toUpperCase()} in major social forums`,
      `Searched: ${searchedForums.join(', ')}`,
      'Limited social media activity may indicate low retail interest',
      'Consider checking institutional sentiment or news coverage instead'
    ]
  };
}
