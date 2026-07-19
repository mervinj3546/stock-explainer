import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, TrendingUp, TrendingDown, Building2, DollarSign, BarChart3, Shield, Calculator, PieChart, Activity, Target, Gift, Loader2 } from "lucide-react";
import { useFastStockData } from "@/hooks/use-fast-stock-data";
import { useYTDData } from "@/hooks/use-ytd-data";
import { useQuery } from "@tanstack/react-query";

interface BeginnerFundamentalsProps {
  ticker: string;
}

interface FundamentalsData {
  // New comprehensive API structure
  keyMetrics?: {
    peRatio: number;
    forwardPE: number;
    pegRatio: number;
    marketCap: string | null;
    enterpriseValue: string | null;
    revenue: string | null;
    bookValuePerShare: number;
    cashPerShare: number;
    beta: number;
  };
  profitability?: {
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    roe: number;
    roa: number;
    roi: number;
  };
  financialHealth?: {
    debtToEquity: number;
    longTermDebtToEquity: number;
    currentRatio: number;
    quickRatio: number;
    interestCoverage: number;
    assetTurnover: number;
  };
  growth?: {
    revenueGrowth: {
      ttm: number;
      quarterly: number;
      threeYear: number;
      fiveYear: number;
    };
    epsGrowth: {
      ttm: number;
      quarterly: number;
      threeYear: number;
      fiveYear: number;
    };
    bookValueGrowth: number;
    ebitdaGrowth: number;
  };
  valuation?: {
    priceToBook: number;
    priceToSales: number;
    priceToEarnings: number;
    priceToFreeCashFlow: number;
    evToEbitda: number;
  };
  dividend?: {
    dividendYield: number;
    dividendPerShare: number;
    payoutRatio: number;
    dividendGrowth5Y: number;
  };
  performance?: {
    weekHigh52: number;
    weekLow52: number;
    weekReturn52: number;
    weekReturn13: number;
    ytdReturn: number;
    monthToDateReturn: number;
  };
  // Old mock data structure (for backwards compatibility)
  pe_ratio?: number;
  market_cap?: number;
  revenue?: number;
  profit_margin?: number;
}

// Helper function to format large numbers
const formatLargeNumber = (num: number | string | null): string => {
  if (!num || num === 'N/A') return 'N/A';
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return 'N/A';
  
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
};

// Helper function to get color based on value
const getGrowthColor = (value: number | string | null): string => {
  if (!value || value === 'N/A') return 'text-muted-foreground';
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return 'text-muted-foreground';
  return n >= 0 ? 'text-bullish' : 'text-bearish';
};

// Helper function to get ratio assessment
const getRatioAssessment = (ratio: number | string | null, type: 'pe' | 'current' | 'debt'): { color: string, label: string } => {
  if (ratio === null || ratio === undefined || ratio === 'N/A') return { color: 'text-muted-foreground', label: 'Unknown' };
  const n = typeof ratio === 'string' ? parseFloat(ratio) : ratio;
  if (isNaN(n)) return { color: 'text-muted-foreground', label: 'Unknown' };
  
  switch (type) {
    case 'pe':
      if (n <= 0) return { color: 'text-muted-foreground', label: 'N/A' }; // Handle negative or zero PE
      if (n < 15) return { color: 'text-bullish', label: 'Good Value' };
      if (n < 25) return { color: 'text-accent-amber', label: 'Fair Value' };
      return { color: 'text-bearish', label: 'Expensive' };
    
    case 'current':
      if (n >= 2) return { color: 'text-bullish', label: 'Very Strong' };
      if (n >= 1.5) return { color: 'text-primary', label: 'Strong' };
      if (n >= 1) return { color: 'text-accent-amber', label: 'Adequate' };
      return { color: 'text-bearish', label: 'Weak' };
    
    case 'debt':
      if (n <= 0.3) return { color: 'text-bullish', label: 'Low Debt' };
      if (n <= 0.6) return { color: 'text-accent-amber', label: 'Moderate Debt' };
      return { color: 'text-bearish', label: 'High Debt' };
    
    default:
      return { color: 'text-muted-foreground', label: 'Unknown' };
  }
};

// Helper function to generate section summaries based on metric thresholds
const getSectionSummary = (sectionName: string, metrics: any): string => {
  switch (sectionName) {
    case 'company-overview':
      const peRatio = metrics?.keyMetrics?.peRatio || 0;
      const marketCap = metrics?.keyMetrics?.marketCap || 'N/A';
      
      let valuationMsg = '';
      if (peRatio < 15) valuationMsg = 'appears attractively valued';
      else if (peRatio < 30) valuationMsg = 'shows fair valuation';
      else valuationMsg = 'looks expensive based on P/E ratio';
      
      const sizeMsg = marketCap && marketCap !== 'N/A' ? 'This is a large-cap company that' : 'This company';
      
      return `${sizeMsg} ${valuationMsg} with current metrics suggesting ${peRatio < 20 ? 'potential value' : 'premium pricing'}.`;
    
    case 'profitability':
      const roe = metrics?.profitability?.roe || 0;
      const netMargin = metrics?.profitability?.netMargin || 0;
      
      let profitabilityLevel = '';
      let marginLevel = '';
      
      if (roe > 15) profitabilityLevel = 'highly profitable with strong ROE';
      else if (roe > 5) profitabilityLevel = 'moderately profitable';
      else profitabilityLevel = 'showing weak profitability';
      
      if (netMargin > 15) marginLevel = 'excellent profit margins';
      else if (netMargin > 5) marginLevel = 'decent margins';
      else marginLevel = 'thin profit margins';
      
      return `The company is ${profitabilityLevel} and maintains ${marginLevel}.`;
    
    case 'growth':
      const revenueGrowth = metrics?.growth?.revenueGrowth?.ttm || 0;
      const epsGrowth = metrics?.growth?.epsGrowth?.ttm || 0;
      
      let growthAssessment = '';
      if (revenueGrowth > 10 && epsGrowth > 10) {
        growthAssessment = 'Strong revenue and earnings growth indicate robust business expansion';
      } else if (revenueGrowth > 0 && epsGrowth > 0) {
        growthAssessment = 'Moderate growth in both revenue and earnings shows steady progress';
      } else if (revenueGrowth < 0 || epsGrowth < 0) {
        growthAssessment = 'Declining revenue or earnings growth may limit future upside potential';
      } else {
        growthAssessment = 'Mixed growth signals require careful monitoring of business trends';
      }
      
      return `${growthAssessment}.`;
    
    case 'financial-health':
      const debtToEquity = metrics?.financialHealth?.debtToEquity || 0;
      const currentRatio = metrics?.financialHealth?.currentRatio || 0;
      const interestCoverage = metrics?.financialHealth?.interestCoverage || 0;
      
      let debtMsg = '';
      let liquidityMsg = '';
      
      if (debtToEquity < 0.5) debtMsg = 'maintains conservative debt levels';
      else if (debtToEquity < 1) debtMsg = 'has moderate debt levels';
      else debtMsg = 'carries high debt burden';
      
      if (currentRatio >= 1.5) liquidityMsg = 'strong liquidity position';
      else if (currentRatio >= 1) liquidityMsg = 'adequate liquidity';
      else liquidityMsg = 'potential liquidity concerns';
      
      const coverageMsg = interestCoverage > 5 ? 'and can easily service debt payments' : 
                         interestCoverage > 2 ? 'with reasonable debt service capability' : 
                         'but may struggle with debt payments';
      
      return `The company ${debtMsg} with ${liquidityMsg} ${coverageMsg}.`;
    
    case 'multi-growth':
      const revenue3Y = metrics?.growth?.revenueGrowth?.threeYear || 0;
      const revenue5Y = metrics?.growth?.revenueGrowth?.fiveYear || 0;
      const eps3Y = metrics?.growth?.epsGrowth?.threeYear || 0;
      
      let consistencyMsg = '';
      if (revenue3Y > 5 && revenue5Y > 5 && eps3Y > 5) {
        consistencyMsg = 'Consistent multi-year growth trends demonstrate strong business fundamentals';
      } else if (revenue3Y > 0 && revenue5Y > 0) {
        consistencyMsg = 'Long-term growth trends show steady business development over time';
      } else {
        consistencyMsg = 'Historical growth patterns suggest business challenges or cyclical trends';
      }
      
      return `${consistencyMsg}.`;
    
    case 'enhanced-metrics':
      const pegRatio = metrics?.keyMetrics?.pegRatio || 0;
      const beta = metrics?.keyMetrics?.beta || 0;
      const forwardPE = metrics?.keyMetrics?.forwardPE || 0;
      
      let valueMsg = '';
      let riskMsg = '';
      
      if (pegRatio < 1) valueMsg = 'appears undervalued relative to growth prospects';
      else if (pegRatio < 1.5) valueMsg = 'shows fair value considering growth';
      else valueMsg = 'may be overvalued given growth expectations';
      
      if (beta < 1) riskMsg = 'with lower volatility than market average';
      else if (beta < 1.5) riskMsg = 'with moderate market risk';
      else riskMsg = 'with higher volatility than typical stocks';
      
      return `Advanced metrics suggest the stock ${valueMsg} ${riskMsg}.`;
    
    case 'dividend':
      const dividendYield = metrics?.dividend?.dividendYield || 0;
      const payoutRatio = metrics?.dividend?.payoutRatio || 0;
      const dividendGrowth = metrics?.dividend?.dividendGrowth5Y || 0;
      
      let yieldMsg = '';
      let sustainabilityMsg = '';
      
      if (dividendYield > 4) yieldMsg = 'offers attractive dividend yield';
      else if (dividendYield > 2) yieldMsg = 'provides decent dividend income';
      else yieldMsg = 'offers modest dividend yield';
      
      if (payoutRatio < 50) sustainabilityMsg = 'with very sustainable payout levels';
      else if (payoutRatio < 70) sustainabilityMsg = 'with reasonable payout sustainability';
      else sustainabilityMsg = 'but payout ratio may be stretched';
      
      const growthMsg = dividendGrowth > 5 ? ' and growing dividend payments' : 
                       dividendGrowth > 0 ? ' with stable dividend history' : 
                       ' though dividend growth is limited';
      
      return `The company ${yieldMsg} ${sustainabilityMsg}${growthMsg}.`;
    
    default:
      return 'Analysis of key financial metrics provides insights into company performance.';
  }
};

export function BeginnerFundamentals({ ticker }: BeginnerFundamentalsProps) {
  // Real-time price data (fetched fresh every 2 minutes)
  const { data: fastStockData, isLoading: fastLoading, error: fastError } = useFastStockData(ticker);
  
  // YTD data (async loading with separate cache)
  const { data: ytdData } = useYTDData(ticker);
  
  // Fundamentals data (cached 24 hours, shared across ALL users for same ticker)
  const { data: fundamentalsData, isLoading: fundamentalsLoading, error: fundamentalsError } = useQuery<FundamentalsData>({
    queryKey: ["/api/ticker-data", ticker, "fundamentals", "v2"], // Added v2 to force cache refresh
    queryFn: async () => {
      const response = await fetch(`/api/ticker-data/${ticker}/fundamentals?refresh=true`); // Force refresh to get fresh data
      if (!response.ok) throw new Error('Failed to fetch fundamentals');
      const result = await response.json();
      console.log('Full API response:', result);
      console.log('Extracted data:', result.data);
      // The API returns { data: { keyMetrics: {...}, growth: {...}, financialHealth: {...} } }
      // So we need to extract the nested data property
      return result.data;
    },
    staleTime: 24 * 60 * 60 * 1000, // Cache for 24 hours on client side too
    retry: 2,
  });

  if (fastLoading || fundamentalsLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-card border-border">
            <CardHeader>
              <div className="h-6 w-32 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-4 w-full bg-muted rounded animate-pulse"></div>
                <div className="h-4 w-3/4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 w-1/2 bg-muted rounded animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (fastError || fundamentalsError || !fundamentalsData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Unable to load fundamentals data</p>
          <p className="text-sm text-muted-foreground">
            {fundamentalsError?.message || fastError?.message || "Data not available"}
          </p>
        </div>
      </div>
    );
  }

  // Use data from APIs with safe access - handle both new and old data structures
  console.log('Debug - Loading states:', { 
    stockLoading: fastLoading,
    fundamentalsLoading,
    stockError: fastError,
    fundamentalsError,
    fundamentalsData 
  });
  console.log('fundamentalsData:', fundamentalsData); // Debug log
  console.log('Type of fundamentalsData:', typeof fundamentalsData);
  console.log('fundamentalsData keys:', fundamentalsData ? Object.keys(fundamentalsData) : 'undefined');
  
  // Cast to any to avoid TypeScript issues for now
  const apiData = fundamentalsData as any;
  
  // Debug: Log generated summaries
  console.log('Summary test:', {
    'company-overview': getSectionSummary('company-overview', apiData),
    'profitability': getSectionSummary('profitability', apiData),
    'growth': getSectionSummary('growth', apiData),
    'dividend': getSectionSummary('dividend', apiData)
  });
  
  const fundamentals = {
    // Market Cap - use string directly from API
    marketCapString: fundamentalsData?.keyMetrics?.marketCap || 'N/A',
    
    // PE Ratio - try new structure first, then old
    peRatio: fundamentalsData?.keyMetrics?.peRatio || fundamentalsData?.pe_ratio || 0,
    
    // Revenue - use string directly from API  
    revenueString: fundamentalsData?.keyMetrics?.revenue || 'N/A',
    
    // Profit Margin - use old structure if available, otherwise estimate from growth
    profitMargin: fundamentalsData?.profit_margin 
      ? fundamentalsData.profit_margin * 100 // Convert decimal to percentage (0.25 -> 25)
      : (fundamentalsData?.growth?.revenueGrowth?.ttm && fundamentalsData.growth.revenueGrowth.ttm > 0 ? 15.5 : 0),
    
    // Stock data
    ytdPerformance: ytdData?.growthPct || 0,
    yearHigh: ytdData?.yearHigh || 0,
    yearLow: ytdData?.yearLow || 0,
    currentPrice: fastStockData?.quote?.c || 0,
  };
  
  console.log('processed fundamentals:', fundamentals); // Debug log

  const peAssessment = getRatioAssessment(apiData?.keyMetrics?.peRatio || null, 'pe');

  // Generate overall assessment
  const getOverallAssessment = () => {
    const peRatio = apiData?.keyMetrics?.peRatio || 0;
    const pegRatio = apiData?.keyMetrics?.pegRatio || 0;
    const roe = apiData?.profitability?.roe || 0;
    const netMargin = apiData?.profitability?.netMargin || 0;
    const grossMargin = apiData?.profitability?.grossMargin || 0;
    const revenueGrowth = fundamentalsData?.growth?.revenueGrowth?.ttm || 0;
    const epsGrowth = fundamentalsData?.growth?.epsGrowth?.ttm || 0;
    const revenueGrowth3Y = fundamentalsData?.growth?.revenueGrowth?.threeYear || 0;
    const currentRatio = apiData?.financialHealth?.currentRatio || 0;
    const debtToEquity = apiData?.financialHealth?.debtToEquity || 0;
    const interestCoverage = apiData?.financialHealth?.interestCoverage || 0;
    const dividendYield = apiData?.dividend?.dividendYield || 0;
    const dividendPerShare = apiData?.dividend?.dividendPerShare || 0;
    const payoutRatio = apiData?.dividend?.payoutRatio || 0;
    
    let positives = [];
    let concerns = [];
    let overall = "Mixed";
    let overallColor = "text-yellow-500";
    
    // Profitability Analysis
    if (roe >= 20) positives.push("Excellent return on equity (ROE ≥20%)");
    else if (roe >= 15) positives.push("Strong profitability (ROE ≥15%)");
    else if (roe < 10) concerns.push("Low return on equity (<10%)");
    
    if (netMargin > 15) positives.push("High profit margins (>15%)");
    else if (netMargin > 5) positives.push("Decent profit margins");
    else if (netMargin <= 5) concerns.push("Thin profit margins (≤5%)");
    
    if (grossMargin > 40) positives.push("Strong gross margins");
    else if (grossMargin < 20) concerns.push("Low gross margins");
    
    // Growth Analysis
    if (revenueGrowth > 10 && epsGrowth > 10) positives.push("Strong revenue & earnings growth (>10%)");
    else if (revenueGrowth > 5) positives.push("Growing revenue");
    else if (revenueGrowth < 0) concerns.push("Declining revenue");
    
    if (epsGrowth > 10) positives.push("Strong earnings growth (>10%)");
    else if (epsGrowth < -5) concerns.push("Declining earnings");
    
    if (revenueGrowth3Y > 5) positives.push("Consistent 3-year growth");
    else if (revenueGrowth3Y < 0) concerns.push("Declining 3-year trend");
    
    // Valuation Analysis
    if (peRatio < 15) positives.push("Good value (P/E <15)");
    else if (peRatio > 30) concerns.push("Expensive valuation (P/E >30)");
    
    if (pegRatio < 1) positives.push("Undervalued growth (PEG <1.0)");
    else if (pegRatio > 2) concerns.push("Expensive for growth (PEG >2.0)");
    
    // Financial Health
    if (currentRatio >= 1.5 && debtToEquity <= 0.5 && interestCoverage >= 5) {
      positives.push("Excellent financial health");
    } else if (currentRatio >= 1 && debtToEquity <= 1) {
      positives.push("Good financial stability");
    } else {
      concerns.push("Financial health concerns");
    }
    
    if (interestCoverage > 10) positives.push("Strong debt coverage");
    else if (interestCoverage < 2) concerns.push("Weak interest coverage");
    
    // Dividend Analysis (if applicable)
    if (dividendYield > 0 || dividendPerShare > 0) {
      if ((dividendYield >= 2 || dividendPerShare >= 1) && payoutRatio < 60) {
        positives.push("High-quality dividend");
      } else if (payoutRatio > 80) {
        concerns.push("Unsustainable dividend payout");
      }
    }
    
    // Determine overall assessment based on weighted scoring
    const positiveScore = positives.length;
    const concernScore = concerns.length;
    
    if (positiveScore >= 5 && concernScore <= 1) {
      overall = "Excellent Fundamentals";
      overallColor = "text-emerald-500";
    } else if (positiveScore >= 4 && concernScore <= 2) {
      overall = "Strong Fundamentals";
      overallColor = "text-green-500";
    } else if (positiveScore >= 3 && concernScore <= 3) {
      overall = "Good Fundamentals";
      overallColor = "text-blue-500";
    } else if (positiveScore >= 2 && concernScore <= 4) {
      overall = "Mixed Fundamentals";
      overallColor = "text-yellow-500";
    } else if (concernScore >= 4) {
      overall = "Weak Fundamentals";
      overallColor = "text-red-500";
    } else {
      overall = "Concerning Fundamentals";
      overallColor = "text-orange-500";
    }
    
    return { overall, overallColor, positives, concerns };
  };

  const assessment = getOverallAssessment();

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-foreground">Fundamentals Made Simple</h2>
          <div className="text-muted-foreground text-sm">Perfect for beginners</div>
        </div>

        {/* Summary Card */}
        <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Quick Summary
              </CardTitle>
              <Badge variant="outline" className={`${
                assessment.positives.length >= 5 && assessment.concerns.length <= 1 ? 'text-emerald-400 border-emerald-400 bg-emerald-400/10' :
                assessment.positives.length >= 4 && assessment.concerns.length <= 2 ? 'text-bullish border-bullish bg-bullish/10' :
                assessment.positives.length >= 3 && assessment.concerns.length <= 3 ? 'text-blue-400 border-blue-400 bg-blue-400/10' :
                assessment.positives.length >= 2 && assessment.concerns.length <= 4 ? 'text-accent-amber border-accent-amber bg-accent-amber/10' :
                'text-bearish border-bearish bg-bearish/10'
              } flex-shrink-0 font-medium px-3 py-1`}>
                {assessment.positives.length >= 5 && assessment.concerns.length <= 1 ? 'STRONG BUY' :
                 assessment.positives.length >= 4 && assessment.concerns.length <= 2 ? 'BUY' :
                 assessment.positives.length >= 3 && assessment.concerns.length <= 3 ? 'HOLD' :
                 assessment.positives.length >= 2 && assessment.concerns.length <= 4 ? 'WEAK HOLD' :
                 'SELL'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-start">
                <Badge variant="outline" className={`${assessment.overallColor} border-current`}>
                  {assessment.overall}
                </Badge>
              </div>
              
              {assessment.positives.length > 0 && (
                <div>
                  <h4 className="text-bullish font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Strengths
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {assessment.positives.map((positive, index) => (
                      <div key={index} className="bg-bullish/10 border border-bullish/20 rounded-lg px-3 py-1 text-card-foreground text-sm flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-bullish rounded-full"></div>
                        {positive}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {assessment.concerns.length > 0 && (
                <div>
                  <h4 className="text-bearish font-medium mb-2 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4" />
                    Areas of Concern
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {assessment.concerns.map((concern, index) => (
                      <div key={index} className="bg-bearish/10 border border-bearish/20 rounded-lg px-3 py-1 text-card-foreground text-sm flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-bearish rounded-full"></div>
                        {concern}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Overview Card */}
        <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Company Size & Value
              </CardTitle>
              {fundamentalsLoading ? (
                <Badge variant="outline" className="text-muted-foreground border-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Loading...</span>
                  </div>
                </Badge>
              ) : apiData?.keyMetrics?.peRatio ? (
                <Badge variant="outline" className={`${peAssessment.color} flex-shrink-0`}>
                  {peAssessment.label}
                </Badge>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{getSectionSummary('company-overview', apiData)}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger className="flex items-center justify-center gap-1 text-[#94A3B8] text-sm mb-2 cursor-help w-full">
                    Market Cap
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>The total value of all company shares. Larger = more established.</p>
                  </TooltipContent>
                </Tooltip>
                <div className="text-[#E5E7EB] font-bold text-2xl mb-1">
                  {apiData?.keyMetrics?.marketCap || 'N/A'}
                </div>
                <div className="text-[#94A3B8] text-xs h-4 flex items-center justify-center">
                  Large Cap
                </div>
              </div>

              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger className="flex items-center justify-center gap-1 text-[#94A3B8] text-sm mb-2 cursor-help w-full">
                    P/E Ratio
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Price vs Earnings. Lower numbers often mean better value.</p>
                  </TooltipContent>
                </Tooltip>
                <div className={`font-bold text-2xl mb-1 ${peAssessment.color}`}>
                  {(apiData?.keyMetrics?.peRatio || 0).toFixed(1)}
                </div>
                <div className="h-4 flex items-center justify-center">
                  <Badge variant="outline" className={`text-xs ${peAssessment.color}`}>
                    {peAssessment.label}
                  </Badge>
                </div>
              </div>

              <div className="text-center">
                <div className="text-[#94A3B8] text-sm mb-2">Current Price</div>
                <div className="text-[#E5E7EB] font-bold text-2xl mb-1">
                  ${fundamentals.currentPrice?.toFixed(2)}
                </div>
                <div className="text-[#94A3B8] text-xs">&nbsp;</div>
              </div>

              <div className="text-center">
                <div className="text-[#94A3B8] text-sm mb-2">52-Week Range</div>
                {ytdData && ytdData.yearLow && ytdData.yearHigh ? (
                  <div className="text-[#E5E7EB] text-lg font-medium mb-1">
                    ${ytdData.yearLow.toFixed(2)} - ${ytdData.yearHigh.toFixed(2)}
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2 mb-1">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    <div className="text-[#94A3B8] text-sm">Loading...</div>
                  </div>
                )}
                <div className="text-[#94A3B8] text-xs">&nbsp;</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profitability Card */}
        <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-foreground flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-[#34D399]" />
                Is This Company Making Money?
              </CardTitle>
              <Badge variant="outline" className={`${
                (apiData?.profitability?.roe || 0) >= 20 ? 'text-bullish border-bullish' :
                (apiData?.profitability?.roe || 0) >= 15 ? 'text-bullish border-bullish' :
                (apiData?.profitability?.roe || 0) >= 10 ? 'text-accent-amber border-accent-amber' : 'text-bearish border-bearish'
              } flex-shrink-0`}>
                {(apiData?.profitability?.roe || 0) >= 20 ? 'Excellent' :
                 (apiData?.profitability?.roe || 0) >= 15 ? 'Good' :
                 (apiData?.profitability?.roe || 0) >= 10 ? 'Fair' : 'Poor'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{getSectionSummary('profitability', apiData)}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                    Market Size
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Company's market capitalization - total value of all shares</p>
                  </TooltipContent>
                </Tooltip>
                <div className="text-foreground font-bold text-2xl mb-1">
                  {apiData?.keyMetrics?.marketCap || 'N/A'}
                </div>
                <div className="text-muted-foreground text-xs">
                  Large Cap
                </div>
              </div>

              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                    Value Rating
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>P/E Ratio - how expensive the stock is relative to earnings</p>
                  </TooltipContent>
                </Tooltip>
                <div className={`font-bold text-2xl mb-1 ${peAssessment.color}`}>
                  {fundamentals.peRatio?.toFixed(1)}
                </div>
                <div className="text-muted-foreground text-xs">
                  <Badge variant="outline" className={`text-xs ${peAssessment.color}`}>
                    {peAssessment.label}
                  </Badge>
                </div>
              </div>

              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                    Return on Equity
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>How efficiently they use shareholder money to generate profit</p>
                  </TooltipContent>
                </Tooltip>
                <div className="text-bullish font-bold text-2xl mb-1">
                  {(apiData?.profitability?.roe || 0).toFixed(1)}%
                </div>
                <div className="text-muted-foreground text-xs">
                  {(apiData?.profitability?.roe || 0) >= 20 ? 'Excellent' :
                   (apiData?.profitability?.roe || 0) >= 15 ? 'Good' :
                   (apiData?.profitability?.roe || 0) >= 10 ? 'Fair' : 'Poor'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Growth Card */}
        <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Is The Company Growing?
              </CardTitle>
              <Badge variant="outline" className={`${
                (fundamentalsData?.growth?.revenueGrowth?.ttm || 0) > 10 && (fundamentalsData?.growth?.epsGrowth?.ttm || 0) > 10 ? 'text-bullish border-bullish' :
                (fundamentalsData?.growth?.revenueGrowth?.ttm || 0) > 0 && (fundamentalsData?.growth?.epsGrowth?.ttm || 0) > 0 ? 'text-accent-amber border-accent-amber' :
                'text-bearish border-bearish'
              } flex-shrink-0`}>
                {(fundamentalsData?.growth?.revenueGrowth?.ttm || 0) > 10 && (fundamentalsData?.growth?.epsGrowth?.ttm || 0) > 10 ? 'Strong Growth' :
                 (fundamentalsData?.growth?.revenueGrowth?.ttm || 0) > 0 && (fundamentalsData?.growth?.epsGrowth?.ttm || 0) > 0 ? 'Moderate Growth' :
                 'Declining'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{getSectionSummary('growth', apiData)}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-[#94A3B8] text-sm mb-2">Revenue Growth</div>
                <div className={`font-bold text-2xl ${getGrowthColor(fundamentalsData?.growth?.revenueGrowth?.ttm || 0)}`}>
                  {(fundamentalsData?.growth?.revenueGrowth?.ttm || 0) >= 0 ? '+' : ''}{(fundamentalsData?.growth?.revenueGrowth?.ttm || 0).toFixed(1)}%
                </div>
                <div className="text-[#94A3B8] text-xs mt-1">Past 12 months</div>
              </div>

              <div className="text-center border-t border-[#2F343B] pt-4 md:border-t-0 md:pt-0">
                <div className="text-[#94A3B8] text-sm mb-2">Earnings Growth</div>
                <div className={`font-bold text-2xl ${getGrowthColor(fundamentalsData?.growth?.epsGrowth?.ttm || 0)}`}>
                  {(fundamentalsData?.growth?.epsGrowth?.ttm || 0) >= 0 ? '+' : ''}{(fundamentalsData?.growth?.epsGrowth?.ttm || 0).toFixed(1)}%
                </div>
                <div className="text-[#94A3B8] text-xs mt-1">Past 12 months</div>
              </div>

              <div className="text-center border-t border-[#2F343B] pt-4 md:border-t-0 md:pt-0">
                <div className="text-[#94A3B8] text-sm mb-2">Stock Performance</div>
                <div className={`font-bold text-2xl ${getGrowthColor(ytdData?.growthPct || 0)}`}>
                  {(ytdData?.growthPct || 0) >= 0 ? '+' : ''}{(ytdData?.growthPct || 0).toFixed(1)}%
                </div>
                <div className="text-[#94A3B8] text-xs mt-1">Year to date</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Evaluation Metrics Card */}
        <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Calculator className="h-5 w-5 text-[#8B5CF6]" />
                Enhanced Evaluation Metrics
              </CardTitle>
              <Badge variant="outline" className={`${
                (apiData?.keyMetrics?.pegRatio || 0) < 1 ? 'text-bullish border-bullish' :
                (apiData?.keyMetrics?.pegRatio || 0) < 1.5 ? 'text-accent-amber border-accent-amber' :
                'text-bearish border-bearish'
              } flex-shrink-0`}>
                {(apiData?.keyMetrics?.pegRatio || 0) < 1 ? 'Undervalued' :
                 (apiData?.keyMetrics?.pegRatio || 0) < 1.5 ? 'Fair Value' : 'Overvalued'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{getSectionSummary('enhanced-metrics', apiData)}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                    Forward P/E
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Price-to-earnings ratio based on expected future earnings</p>
                  </TooltipContent>
                </Tooltip>
                <div className="text-foreground font-bold text-xl mb-1">
                  {(apiData?.keyMetrics?.forwardPE || 0).toFixed(1)}
                </div>
                <div className="text-muted-foreground text-xs">Next 12 months</div>
              </div>

              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                    PEG Ratio
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Price/Earnings to Growth ratio. Below 1.0 suggests good value for growth</p>
                  </TooltipContent>
                </Tooltip>
                <div className={`font-bold text-xl mb-1 ${(apiData?.keyMetrics?.pegRatio || 0) < 1 ? 'text-bullish' : (apiData?.keyMetrics?.pegRatio || 0) < 1.5 ? 'text-accent-amber' : 'text-bearish'}`}>
                  {(apiData?.keyMetrics?.pegRatio || 0).toFixed(2)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {(apiData?.keyMetrics?.pegRatio || 0) < 1 ? 'Undervalued' : (apiData?.keyMetrics?.pegRatio || 0) < 1.5 ? 'Fair Value' : 'Overvalued'}
                </div>
              </div>

              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                    Beta
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Stock volatility vs market. 1.0 = same as market, &gt;1.0 = more volatile</p>
                  </TooltipContent>
                </Tooltip>
                <div className={`font-bold text-xl mb-1 ${(apiData?.keyMetrics?.beta || 0) < 1 ? 'text-bullish' : (apiData?.keyMetrics?.beta || 0) < 1.5 ? 'text-accent-amber' : 'text-bearish'}`}>
                  {(apiData?.keyMetrics?.beta || 0).toFixed(2)}
                </div>
                <div className="text-muted-foreground text-xs">
                  {(apiData?.keyMetrics?.beta || 0) < 1 ? 'Less Volatile' : (apiData?.keyMetrics?.beta || 0) < 1.5 ? 'Moderate' : 'High Volatility'}
                </div>
              </div>

              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                    Book Value/Share
                    <Info className="h-3 w-3" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Net worth per share if company were liquidated today</p>
                  </TooltipContent>
                </Tooltip>
                <div className="text-foreground font-bold text-xl mb-1">
                  ${(apiData?.keyMetrics?.bookValuePerShare || 0).toFixed(2)}
                </div>
                <div className="text-muted-foreground text-xs">Net Worth/Share</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profitability Deep Dive Card */}
        <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-foreground flex items-center gap-2">
                <PieChart className="h-5 w-5 text-[#10B981]" />
                Profitability Deep Dive
              </CardTitle>
              <Badge variant="outline" className={`${
                (apiData?.profitability?.netMargin || 0) > 15 ? 'text-bullish border-bullish' :
                (apiData?.profitability?.netMargin || 0) > 5 ? 'text-accent-amber border-accent-amber' :
                'text-bearish border-bearish'
              } flex-shrink-0`}>
                {(apiData?.profitability?.netMargin || 0) > 15 ? 'High Margins' :
                 (apiData?.profitability?.netMargin || 0) > 5 ? 'Decent Margins' : 'Thin Margins'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{getSectionSummary('profitability', apiData)}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div className="text-center">
                  <Tooltip>
                    <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                      Gross Margin
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Revenue minus cost of goods sold, as percentage of revenue</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-foreground font-bold text-xl mb-1">
                    {(apiData?.profitability?.grossMargin || 0).toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground text-xs">Gross Profit Margin</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <Tooltip>
                    <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                      Operating Margin
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Operating income as percentage of revenue - core business profitability</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-foreground font-bold text-xl mb-1">
                    {(apiData?.profitability?.operatingMargin || 0).toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground text-xs">Operating Efficiency</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <Tooltip>
                    <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                      Net Margin
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Net income as percentage of revenue - bottom line profitability</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-bullish font-bold text-xl mb-1">
                    {(apiData?.profitability?.netMargin || 0).toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground text-xs">Bottom Line</div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <Tooltip>
                    <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                      ROE
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Return on Equity - how efficiently company uses shareholder money</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-bullish font-bold text-xl mb-1">
                    {(apiData?.profitability?.roe || 0).toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground text-xs">Return on Equity</div>
                </div>

                <div className="text-center">
                  <Tooltip>
                    <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                      ROA
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Return on Assets - how efficiently company uses its assets</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-foreground font-bold text-xl mb-1">
                    {(apiData?.profitability?.roa || 0).toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground text-xs">Return on Assets</div>
                </div>

                <div className="text-center">
                  <Tooltip>
                    <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                      ROI
                      <Info className="h-3 w-3" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Return on Investment - overall investment efficiency</p>
                    </TooltipContent>
                  </Tooltip>
                  <div className="text-foreground font-bold text-xl mb-1">
                    {(apiData?.profitability?.roi || 0).toFixed(1)}%
                  </div>
                  <div className="text-muted-foreground text-xs">Return on Investment</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Health Dashboard Card */}
        <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#3B82F6]" />
                Financial Health Dashboard
              </CardTitle>
              <Badge variant="outline" className={`${
                (apiData?.financialHealth?.currentRatio || 0) >= 1.5 && 
                (apiData?.financialHealth?.debtToEquity || 0) <= 0.5 && 
                (apiData?.financialHealth?.interestCoverage || 0) >= 5 
                  ? 'text-bullish border-bullish' 
                  : (apiData?.financialHealth?.currentRatio || 0) >= 1 && 
                    (apiData?.financialHealth?.debtToEquity || 0) <= 1 && 
                    (apiData?.financialHealth?.interestCoverage || 0) >= 2 
                    ? 'text-accent-amber border-accent-amber' 
                    : 'text-bearish border-bearish'
              } flex-shrink-0`}>
                {(apiData?.financialHealth?.currentRatio || 0) >= 1.5 && 
                 (apiData?.financialHealth?.debtToEquity || 0) <= 0.5 && 
                 (apiData?.financialHealth?.interestCoverage || 0) >= 5 
                   ? 'Excellent' 
                   : (apiData?.financialHealth?.currentRatio || 0) >= 1 && 
                     (apiData?.financialHealth?.debtToEquity || 0) <= 1 && 
                     (apiData?.financialHealth?.interestCoverage || 0) >= 2 
                     ? 'Good' 
                     : 'Needs Attention'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{getSectionSummary('financial-health', apiData)}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h4 className="text-foreground font-medium mb-4">Debt Management</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 text-muted-foreground text-sm cursor-help">
                        Debt-to-Equity
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total debt relative to shareholder equity. Lower is generally better</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className={`font-bold text-lg ${getRatioAssessment(apiData?.financialHealth?.debtToEquity || 0, 'debt').color}`}>
                      {(apiData?.financialHealth?.debtToEquity || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-sm">Long-term D/E</span>
                    <div className="font-medium text-foreground">
                      {(apiData?.financialHealth?.longTermDebtToEquity || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 text-muted-foreground text-sm cursor-help">
                        Interest Coverage
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>How easily company can pay interest on debt. Higher is better</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className={`font-bold text-lg ${(apiData?.financialHealth?.interestCoverage || 0) > 5 ? 'text-bullish' : (apiData?.financialHealth?.interestCoverage || 0) > 2 ? 'text-accent-amber' : 'text-bearish'}`}>
                      {(apiData?.financialHealth?.interestCoverage || 0).toFixed(1)}x
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="text-foreground font-medium mb-4">Liquidity</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 text-muted-foreground text-sm cursor-help">
                        Current Ratio
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Current assets vs current liabilities. Above 1.0 means company can pay short-term debts</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className={`font-bold text-lg ${getRatioAssessment(apiData?.financialHealth?.currentRatio || 0, 'current').color}`}>
                      {(apiData?.financialHealth?.currentRatio || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 text-muted-foreground text-sm cursor-help">
                        Quick Ratio
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Most liquid assets vs current liabilities. More conservative than current ratio</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="font-medium text-foreground">
                      {(apiData?.financialHealth?.quickRatio || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center gap-1 text-muted-foreground text-sm cursor-help">
                        Asset Turnover
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>How efficiently company uses assets to generate revenue</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className="font-medium text-foreground">
                      {(apiData?.financialHealth?.assetTurnover || 0).toFixed(2)}x
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Multi-timeframe Growth Card */}
        <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle className="text-foreground flex items-center gap-2">
                <Activity className="h-5 w-5 text-[#F59E0B]" />
                Multi-timeframe Growth Analysis
              </CardTitle>
              <Badge variant="outline" className={`${
                (apiData?.growth?.revenueGrowth?.threeYear || 0) > 5 && (apiData?.growth?.revenueGrowth?.fiveYear || 0) > 5 ? 'text-bullish border-bullish' :
                (apiData?.growth?.revenueGrowth?.threeYear || 0) > 0 && (apiData?.growth?.revenueGrowth?.fiveYear || 0) > 0 ? 'text-accent-amber border-accent-amber' :
                'text-bearish border-bearish'
              } flex-shrink-0`}>
                {(apiData?.growth?.revenueGrowth?.threeYear || 0) > 5 && (apiData?.growth?.revenueGrowth?.fiveYear || 0) > 5 ? 'Consistent Growth' :
                 (apiData?.growth?.revenueGrowth?.threeYear || 0) > 0 && (apiData?.growth?.revenueGrowth?.fiveYear || 0) > 0 ? 'Steady Growth' :
                 'Inconsistent'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{getSectionSummary('multi-growth', apiData)}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Revenue Growth Section */}
              <div>
                <h4 className="text-foreground font-medium mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  Revenue Growth Trends
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-xs mb-1">TTM</div>
                    <div className={`font-bold text-lg ${getGrowthColor(fundamentalsData?.growth?.revenueGrowth?.ttm || 0)}`}>
                      {(fundamentalsData?.growth?.revenueGrowth?.ttm || 0) >= 0 ? '+' : ''}{(fundamentalsData?.growth?.revenueGrowth?.ttm || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-xs mb-1">Quarterly</div>
                    <div className={`font-bold text-lg ${getGrowthColor(fundamentalsData?.growth?.revenueGrowth?.quarterly || 0)}`}>
                      {(fundamentalsData?.growth?.revenueGrowth?.quarterly || 0) >= 0 ? '+' : ''}{(fundamentalsData?.growth?.revenueGrowth?.quarterly || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-xs mb-1">3-Year Avg</div>
                    <div className={`font-bold text-lg ${getGrowthColor(fundamentalsData?.growth?.revenueGrowth?.threeYear || 0)}`}>
                      {(fundamentalsData?.growth?.revenueGrowth?.threeYear || 0) >= 0 ? '+' : ''}{(fundamentalsData?.growth?.revenueGrowth?.threeYear || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-xs mb-1">5-Year Avg</div>
                    <div className={`font-bold text-lg ${getGrowthColor(fundamentalsData?.growth?.revenueGrowth?.fiveYear || 0)}`}>
                      {(fundamentalsData?.growth?.revenueGrowth?.fiveYear || 0) >= 0 ? '+' : ''}{(fundamentalsData?.growth?.revenueGrowth?.fiveYear || 0).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* EPS Growth Section */}
              <div>
                <h4 className="text-foreground font-medium mb-4 flex items-center gap-2">
                  <Target className="h-4 w-4 text-bullish" />
                  Earnings Per Share Growth
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-xs mb-1">TTM</div>
                    <div className={`font-bold text-lg ${getGrowthColor(fundamentalsData?.growth?.epsGrowth?.ttm || 0)}`}>
                      {(fundamentalsData?.growth?.epsGrowth?.ttm || 0) >= 0 ? '+' : ''}{(fundamentalsData?.growth?.epsGrowth?.ttm || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-xs mb-1">Quarterly</div>
                    <div className={`font-bold text-lg ${getGrowthColor(fundamentalsData?.growth?.epsGrowth?.quarterly || 0)}`}>
                      {(fundamentalsData?.growth?.epsGrowth?.quarterly || 0) >= 0 ? '+' : ''}{(fundamentalsData?.growth?.epsGrowth?.quarterly || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-xs mb-1">3-Year Avg</div>
                    <div className={`font-bold text-lg ${getGrowthColor(fundamentalsData?.growth?.epsGrowth?.threeYear || 0)}`}>
                      {(fundamentalsData?.growth?.epsGrowth?.threeYear || 0) >= 0 ? '+' : ''}{(fundamentalsData?.growth?.epsGrowth?.threeYear || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-3 bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-xs mb-1">5-Year Avg</div>
                    <div className={`font-bold text-lg ${getGrowthColor(fundamentalsData?.growth?.epsGrowth?.fiveYear || 0)}`}>
                      {(fundamentalsData?.growth?.epsGrowth?.fiveYear || 0) >= 0 ? '+' : ''}{(fundamentalsData?.growth?.epsGrowth?.fiveYear || 0).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Growth Metrics */}
              <div>
                <h4 className="text-foreground font-medium mb-4">Other Growth Indicators</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="text-center p-4 bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-sm mb-2">Book Value Growth (5Y)</div>
                    <div className={`font-bold text-xl ${getGrowthColor(fundamentalsData?.growth?.bookValueGrowth || 0)}`}>
                      {(fundamentalsData?.growth?.bookValueGrowth || 0) >= 0 ? '+' : ''}{(fundamentalsData?.growth?.bookValueGrowth || 0).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center p-4 bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-sm mb-2">EBITDA Growth (5Y)</div>
                    <div className={`font-bold text-xl ${getGrowthColor(fundamentalsData?.growth?.ebitdaGrowth || 0)}`}>
                      {(fundamentalsData?.growth?.ebitdaGrowth || 0) >= 0 ? '+' : ''}{(fundamentalsData?.growth?.ebitdaGrowth || 0).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dividend Information Card - Only show if dividend yield > 0 */}
        {(apiData?.dividend?.dividendYield || 0) > 0 && (
          <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Gift className="h-5 w-5 text-[#EC4899]" />
                  Dividend Information
                </CardTitle>
                <Badge variant="outline" className={`${
                  ((apiData?.dividend?.dividendYield || 0) >= 2 || (apiData?.dividend?.dividendPerShare || 0) >= 1) && 
                  (apiData?.dividend?.payoutRatio || 0) < 60 && 
                  (apiData?.dividend?.dividendGrowth5Y || 0) > 0 
                    ? 'text-bullish border-bullish' 
                    : ((apiData?.dividend?.dividendYield || 0) >= 1 || (apiData?.dividend?.dividendPerShare || 0) >= 0.5) && 
                      (apiData?.dividend?.payoutRatio || 0) < 80 
                      ? 'text-accent-amber border-accent-amber' 
                      : 'text-bearish border-bearish'
                } flex-shrink-0`}>
                  {((apiData?.dividend?.dividendYield || 0) >= 2 || (apiData?.dividend?.dividendPerShare || 0) >= 1) && 
                   (apiData?.dividend?.payoutRatio || 0) < 60 && 
                   (apiData?.dividend?.dividendGrowth5Y || 0) > 0 
                     ? 'High Quality' 
                     : ((apiData?.dividend?.dividendYield || 0) >= 1 || (apiData?.dividend?.dividendPerShare || 0) >= 0.5) && 
                       (apiData?.dividend?.payoutRatio || 0) < 80 
                       ? 'Decent Dividend' 
                       : 'Dividend Concerns'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{getSectionSummary('dividend', apiData)}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="text-center p-4 bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-sm mb-2">Current Dividend Yield</div>
                    <div className="text-[#EC4899] font-bold text-3xl mb-1">
                      {(apiData?.dividend?.dividendYield || 0).toFixed(2)}%
                    </div>
                    <div className="text-muted-foreground text-xs">Annual yield</div>
                  </div>

                  <div className="text-center p-4 bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-sm mb-2">Dividend Per Share</div>
                    <div className="text-foreground font-bold text-2xl mb-1">
                      ${(apiData?.dividend?.dividendPerShare || 0).toFixed(2)}
                    </div>
                    <div className="text-muted-foreground text-xs">Per share annually</div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="text-center p-4 bg-muted/20 rounded-lg">
                    <Tooltip>
                      <TooltipTrigger className="flex items-center justify-center gap-1 text-muted-foreground text-sm mb-2 cursor-help w-full">
                        Payout Ratio
                        <Info className="h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Percentage of earnings paid as dividends. Lower ratios are more sustainable</p>
                      </TooltipContent>
                    </Tooltip>
                    <div className={`font-bold text-2xl mb-1 ${(apiData?.dividend?.payoutRatio || 0) < 60 ? 'text-bullish' : (apiData?.dividend?.payoutRatio || 0) < 80 ? 'text-accent-amber' : 'text-bearish'}`}>
                      {(apiData?.dividend?.payoutRatio || 0).toFixed(1)}%
                    </div>
                    <div className="text-muted-foreground text-xs">
                      {(apiData?.dividend?.payoutRatio || 0) < 60 ? 'Sustainable' : (apiData?.dividend?.payoutRatio || 0) < 80 ? 'Moderate' : 'High Risk'}
                    </div>
                  </div>

                  <div className="text-center p-4 bg-muted/20 rounded-lg">
                    <div className="text-muted-foreground text-sm mb-2">5-Year Dividend Growth</div>
                    <div className={`font-bold text-2xl mb-1 ${getGrowthColor(apiData?.dividend?.dividendGrowth5Y || 0)}`}>
                      {(apiData?.dividend?.dividendGrowth5Y || 0) >= 0 ? '+' : ''}{(apiData?.dividend?.dividendGrowth5Y || 0).toFixed(1)}%
                    </div>
                    <div className="text-muted-foreground text-xs">Average annual growth</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Beginner Tips */}
        <Card className="bg-muted/50 border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <Info className="h-5 w-5 text-accent-amber" />
              Beginner Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-card-foreground text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-bullish rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <strong>Look for growing companies:</strong> Positive revenue and earnings growth usually indicates a healthy business.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <strong>Check financial health:</strong> Companies that can pay their bills (Current Ratio {'>'} 1) and have reasonable debt levels are safer investments.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-accent-amber rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <strong>Don't rely on one metric:</strong> Look at the complete picture - growth, profitability, and financial health together.
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-accent-purple rounded-full mt-2 flex-shrink-0"></div>
                <div>
                  <strong>Compare with competitors:</strong> These numbers are more meaningful when compared to similar companies in the same industry.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}