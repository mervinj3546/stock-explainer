import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { useFastStockData } from "@/hooks/use-fast-stock-data";
import { useYTDData } from "@/hooks/use-ytd-data";
import { useTechnicalIndicators } from "@/hooks/use-technical-indicators";
import { useAuth } from "@/hooks/use-auth";

interface FundamentalsData {
  keyMetrics?: {
    peRatio?: number;
    pegRatio?: number;
  };
  profitability?: {
    roe?: number;
    netMargin?: number;
    grossMargin?: number;
  };
  growth?: {
    revenueGrowth?: {
      ttm?: number;
      threeYear?: number;
    };
    epsGrowth?: {
      ttm?: number;
    };
  };
  financialHealth?: {
    currentRatio?: number;
    debtToEquity?: number;
    interestCoverage?: number;
  };
  dividend?: {
    dividendYield?: number;
    dividendPerShare?: number;
    payoutRatio?: number;
  };
}

interface SentimentData {
  retail?: {
    score?: number;
  };
  professional?: {
    score?: number;
  };
}

interface TechnicalData {
  ema8: number[];
  ema21: number[];
  ema34: number[];
  ema50: number[];
  macd: number[];
  signal: number[];
  histogram: number[];
  rsi: number[];
}

interface OverallSummaryBadgeProps {
  ticker: string;
}

interface TechnicalRecommendation {
  overall: 'strong-buy' | 'buy' | 'neutral' | 'sell' | 'strong-sell';
  confidence: number;
  signals: Array<{
    indicator: string;
    signal: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    reason: string;
  }>;
  summary: string;
}

// Technical analysis logic (simplified from TechnicalRecommendation.tsx)
function analyzeTechnicalData(data: TechnicalData): TechnicalRecommendation {
  if (!data || !data.ema8 || data.ema8.length === 0) {
    return {
      overall: 'neutral',
      confidence: 0,
      signals: [],
      summary: 'Insufficient technical data'
    };
  }

  const latest = data.ema8.length - 1;
  const ema8 = data.ema8[latest];
  const ema21 = data.ema21[latest];
  const ema34 = data.ema34[latest];
  const ema50 = data.ema50[latest];
  const macd = data.macd[latest];
  const signal = data.signal[latest];
  const rsi = data.rsi[latest];

  const signals = [];
  let bullishScore = 0;
  let bearishScore = 0;

  // EMA Analysis
  const perfectOrder = ema8 > ema21 && ema21 > ema34 && ema34 > ema50;
  const reverseOrder = ema50 > ema34 && ema34 > ema21 && ema21 > ema8;
  
  if (perfectOrder) {
    signals.push({
      indicator: 'EMA',
      signal: 'bullish' as const,
      strength: 4,
      reason: 'Perfect EMA alignment (8>21>34>50) - Strong uptrend'
    });
    bullishScore += 4;
  } else if (reverseOrder) {
    signals.push({
      indicator: 'EMA',
      signal: 'bearish' as const,
      strength: 4,
      reason: 'Bearish EMA alignment (50>34>21>8) - Downtrend'
    });
    bearishScore += 4;
  } else {
    signals.push({
      indicator: 'EMA',
      signal: 'neutral' as const,
      strength: 2,
      reason: 'Mixed EMA alignment - No clear trend'
    });
  }

  // MACD Analysis
  const macdAboveSignal = macd > signal;
  if (macdAboveSignal && macd > 0) {
    signals.push({
      indicator: 'MACD',
      signal: 'bullish' as const,
      strength: 3,
      reason: 'MACD above signal line and zero - Positive momentum'
    });
    bullishScore += 3;
  } else if (!macdAboveSignal && macd < 0) {
    signals.push({
      indicator: 'MACD',
      signal: 'bearish' as const,
      strength: 3,
      reason: 'MACD below signal line and zero - Negative momentum'
    });
    bearishScore += 3;
  } else {
    signals.push({
      indicator: 'MACD',
      signal: 'neutral' as const,
      strength: 2,
      reason: 'MACD showing mixed signals'
    });
  }

  // RSI Analysis
  if (rsi >= 30 && rsi <= 50) {
    signals.push({
      indicator: 'RSI',
      signal: 'bullish' as const,
      strength: 3,
      reason: `RSI recovering from oversold (${rsi.toFixed(1)}) - Good entry opportunity`
    });
    bullishScore += 3;
  } else if (rsi > 70) {
    signals.push({
      indicator: 'RSI',
      signal: 'bearish' as const,
      strength: 2,
      reason: `RSI overbought (${rsi.toFixed(1)}) - Potential pullback risk`
    });
    bearishScore += 2;
  } else {
    signals.push({
      indicator: 'RSI',
      signal: 'neutral' as const,
      strength: 2,
      reason: `RSI neutral zone (${rsi.toFixed(1)}) - No clear bias`
    });
  }

  const totalWeight = bullishScore + bearishScore;
  const netScore = totalWeight > 0 ? (bullishScore - bearishScore) / totalWeight : 0;
  const confidence = Math.abs(netScore) * 100;

  // Determine overall recommendation
  let overall: 'strong-buy' | 'buy' | 'neutral' | 'sell' | 'strong-sell';
  let summary: string;

  if (netScore >= 0.6) {
    overall = 'strong-buy';
    summary = 'Strong technical buy signal with multiple confirming indicators';
  } else if (netScore >= 0.3) {
    overall = 'buy';
    summary = 'Bullish technical setup with good risk/reward ratio';
  } else if (netScore >= -0.3) {
    overall = 'neutral';
    summary = 'Mixed technical signals - wait for clearer direction';
  } else if (netScore >= -0.6) {
    overall = 'sell';
    summary = 'Bearish technical setup - consider reducing positions';
  } else {
    overall = 'strong-sell';
    summary = 'Strong technical sell signal - high risk of further decline';
  }

  return {
    overall,
    confidence,
    signals,
    summary
  };
}

function calculateFundamentalsScore(data: FundamentalsData): number {
  if (!data) return 50;

  const roe = data.profitability?.roe || 0;
  const netMargin = data.profitability?.netMargin || 0;
  const grossMargin = data.profitability?.grossMargin || 0;
  const revenueGrowth = data.growth?.revenueGrowth?.ttm || 0;
  const epsGrowth = data.growth?.epsGrowth?.ttm || 0;
  const revenueGrowth3Y = data.growth?.revenueGrowth?.threeYear || 0;
  const peRatio = data.keyMetrics?.peRatio || 0;
  const pegRatio = data.keyMetrics?.pegRatio || 0;
  const currentRatio = data.financialHealth?.currentRatio || 0;
  const debtToEquity = data.financialHealth?.debtToEquity || 0;
  const interestCoverage = data.financialHealth?.interestCoverage || 0;

  let score = 50; // Start neutral

  // Profitability (20 points max)
  if (roe >= 20) score += 8;
  else if (roe >= 15) score += 6;
  else if (roe >= 10) score += 3;
  else if (roe < 5) score -= 5;

  if (netMargin > 15) score += 6;
  else if (netMargin > 5) score += 3;
  else if (netMargin <= 5) score -= 4;

  if (grossMargin > 40) score += 3;
  else if (grossMargin < 20) score -= 3;

  // Growth (15 points max)
  if (revenueGrowth > 10 && epsGrowth > 10) score += 8;
  else if (revenueGrowth > 5) score += 4;
  else if (revenueGrowth < 0) score -= 6;

  if (revenueGrowth3Y > 5) score += 4;
  else if (revenueGrowth3Y < 0) score -= 4;

  // Valuation (10 points max)
  if (peRatio < 15) score += 4;
  else if (peRatio > 30) score -= 4;

  if (pegRatio < 1) score += 4;
  else if (pegRatio > 2) score -= 4;

  // Financial Health (10 points max)
  if (currentRatio >= 1.5 && debtToEquity <= 0.5 && interestCoverage >= 5) {
    score += 8;
  } else if (currentRatio >= 1 && debtToEquity <= 1) {
    score += 4;
  } else {
    score -= 6;
  }

  return Math.max(0, Math.min(100, score));
}

function calculateAIScore(recommendation?: string): number {
  if (!recommendation) return 50; // Neutral if no AI data
  
  // Convert AI recommendation to 0-100 scale
  switch (recommendation.toLowerCase()) {
    case 'bullish':
      return 75; // Strong positive signal
    case 'bearish':
      return 25; // Strong negative signal
    case 'hold':
    case 'neutral':
      return 50; // Neutral signal
    default:
      return 50; // Default to neutral for unknown values
  }
}

function convertTechnicalToScore(technical: TechnicalRecommendation): number {
  switch (technical.overall) {
    case 'strong-buy': return 85;
    case 'buy': return 70;
    case 'neutral': return 50;
    case 'sell': return 30;
    case 'strong-sell': return 15;
    default: return 50;
  }
}

function calculateOverallScore(
  ytdPerformance: number,
  fundamentalsScore: number,
  technicalScore: number,
  sentimentScore: number,
  technicalRecommendation: TechnicalRecommendation
): { score: number; label: string; color: string } {
  // Updated weights without AI Analysis (excluded to reduce costs)
  // Weight: Fundamentals 35%, YTD 25%, Technical 25%, Sentiment 15%
  const weights = {
    ytd: 0.25,
    fundamentals: 0.35,
    technical: 0.25,
    sentiment: 0.15
  };

  // Convert YTD to 0-100 scale
  let ytdScore = 50; // Neutral baseline
  if (ytdPerformance > 20) ytdScore = 80;
  else if (ytdPerformance > 10) ytdScore = 70;
  else if (ytdPerformance > 0) ytdScore = 60;
  else if (ytdPerformance > -10) ytdScore = 40;
  else if (ytdPerformance > -20) ytdScore = 30;
  else ytdScore = 20;

  // Calculate weighted score (excluding AI Analysis)
  let weightedScore = 
    (ytdScore * weights.ytd) +
    (fundamentalsScore * weights.fundamentals) +
    (technicalScore * weights.technical) +
    (sentimentScore * weights.sentiment);

  // Override logic: If technical is strong sell, be more bearish
  if (technicalRecommendation.overall === 'strong-sell') {
    weightedScore = Math.min(weightedScore, 25); // Cap at 25 for strong sell (SELL rating)
  } else if (technicalRecommendation.overall === 'sell') {
    weightedScore = Math.min(weightedScore, 35); // Cap at 35 for sell (SELL rating)
  }
  
  // Additional override: If fundamentals + YTD + technical are all bearish, cap even lower
  const isFundamentalsBearish = fundamentalsScore < 45;
  const isYtdBearish = ytdScore < 45;
  const isTechnicalBearish = technicalScore < 45;
  
  if (isFundamentalsBearish && isYtdBearish && isTechnicalBearish) {
    weightedScore = Math.min(weightedScore, 20); // Force SELL when all core metrics are bearish
  }
  
  // Extra aggressive override for really bad situations (like TSLA)
  if (technicalRecommendation.overall === 'strong-sell' && isFundamentalsBearish && isYtdBearish) {
    weightedScore = Math.min(weightedScore, 15); // Force strong SELL
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(weightedScore)));

  // Determine label and color
  let label: string;
  let color: string;

  if (finalScore >= 75) {
    label = 'STRONG BUY';
    color = 'text-emerald-400 border-emerald-400 bg-emerald-400/10';
  } else if (finalScore >= 60) {
    label = 'BUY';
    color = 'text-bullish border-bullish bg-bullish/10';
  } else if (finalScore >= 45) {
    label = 'HOLD';
    color = 'text-blue-400 border-blue-400 bg-blue-400/10';
  } else if (finalScore >= 30) {
    label = 'WEAK HOLD';
    color = 'text-accent-amber border-accent-amber bg-accent-amber/10';
  } else {
    label = 'SELL';
    color = 'text-bearish border-bearish bg-bearish/10';
  }

  return { score: finalScore, label, color };
}

export function OverallSummaryBadge({ ticker }: OverallSummaryBadgeProps) {
  const { isAuthenticated } = useAuth();
  
  // Always call hooks first, regardless of authentication status
  const { data: fastStockData } = useFastStockData(ticker);
  const { data: ytdData } = useYTDData(ticker);
  const { data: technicalData } = useTechnicalIndicators(ticker);
  
  const { data: fundamentalsData } = useQuery<FundamentalsData>({
    queryKey: ["/api/ticker-data", ticker, "fundamentals", "v2"],
    queryFn: async () => {
      const response = await fetch(`/api/ticker-data/${ticker}/fundamentals?refresh=true`);
      if (!response.ok) throw new Error('Failed to fetch fundamentals');
      const result = await response.json();
      return result.data;
    },
    staleTime: 24 * 60 * 60 * 1000,
    retry: 2,
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  const { data: sentimentData } = useQuery<{ data: SentimentData }>({
    queryKey: ["/api/sentiment", ticker],
    queryFn: async () => {
      const response = await fetch(`/api/sentiment/${ticker}`);
      if (!response.ok) throw new Error('Failed to fetch sentiment');
      return response.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    enabled: isAuthenticated, // Only fetch when authenticated
  });

  // Remove AI analysis query to reduce costs - AI is now excluded from overall score calculation
  
  // For non-authenticated users, show gray badge with tooltip
  if (!isAuthenticated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="text-muted-foreground border-muted-foreground bg-muted-foreground/10 cursor-help font-medium px-3 py-1 text-sm"
          >
            Summary Hidden
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Sign in to see overall recommendation</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Calculate individual scores
  const ytdPerformance = ytdData?.growthPct || 0;
  const fundamentalsScore = fundamentalsData ? calculateFundamentalsScore(fundamentalsData) : 50;
  
  const technicalRecommendation = technicalData ? analyzeTechnicalData(technicalData) : {
    overall: 'neutral' as const,
    confidence: 0,
    signals: [],
    summary: 'No technical data'
  };
  const technicalScore = convertTechnicalToScore(technicalRecommendation);

  // Combine retail and professional sentiment
  const retailScore = (sentimentData?.data?.retail?.score || 50);
  const professionalScore = (sentimentData?.data?.professional?.score || 50);
  const sentimentScore = (retailScore + professionalScore) / 2;

  // AI Analysis is now excluded from calculations to reduce costs
  // const aiScore = calculateAIScore(aiAnalysisData?.sentiment?.recommendation);

  // Calculate overall assessment (excluding AI Analysis)
  const overall = calculateOverallScore(
    ytdPerformance,
    fundamentalsScore,
    technicalScore,
    sentimentScore,
    technicalRecommendation
  );

  // Don't show badge if we don't have enough data (AI Analysis excluded)
  const hasMinimumData = fastStockData && (fundamentalsData || technicalData || sentimentData);
  
  if (!hasMinimumData) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={`${overall.color} font-medium px-3 py-1 text-sm cursor-help`}
        >
          {overall.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-2">
          <p className="font-medium">Overall Score: {overall.score}/100</p>
          <div className="text-xs space-y-1">
            <div>Fundamentals: {fundamentalsScore.toFixed(0)}/100 (35%)</div>
            <div>YTD Performance: {ytdPerformance.toFixed(1)}% (25%)</div>
            <div>Technical: {technicalScore.toFixed(0)}/100 (25%)</div>
            <div>Sentiment: {sentimentScore.toFixed(0)}/100 (15%)</div>
          </div>
          {technicalRecommendation.overall === 'strong-sell' && (
            <p className="text-xs text-red-400">
              ⚠️ Technical analysis shows strong sell signal
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
