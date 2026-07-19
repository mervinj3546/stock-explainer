import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, XCircle, Minus } from "lucide-react";

interface TechnicalData {
  ema8: number[];
  ema21: number[];
  ema34: number[];
  ema50: number[];
  macd: number[];
  signal: number[];
  histogram: number[];
  rsi: number[];
  prices: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

interface Props {
  data: TechnicalData;
  ticker: string;
}

type RecommendationLevel = 'strong-buy' | 'buy' | 'neutral' | 'sell' | 'strong-sell';
type IndicatorSignal = 'bullish' | 'bearish' | 'neutral';

interface TechnicalSignal {
  indicator: string;
  signal: IndicatorSignal;
  strength: number; // 1-5
  reason: string;
}

interface RecommendationResult {
  overall: RecommendationLevel;
  confidence: number; // 0-100
  signals: TechnicalSignal[];
  summary: string;
}

function analyzeEMA(data: TechnicalData): TechnicalSignal {
  const latest = data.ema8.length - 1;
  const ema8 = data.ema8[latest];
  const ema21 = data.ema21[latest];
  const ema34 = data.ema34[latest];
  const ema50 = data.ema50[latest];
  
  // Check trend direction (compare last 5 periods)
  const trendLength = 5;
  const ema8Trend = data.ema8[latest] > data.ema8[latest - trendLength];
  const ema21Trend = data.ema21[latest] > data.ema21[latest - trendLength];
  const ema34Trend = data.ema34[latest] > data.ema34[latest - trendLength];
  const ema50Trend = data.ema50[latest] > data.ema50[latest - trendLength];
  
  const perfectOrder = ema8 > ema21 && ema21 > ema34 && ema34 > ema50;
  const allTrendingUp = ema8Trend && ema21Trend && ema34Trend && ema50Trend;
  const reverseOrder = ema50 > ema34 && ema34 > ema21 && ema21 > ema8;
  const allTrendingDown = !ema8Trend && !ema21Trend && !ema34Trend && !ema50Trend;
  const mostlyBearish = (ema50 > ema34 && ema34 > ema21) || (ema34 > ema21 && ema21 > ema8);
  
  if (perfectOrder && allTrendingUp) {
    return {
      indicator: 'EMA',
      signal: 'bullish',
      strength: 5,
      reason: 'Perfect EMA alignment (8>21>34>50) with all EMAs trending up - Strong uptrend confirmed'
    };
  } else if (perfectOrder) {
    return {
      indicator: 'EMA',
      signal: 'bullish',
      strength: 4,
      reason: 'EMA alignment is bullish (8>21>34>50) but mixed trend directions'
    };
  } else if (reverseOrder && allTrendingDown) {
    return {
      indicator: 'EMA',
      signal: 'bearish',
      strength: 5,
      reason: 'Perfect bearish EMA alignment (50>34>21>8) with all EMAs declining - Strong downtrend confirmed'
    };
  } else if (reverseOrder) {
    return {
      indicator: 'EMA',
      signal: 'bearish',
      strength: 4,
      reason: 'EMA alignment is bearish (50>34>21>8) - Downtrend in progress'
    };
  } else if (mostlyBearish && !allTrendingUp) {
    return {
      indicator: 'EMA',
      signal: 'bearish',
      strength: 3,
      reason: 'EMAs showing bearish structure - Weakness developing'
    };
  } else {
    return {
      indicator: 'EMA',
      signal: 'neutral',
      strength: 2,
      reason: 'EMA alignment is mixed - No clear trend direction'
    };
  }
}

function analyzeMACD(data: TechnicalData): TechnicalSignal {
  const latest = data.macd.length - 1;
  const macd = data.macd[latest];
  const signal = data.signal[latest];
  const histogram = data.histogram[latest];
  const prevHistogram = data.histogram[latest - 1];
  
  const macdAboveSignal = macd > signal;
  const macdAboveZero = macd > 0;
  const histogramIncreasing = histogram > prevHistogram;
  const bullishCrossover = macd > signal && data.macd[latest - 1] <= data.signal[latest - 1];
  const bearishCrossover = macd < signal && data.macd[latest - 1] >= data.signal[latest - 1];
  const macdBelowZero = macd < 0;
  const histogramDecreasing = histogram < prevHistogram;
  
  if (bullishCrossover && macdAboveZero) {
    return {
      indicator: 'MACD',
      signal: 'bullish',
      strength: 5,
      reason: 'Bullish MACD crossover above zero line - Strong momentum building'
    };
  } else if (bullishCrossover) {
    return {
      indicator: 'MACD',
      signal: 'bullish',
      strength: 4,
      reason: 'Bullish MACD crossover - Momentum turning positive'
    };
  } else if (macdAboveSignal && histogramIncreasing && macdAboveZero) {
    return {
      indicator: 'MACD',
      signal: 'bullish',
      strength: 3,
      reason: 'MACD above signal line with increasing momentum above zero'
    };
  } else if (bearishCrossover && macdBelowZero) {
    return {
      indicator: 'MACD',
      signal: 'bearish',
      strength: 5,
      reason: 'Bearish MACD crossover below zero line - Strong downward momentum'
    };
  } else if (bearishCrossover) {
    return {
      indicator: 'MACD',
      signal: 'bearish',
      strength: 4,
      reason: 'Bearish MACD crossover - Momentum turning negative'
    };
  } else if (!macdAboveSignal && histogramDecreasing && macdBelowZero) {
    return {
      indicator: 'MACD',
      signal: 'bearish',
      strength: 4,
      reason: 'MACD below signal line with decreasing momentum below zero'
    };
  } else if (!macdAboveSignal && !histogramIncreasing) {
    return {
      indicator: 'MACD',
      signal: 'bearish',
      strength: 3,
      reason: 'MACD below signal line with decreasing momentum'
    };
  } else {
    return {
      indicator: 'MACD',
      signal: 'neutral',
      strength: 2,
      reason: 'MACD showing mixed signals - No clear momentum direction'
    };
  }
}

function analyzeRSI(data: TechnicalData): TechnicalSignal {
  const latest = data.rsi.length - 1;
  const rsi = data.rsi[latest];
  const prevRSI = data.rsi[latest - 1];
  const rsiTrend = rsi > prevRSI;
  
  // Check for strong momentum recovery
  const rsiMomentum = rsi - prevRSI;
  const strongRecovery = rsi >= 35 && rsi <= 55 && rsiMomentum > 2; // RSI jumping up strongly
  
  if (strongRecovery && rsiTrend) {
    return {
      indicator: 'RSI',
      signal: 'bullish',
      strength: 5,
      reason: `RSI strong momentum recovery (${rsi.toFixed(1)}, +${rsiMomentum.toFixed(1)}) - Excellent entry opportunity`
    };
  } else if (rsi >= 30 && rsi <= 50 && rsiTrend) {
    return {
      indicator: 'RSI',
      signal: 'bullish',
      strength: 4,
      reason: `RSI recovering from oversold (${rsi.toFixed(1)}) - Good entry opportunity`
    };
  } else if (rsi > 50 && rsi <= 65) {
    return {
      indicator: 'RSI',
      signal: 'bullish',
      strength: 4,
      reason: `RSI in strong uptrend zone (${rsi.toFixed(1)}) - Healthy momentum confirmed`
    };
  } else if (rsi > 65 && rsi <= 70) {
    return {
      indicator: 'RSI',
      signal: 'bullish',
      strength: 3,
      reason: `RSI in uptrend zone (${rsi.toFixed(1)}) - Momentum sustained but watch for resistance`
    };
  } else if (rsi > 70 && rsi <= 80) {
    return {
      indicator: 'RSI',
      signal: 'neutral',
      strength: 2,
      reason: `RSI overbought (${rsi.toFixed(1)}) - Potential pullback risk`
    };
  } else if (rsi > 80) {
    return {
      indicator: 'RSI',
      signal: 'bearish',
      strength: 3,
      reason: `RSI severely overbought (${rsi.toFixed(1)}) - High correction risk`
    };
  } else if (rsi < 30 && !rsiTrend) {
    return {
      indicator: 'RSI',
      signal: 'bearish',
      strength: 4,
      reason: `RSI oversold and falling (${rsi.toFixed(1)}) - Continued weakness expected`
    };
  } else if (rsi < 30 && rsiTrend) {
    return {
      indicator: 'RSI',
      signal: 'neutral',
      strength: 2,
      reason: `RSI oversold but recovering (${rsi.toFixed(1)}) - Watch for reversal`
    };
  } else {
    return {
      indicator: 'RSI',
      signal: 'neutral',
      strength: 2,
      reason: `RSI neutral zone (${rsi.toFixed(1)}) - No clear directional bias`
    };
  }
}

function calculateRecommendation(signals: TechnicalSignal[]): RecommendationResult {
  let bullishScore = 0;
  let bearishScore = 0;
  let totalWeight = 0;
  let strongSignals = 0;
  
  signals.forEach(signal => {
    const weight = signal.strength;
    totalWeight += weight;
    
    if (signal.signal === 'bullish') {
      bullishScore += weight;
      // Count signals with strength 4+ as "strong"
      if (signal.strength >= 4) {
        strongSignals++;
      }
    } else if (signal.signal === 'bearish') {
      bearishScore += weight;
    }
  });
  
  const netScore = (bullishScore - bearishScore) / totalWeight;
  const confidence = Math.abs(netScore) * 100;
  
  // Check for STRONG BUY conditions
  const allBullish = signals.every(signal => signal.signal === 'bullish');
  const majorityStrongBullish = strongSignals >= 2; // At least 2 signals with strength 4+
  const perfectScore = netScore >= 0.8; // 80%+ bullish
  
  let overall: RecommendationLevel;
  let summary: string;
  
  if (allBullish && majorityStrongBullish) {
    overall = 'strong-buy';
    summary = 'EXCEPTIONAL BUY OPPORTUNITY - All technical indicators aligned bullishly with strong confirmation signals';
  } else if (perfectScore || (netScore >= 0.6 && strongSignals >= 1)) {
    overall = 'strong-buy';
    summary = 'Strong technical buy signal with multiple high-confidence confirming indicators';
  } else if (netScore >= 0.4) {
    overall = 'buy';
    summary = 'Bullish technical setup with good risk/reward ratio';
  } else if (netScore >= 0.15) {
    overall = 'buy';
    summary = 'Moderate bullish technical setup - consider entry on any dips';
  } else if (netScore >= -0.15) {
    overall = 'neutral';
    summary = 'Mixed technical signals - wait for clearer direction';
  } else if (netScore >= -0.5) {
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

const getRecommendationColor = (level: RecommendationLevel) => {
  switch (level) {
    case 'strong-buy': return 'bg-green-600 text-white';
    case 'buy': return 'bg-green-500 text-white';
    case 'neutral': return 'bg-yellow-500 text-black';
    case 'sell': return 'bg-red-500 text-white';
    case 'strong-sell': return 'bg-red-600 text-white';
  }
};

const getRecommendationIcon = (level: RecommendationLevel) => {
  switch (level) {
    case 'strong-buy': return <TrendingUp className="h-5 w-5" />;
    case 'buy': return <TrendingUp className="h-5 w-5" />;
    case 'neutral': return <Minus className="h-5 w-5" />;
    case 'sell': return <TrendingDown className="h-5 w-5" />;
    case 'strong-sell': return <TrendingDown className="h-5 w-5" />;
  }
};

const getSignalIcon = (signal: IndicatorSignal) => {
  switch (signal) {
    case 'bullish': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'bearish': return <XCircle className="h-4 w-4 text-red-500" />;
    case 'neutral': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  }
};

export function TechnicalRecommendation({ data, ticker }: Props) {
  if (!data || !data.ema8 || data.ema8.length === 0) {
    return (
      <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
        <CardHeader>
          <CardTitle className="text-white">Technical Recommendation</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-[#94A3B8]">Insufficient data for analysis</div>
        </CardContent>
      </Card>
    );
  }

  const emaSignal = analyzeEMA(data);
  const macdSignal = analyzeMACD(data);
  const rsiSignal = analyzeRSI(data);
  
  const recommendation = calculateRecommendation([emaSignal, macdSignal, rsiSignal]);

  return (
    <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Technical Recommendation for {ticker}
          <Badge className={`${getRecommendationColor(recommendation.overall)} flex items-center gap-2`}>
            {getRecommendationIcon(recommendation.overall)}
            {recommendation.overall.toUpperCase().replace('-', ' ')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Summary */}
        <div className="p-4 bg-gradient-to-b from-[#232831] to-[#1E2227] rounded-lg border border-[#2F343B]">
          <div className="text-white font-medium mb-2">Analysis Summary</div>
          <div className="text-[#E5E7EB] text-sm">{recommendation.summary}</div>
          <div className="text-[#94A3B8] text-xs mt-2">
            Confidence: {recommendation.confidence.toFixed(0)}%
          </div>
        </div>

        {/* Individual Signals */}
        <div className="space-y-3">
          <h4 className="text-white font-medium">Technical Signals</h4>
          {recommendation.signals.map((signal, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-gradient-to-b from-[#232831] to-[#1E2227] rounded-lg border border-[#2F343B]">
              <div className="mt-0.5">{getSignalIcon(signal.signal)}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium">{signal.indicator}</span>
                  <Badge variant="outline" className="text-xs">
                    Strength: {signal.strength}/5
                  </Badge>
                </div>
                <div className="text-[#E5E7EB] text-sm">{signal.reason}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
