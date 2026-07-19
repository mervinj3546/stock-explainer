import React, { useState, useEffect } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Brain, TrendingUp, Calendar, AlertTriangle, Crown, Zap } from "lucide-react";

interface AIAnalysisData {
  companyOverview: string;
  catalysts: {
    positive: string[];
    negative: string[];
  };
  technicalAnalysis: {
    shortTerm: string;
    mediumTerm: string;
  };
  events: {
    nextEarnings: string;
    analystActivity: string;
  };
  sentiment: {
    summary: string;
    recommendation: 'Bullish' | 'Bearish' | 'Hold';
  };
  rawResponse: string;
  lastUpdated: string;
}

interface AIAnalysisProps {
  ticker: string;
}

class PremiumRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PremiumRequiredError';
  }
}

export function AIAnalysis({ ticker }: AIAnalysisProps) {
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [showMinimumLoading, setShowMinimumLoading] = useState(false);

  const { data: aiData, isLoading, error } = useQuery<{ success: boolean; data: AIAnalysisData; ticker: string }>({
    queryKey: ["/api/ai-analysis", ticker],
    queryFn: async () => {
      const response = await fetch(`/api/ai-analysis/${ticker}`);
      if (response.status === 403) {
        throw new PremiumRequiredError('Premium subscription required for AI analysis');
      }
      if (!response.ok) {
        throw new Error('Failed to fetch AI analysis');
      }
      return response.json();
    },
    staleTime: 16 * 60 * 60 * 1000, // 16 hours
    retry: (failureCount, error) => {
      // Don't retry premium required errors
      if (error instanceof PremiumRequiredError) return false;
      return failureCount < 1;
    },
  });

  // Show loading for 5 seconds on first load to give impression of fresh analysis
  useEffect(() => {
    if (isFirstLoad && !isLoading && aiData) {
      setShowMinimumLoading(true);
      const timer = setTimeout(() => {
        setShowMinimumLoading(false);
        setIsFirstLoad(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isFirstLoad, isLoading, aiData]);

  // Reset first load state when ticker changes
  useEffect(() => {
    setIsFirstLoad(true);
    setShowMinimumLoading(false);
  }, [ticker]);

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'Bullish': return 'text-bullish border-bullish bg-bullish/10';
      case 'Bearish': return 'text-bearish border-bearish bg-bearish/10';
      default: return 'text-blue-400 border-blue-400 bg-blue-400/10';
    }
  };

  if (isLoading || showMinimumLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Generating AI analysis...</span>
        </div>
      </div>
    );
  }

  if (error || !aiData?.success) {
    // Handle premium required error with upgrade prompt
    if (error instanceof PremiumRequiredError) {
      return (
        <Card className="bg-[#1E2227] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/10 via-transparent to-accent-blue/10" />
          <CardContent className="py-12 relative">
            <div className="text-center">
              <div className="relative mb-6">
                <Crown className="h-16 w-16 mx-auto text-accent-purple drop-shadow-lg" />
                <Zap className="h-6 w-6 absolute -top-1 -right-1 text-accent-amber animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                AI Analysis - Premium Feature
              </h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Get deep AI-powered insights, market analysis, and investment recommendations powered by advanced language models.
              </p>
              <div className="mb-6">
                <div className="inline-flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Brain className="h-4 w-4 text-accent-purple" />
                    <span>AI Analysis</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <TrendingUp className="h-4 w-4 text-accent-blue" />
                    <span>Market Insights</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4 text-accent-amber" />
                    <span>Investment Outlook</span>
                  </div>
                </div>
              </div>
              <Button 
                className="bg-gradient-to-r from-accent-purple to-accent-blue hover:from-accent-purple/90 hover:to-accent-blue/90 text-white font-medium px-8 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                onClick={() => window.location.href = '/pricing'}
              >
                <Crown className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                Cancel anytime
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Handle other errors
    return (
      <Card className="bg-[#1E2227] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-accent-amber" />
            <p className="text-lg font-medium mb-2">AI Analysis Temporarily Unavailable</p>
            <p className="text-sm">Please try again in a few moments.</p>
            {error && (
              <p className="text-xs text-red-400 mt-2">
                Error: {error instanceof Error ? error.message : 'Unknown error'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const analysis = aiData.data;

  return (
    <div className="space-y-6">
      {/* Company Overview */}
      <Card className="bg-[#1E2227] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center">
            <Brain className="h-5 w-5 mr-2 text-accent-purple" />
            Company Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-card-foreground text-sm leading-relaxed">
            {analysis.companyOverview}
          </p>
        </CardContent>
      </Card>

      {/* Final Assessment - Moved here for immediate visibility */}
      <Card className="bg-[#1E2227] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center justify-between">
            <span className="flex items-center">
              🎯 Final Assessment
            </span>
            <Badge 
              variant="outline" 
              className={`${getRecommendationColor(analysis.sentiment.recommendation)} font-medium px-3 py-1`}
            >
              {analysis.sentiment.recommendation}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-card-foreground text-sm leading-relaxed">
            {analysis.sentiment.summary}
          </p>
        </CardContent>
      </Card>

      {/* News & Catalysts */}
      <Card className="bg-[#1E2227] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-accent-blue" />
            News & Catalysts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Positive Catalysts */}
            <div className="space-y-3">
              <h4 className="text-bullish font-semibold flex items-center">
                📈 Positive Catalysts
              </h4>
              {analysis.catalysts.positive.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.catalysts.positive.map((catalyst, index) => (
                    <li key={index} className="text-card-foreground text-sm flex items-start">
                      <span className="text-bullish mr-2 mt-1">•</span>
                      <span>{catalyst}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No major positive catalysts identified.</p>
              )}
            </div>

            {/* Negative Factors */}
            <div className="space-y-3">
              <h4 className="text-bearish font-semibold flex items-center">
                📉 Headwinds
              </h4>
              {analysis.catalysts.negative.length > 0 ? (
                <ul className="space-y-2">
                  {analysis.catalysts.negative.map((headwind, index) => (
                    <li key={index} className="text-card-foreground text-sm flex items-start">
                      <span className="text-bearish mr-2 mt-1">•</span>
                      <span>{headwind}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No major headwinds identified.</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Technical Analysis */}
      <Card className="bg-[#1E2227] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center">
            📊 Technical Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-accent-blue/20 to-primary/20 p-4 rounded-lg border border-accent-blue/20">
              <h4 className="text-accent-blue font-semibold mb-2">Short Term (1 Week - 1 Month)</h4>
              <p className="text-card-foreground text-sm leading-relaxed">
                {analysis.technicalAnalysis.shortTerm}
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-primary/20 to-accent-purple/20 p-4 rounded-lg border border-primary/20">
              <h4 className="text-primary font-semibold mb-2">Medium Term (1-6 Months)</h4>
              <p className="text-card-foreground text-sm leading-relaxed">
                {analysis.technicalAnalysis.mediumTerm}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events & Sentiment */}
      <Card className="bg-[#1E2227] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
        <CardHeader>
          <CardTitle className="text-foreground flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-accent-amber" />
            Events & Market Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-accent-amber/20 to-accent-teal/20 p-4 rounded-lg border border-accent-amber/20">
              <h4 className="text-accent-amber font-semibold mb-2">📅 Upcoming Events</h4>
              <p className="text-card-foreground text-sm leading-relaxed">
                {analysis.events.nextEarnings}
              </p>
            </div>
            
            <div className="bg-gradient-to-r from-accent-teal/20 to-accent-purple/20 p-4 rounded-lg border border-accent-teal/20">
              <h4 className="text-accent-teal font-semibold mb-2">🏦 Analyst Activity</h4>
              <p className="text-card-foreground text-sm leading-relaxed">
                {analysis.events.analystActivity}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
