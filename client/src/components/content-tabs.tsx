import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, Brain, BarChart3, TrendingUp, Users, MoreHorizontal, Lock } from "lucide-react";
import { UpgradePrompt } from "@/components/upgrade-prompt";
import { AIAnalysis } from "@/components/AIAnalysis";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { TickerData } from "@shared/schema";
import { StockPrimaryDetails } from "@/components/stock/StockPrimaryDetails";
import { TechnicalAnalysisDashboard } from "@/components/TechnicalAnalysisDashboard";
import { BeginnerFundamentals } from "@/components/BeginnerFundamentals";

interface ContentTabsProps {
  tickerSymbol: string;
}

export function ContentTabs({ tickerSymbol }: ContentTabsProps) {
  const [activeTab, setActiveTab] = useState("primary");
  const [visibleTabs, setVisibleTabs] = useState<string[]>([]);
  const [overflowTabs, setOverflowTabs] = useState<string[]>([]);
  const [upgradePrompt, setUpgradePrompt] = useState<{ show: boolean; reason: string; requiresAuth: boolean } | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Free tickers that anonymous users can access
  const FREE_TICKERS = ['NVDA', 'TSLA', 'AAPL'];
  const isFreeTicker = FREE_TICKERS.includes(tickerSymbol.toUpperCase());
  
  // Debug logging
  console.log('🔍 ContentTabs Debug:', {
    tickerSymbol,
    tickerSymbolUpper: tickerSymbol.toUpperCase(),
    isAuthenticated,
    isFreeTicker,
    FREE_TICKERS
  });
  
  // Check if anonymous user can access this ticker at all
  const canAnonymousAccess = !isAuthenticated && isFreeTicker;

  // Custom setActiveTab that validates access for anonymous users
  const handleTabChange = (tabValue: string) => {
    const tab = allTabs.find(t => t.value === tabValue);
    if (!tab) return;
    
    // If anonymous user tries to access locked tab, ignore the change
    if (!isAuthenticated && tab.requiresAuth && canAnonymousAccess) {
      return;
    }
    
    setActiveTab(tabValue);
  };

  // Define all tabs with their metadata
  const allTabs = [
    { 
      value: "primary", 
      label: "PRIMARY DETAILS", 
      icon: FileText,
      shortLabel: "PRIMARY",
      requiresAuth: false
    },
    { 
      value: "ai", 
      label: "AI ANALYSIS", 
      icon: Brain,
      shortLabel: "AI",
      requiresAuth: true,
      requiresPremium: true // Add premium requirement
    },
    { 
      value: "fundamentals", 
      label: "FUNDAMENTALS", 
      icon: BarChart3,
      shortLabel: "FUNDS",
      requiresAuth: false
    },
    { 
      value: "technical", 
      label: "TECHNICAL ANALYSIS", 
      icon: TrendingUp,
      shortLabel: "TECHNICAL",
      requiresAuth: false
    },
    { 
      value: "sentiment", 
      label: "SENTIMENT ANALYSIS", 
      icon: Users,
      shortLabel: "SENTIMENT",
      requiresAuth: true
    }
  ];

  // Function to calculate which tabs fit in the available space
  const calculateVisibleTabs = () => {
    if (!containerRef.current) return;

    const containerWidth = containerRef.current.offsetWidth;
    const overflowButtonWidth = 100; // Width for "More" button
    const availableWidth = containerWidth - overflowButtonWidth - 20; // Extra margin
    
    let currentWidth = 0;
    const visible: string[] = [];
    const overflow: string[] = [];

    // Create temporary elements to measure actual tab widths with full labels
    allTabs.forEach((tab) => {
      // Create a temporary element to measure the exact width needed
      const tempElement = document.createElement('div');
      tempElement.className = 'flex items-center gap-2 px-4 py-3 text-base font-semibold uppercase tracking-wide';
      tempElement.style.visibility = 'hidden';
      tempElement.style.position = 'absolute';
      tempElement.style.whiteSpace = 'nowrap';
      
      // Use full label always - no truncation
      tempElement.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
          <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
        </svg>
        <span>${tab.label}</span>
      `;
      
      document.body.appendChild(tempElement);
      const tabWidth = tempElement.offsetWidth + 16; // Add some padding buffer
      document.body.removeChild(tempElement);

      // Check if this tab fits in the remaining space
      if (currentWidth + tabWidth <= availableWidth) {
        visible.push(tab.value);
        currentWidth += tabWidth;
      } else {
        overflow.push(tab.value);
      }
    });

    // Always show at least one tab, even if it might be tight
    if (visible.length === 0 && allTabs.length > 0) {
      visible.push(allTabs[0].value);
      overflow.splice(0, 1);
    }

    setVisibleTabs(visible);
    setOverflowTabs(overflow);
  };

  // Recalculate on window resize and mount
  useEffect(() => {
    // Initial calculation after DOM is rendered
    const timeoutId = setTimeout(() => {
      calculateVisibleTabs();
    }, 300); // Increased delay to ensure proper DOM rendering
    
    const handleResize = () => {
      // Debounced resize calculation
      clearTimeout(timeoutId);
      setTimeout(calculateVisibleTabs, 200);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // Recalculate when container size changes
  useEffect(() => {
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(() => {
        setTimeout(calculateVisibleTabs, 100);
      });
      resizeObserver.observe(containerRef.current);
      return () => resizeObserver.disconnect();
    }
  }, []);

  // Force recalculation when visible tabs change to ensure proper rendering
  useEffect(() => {
    if (visibleTabs.length === 0) {
      setTimeout(calculateVisibleTabs, 200);
    }
  }, [visibleTabs]);

  const { data: newsData, isLoading: newsLoading, error: newsError } = useQuery<TickerData>({
    queryKey: ["/api/ticker-data", tickerSymbol, "news"],
    enabled: !!tickerSymbol,
    retry: false,
  });

  const { data: sentimentData, isLoading: sentimentLoading, error: sentimentError } = useQuery<TickerData>({
    queryKey: ["/api/ticker-data", tickerSymbol, "sentiment"],
    enabled: !!tickerSymbol,
    retry: false,
  });

  const { data: fundamentalsData, isLoading: fundamentalsLoading, error: fundamentalsError } = useQuery<TickerData>({
    queryKey: ["/api/ticker-data", tickerSymbol, "fundamentals"],
    enabled: !!tickerSymbol,
    retry: false,
  });

  const { data: technicalData, isLoading: technicalLoading, error: technicalError } = useQuery<TickerData>({
    queryKey: ["/api/ticker-data", tickerSymbol, "technical"],
    enabled: !!tickerSymbol,
    retry: false,
  });

  // Refresh usage tracker when any ticker data is successfully fetched
  useEffect(() => {
    if (newsData || sentimentData || fundamentalsData || technicalData) {
      queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
    }
  }, [newsData, sentimentData, fundamentalsData, technicalData, queryClient]);

  // Handle errors from API calls
  useEffect(() => {
    const errors = [newsError, sentimentError, fundamentalsError, technicalError].filter(Boolean);
    if (errors.length > 0) {
      const firstError = errors[0] as any;
      const errorMessage = firstError?.message || '';
      
      // For free tickers, only show upgrade prompt for non-sentiment/AI errors
      // For non-free tickers, any error should show upgrade prompt
      const shouldShowUpgradePrompt = !isAuthenticated && isFreeTicker 
        ? (newsError || fundamentalsError || technicalError) // Free tickers: ignore sentiment/AI errors
        : true; // Non-free tickers: any error triggers upgrade prompt

      if (shouldShowUpgradePrompt) {
        if (errorMessage.includes('401') || errorMessage.includes('Authentication required')) {
          setUpgradePrompt({ show: true, reason: "Sign up required for this ticker", requiresAuth: true });
        } else if (errorMessage.includes('403') || errorMessage.includes('upgrade')) {
          setUpgradePrompt({ show: true, reason: "Upgrade required for unlimited ticker access", requiresAuth: false });
        }
      }
    } else {
      setUpgradePrompt(null);
    }
  }, [newsError, sentimentError, fundamentalsError, technicalError, isAuthenticated, isFreeTicker]);

  // Upgrade mutation
  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/user/upgrade', {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to upgrade account');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/usage'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      setUpgradePrompt(null);
      toast({
        title: 'Upgrade Successful!',
        description: 'You now have premium access with daily limits.',
      });
      // Retry fetching data
      queryClient.invalidateQueries({ queryKey: ["/api/ticker-data", tickerSymbol] });
    },
    onError: () => {
      toast({
        title: 'Upgrade Failed',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    },
  });

  // Handle sign up redirect
  const handleSignUp = () => {
    window.location.href = '/login';
  };

  // Check if anonymous user is trying to access a non-free ticker
  if (!isAuthenticated && !isFreeTicker) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <UpgradePrompt
          reason={`${tickerSymbol.toUpperCase()} analysis requires a free account`}
          remainingLimit={0}
          onUpgrade={() => {}} // Not used for auth-required prompt
          onSignUp={handleSignUp}
          requiresAuth={true}
        />
      </div>
    );
  }

  // Check if any data fetch resulted in an error that should show upgrade prompt
  // For free tickers (NVDA, TSLA, AAPL), sentiment/AI errors are expected for anonymous users
  // Only show upgrade prompt for errors on allowed data types
  const hasAccessError = !isAuthenticated && isFreeTicker 
    ? (newsError || fundamentalsError || technicalError) // For free tickers, ignore sentiment/AI errors
    : (newsError || sentimentError || fundamentalsError || technicalError); // For non-free tickers, any error blocks access

  // Show upgrade prompt if there's an access error
  if (upgradePrompt?.show || hasAccessError) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <UpgradePrompt
          reason={upgradePrompt?.reason || "Access to this ticker requires an upgrade"}
          remainingLimit={0}
          onUpgrade={() => upgradeMutation.mutate()}
          onSignUp={upgradePrompt?.requiresAuth ? handleSignUp : undefined}
          isUpgrading={upgradeMutation.isPending}
          requiresAuth={upgradePrompt?.requiresAuth || false}
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full tab-container">
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <div ref={tabsRef} className="flex items-center w-full border-b border-[#2A2F36] overflow-hidden">
          <TabsList className="flex h-auto gap-0 bg-transparent border-0 p-0 flex-shrink-0">
            {/* Visible tabs */}
            {visibleTabs.map((tabValue) => {
              const tab = allTabs.find(t => t.value === tabValue);
              if (!tab) return null;
              
              const Icon = tab.icon;
              const isLocked = !isAuthenticated && tab.requiresAuth && canAnonymousAccess;
              const isPremiumLocked = tab.requiresPremium && (!user || user.tier !== 'premium' && user.tier !== 'admin');
              
              if (isLocked) {
                return (
                  <TooltipProvider key={tab.value}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-transparent border-0 text-gray-600 cursor-not-allowed transition-all duration-200 rounded-lg tab-no-truncate">
                          <Lock className="h-4 w-4" />
                          <Icon className="h-5 w-5" />
                          <span className="text-base font-semibold uppercase tracking-wide">
                            {tab.label}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Sign up to unlock {tab.label.toLowerCase()}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }

              if (isPremiumLocked) {
                return (
                  <TooltipProvider key={tab.value}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center justify-center gap-2 px-4 py-3 bg-transparent border-0 text-amber-600 cursor-not-allowed transition-all duration-200 rounded-lg tab-no-truncate">
                          <Lock className="h-4 w-4" />
                          <Icon className="h-5 w-5" />
                          <span className="text-base font-semibold uppercase tracking-wide">
                            {tab.label}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Upgrade to Premium for {tab.label.toLowerCase()}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              }
              
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-transparent border-0 text-gray-400 data-[state=active]:text-[#2563EB] data-[state=active]:bg-[#2563EB]/10 data-[state=active]:font-bold hover:text-white transition-all duration-200 rounded-lg relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#2563EB] after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity after:duration-200 tab-no-truncate"
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-base font-semibold uppercase tracking-wide">
                    {tab.label}
                  </span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* Overflow menu */}
          {overflowTabs.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center gap-2 px-4 py-3 bg-transparent border-0 text-gray-400 hover:text-white transition-colors duration-200 rounded-lg relative tab-no-truncate"
                >
                  <MoreHorizontal className="h-5 w-5" />
                  <span className="text-base font-semibold uppercase tracking-wide">More</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent 
                align="end" 
                className="bg-[#1E2227] border-[#2A2F36] min-w-[200px]"
              >
                {overflowTabs.map((tabValue) => {
                  const tab = allTabs.find(t => t.value === tabValue);
                  if (!tab) return null;
                  
                  const Icon = tab.icon;
                  const isLocked = !isAuthenticated && tab.requiresAuth && canAnonymousAccess;
                  
                  if (isLocked) {
                    return (
                      <TooltipProvider key={tab.value}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 px-3 py-2 cursor-not-allowed text-gray-600">
                              <Lock className="h-3 w-3" />
                              <Icon className="h-4 w-4" />
                              <span className="text-sm font-medium uppercase tracking-wide">
                                {tab.label}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Sign up to unlock {tab.label.toLowerCase()}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  }
                  
                  return (
                    <DropdownMenuItem
                      key={tab.value}
                      onClick={() => handleTabChange(tab.value)}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[#232831] transition-colors ${
                        activeTab === tab.value ? 'text-[#2563EB] bg-[#232831]' : 'text-[#94A3B8]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm font-medium uppercase tracking-wide">
                        {tab.label}
                      </span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <TabsContent value="primary" className="mt-6">
          <StockPrimaryDetails tickerSymbol={tickerSymbol} />
        </TabsContent>

        <TabsContent value="sentiment" className="mt-6">
        {/* Overall Sentiment Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Professional Sentiment - Keep as is */}
          <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <span className="text-2xl">🏦</span>
                Professional Sentiment
                <span className="text-sm text-[#94A3B8] font-normal">(News, Analysts)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sentimentLoading ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-r from-blue-500 to-green-500 rounded-full animate-pulse flex items-center justify-center">
                        <span className="text-2xl">🏦</span>
                      </div>
                      <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    </div>
                    <div className="text-lg font-semibold text-foreground mb-2">
                      Analyzing Professional Sentiment
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                      Fetching news articles and analyst reports...
                    </div>
                    <div className="space-y-2">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-gradient-to-r from-primary to-accent-teal h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Processing financial news and analyst data...
                      </div>
                    </div>
                  </div>
                </div>
              ) : (sentimentData?.data as any)?.professional?.sentiment?.includes('Not Available') || 
                   (sentimentData?.data as any)?.professional?.sentiment?.includes('Unavailable') ||
                   (sentimentData?.data as any)?.professional?.score === 0 ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-6xl mb-4">�</div>
                    <div className="text-xl font-semibold text-card-foreground mb-2">
                      Professional Analysis Coming Soon
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                      News sentiment and analyst ratings integration in development
                    </div>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-card-foreground mb-2">Future Data Sources:</h4>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div>• Financial news sentiment analysis</div>
                        <div>• Analyst price target aggregation</div>
                        <div>• Earnings call transcripts</div>
                        <div>• SEC filing sentiment</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <div 
                      className="text-4xl font-bold mb-2"
                      style={{
                        color: 
                          ((sentimentData?.data as any)?.professional?.score || 0) >= 60 ? '#10B981' :  // Green
                          ((sentimentData?.data as any)?.professional?.score || 0) >= 40 ? '#F59E0B' : '#EF4444'  // Yellow : Red
                      }}
                    >
                      {(sentimentData?.data as any)?.professional?.score || 0}%
                    </div>
                    <div className="text-muted-foreground mb-1">
                      {(sentimentData?.data as any)?.professional?.sentiment || "Neutral"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: {(sentimentData?.data as any)?.professional?.confidence || 0}%
                      {(sentimentData?.data as any)?.professional?.postsAnalyzed && (
                        <span className="ml-2">• Last {(sentimentData?.data as any).professional.postsAnalyzed} sources analyzed</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Sentiment Gauge */}
                  <div className="w-full bg-muted rounded-full h-3 mb-4">
                    <div 
                      className="h-3 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${(sentimentData?.data as any)?.professional?.score || 0}%`,
                        backgroundColor: 
                          ((sentimentData?.data as any)?.professional?.score || 0) >= 60 ? '#10B981' :  // Green
                          ((sentimentData?.data as any)?.professional?.score || 0) >= 40 ? '#F59E0B' : '#EF4444'  // Yellow : Red
                      }}
                    ></div>
                  </div>
                  
                  {/* Source Breakdown */}
                  {(sentimentData?.data as any)?.professional?.sources && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-card-foreground">Source Breakdown:</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">News:</span>
                          <span className="text-foreground">{(sentimentData?.data as any).professional.sources.news}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Analysts:</span>
                          <span className="text-foreground">{Math.round((sentimentData?.data as any).professional.sources.analysts || 0)}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Overall Reddit Sentiment Summary */}
          <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <span className="text-2xl">📱</span>
                Summarized Retail Sentiment
                <span className="text-sm text-[#94A3B8] font-normal">(Reddit + StockTwits)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sentimentLoading ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="relative mb-4">
                      <div className="w-16 h-16 mx-auto bg-gradient-to-r from-orange-500 to-red-500 rounded-full animate-pulse flex items-center justify-center">
                        <span className="text-2xl">📱</span>
                      </div>
                      <div className="absolute inset-0 w-16 h-16 mx-auto border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin"></div>
                    </div>
                    <div className="text-lg font-semibold text-white mb-2">
                      Analyzing Reddit Communities
                    </div>
                    <div className="text-sm text-slate-400 mb-4">
                      Searching 3 popular stock communities + StockTwits...
                    </div>
                    <div className="space-y-3">
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full animate-pulse" style={{width: '75%'}}></div>
                      </div>
                      <div className="text-xs text-slate-500 space-y-1">
                        <div>• Fetching r/wallstreetbets, r/investing, r/stocks...</div>
                        <div>• Filtering posts with ticker mentions in titles...</div>
                        <div>• Processing StockTwits sentiment data...</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (sentimentData?.data as any)?.retail?.noDataFound ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🔍</div>
                    <div className="text-xl font-semibold text-slate-300 mb-2">
                      No Reddit Mentions Found
                    </div>
                    <div className="text-sm text-slate-400 mb-4">
                      No discussions found for {tickerSymbol.toUpperCase()} in popular stock communities
                    </div>
                    {(sentimentData?.data as any)?.retail?.insights && (
                      <div className="space-y-2">
                        {(sentimentData?.data as any).retail.insights.map((insight: string, index: number) => (
                          <div key={index} className="text-xs text-slate-500 bg-slate-700/30 p-2 rounded">
                            {insight}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <div 
                      className="text-4xl font-bold mb-2"
                      style={{
                        color: 
                          ((sentimentData?.data as any)?.retail?.score || 0) >= 60 ? '#10B981' :  // Green
                          ((sentimentData?.data as any)?.retail?.score || 0) >= 40 ? '#F59E0B' : '#EF4444'  // Yellow : Red
                      }}
                    >
                      {(sentimentData?.data as any)?.retail?.score || 0}%
                    </div>
                    <div className="text-slate-400 mb-1">
                      {(sentimentData?.data as any)?.retail?.sentiment || "Neutral"}
                    </div>
                    <div className="text-xs text-slate-500">
                      Confidence: {(sentimentData?.data as any)?.retail?.confidence || 0}%
                      {(sentimentData?.data as any)?.retail?.postsAnalyzed && (
                        <span className="ml-2">• Last {(sentimentData?.data as any).retail.postsAnalyzed} posts analyzed</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Sentiment Gauge */}
                  <div className="w-full bg-slate-700 rounded-full h-3 mb-4">
                    <div 
                      className="h-3 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${(sentimentData?.data as any)?.retail?.score || 0}%`,
                        backgroundColor: 
                          ((sentimentData?.data as any)?.retail?.score || 0) >= 60 ? '#10B981' :  // Green
                          ((sentimentData?.data as any)?.retail?.score || 0) >= 40 ? '#F59E0B' : '#EF4444'  // Yellow : Red
                      }}
                    ></div>
                  </div>
                  
                  {/* Insights Preview */}
                  {(sentimentData?.data as any)?.retail?.insights && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-slate-300">Key Insights:</h4>
                      <div className="space-y-1">
                        {(sentimentData?.data as any).retail.insights.slice(0, 2).map((insight: string, index: number) => (
                          <div key={index} className="text-xs text-slate-400 bg-slate-700/50 p-2 rounded">
                            • {insight}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Individual Subreddit Cards */}
        {sentimentLoading ? (
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <span>🏘️</span>
              Community Breakdown
              <span className="text-sm text-muted-foreground font-normal">
                (Analyzing communities...)
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {/* Loading placeholder cards for each subreddit */}
              {['r/WallStreetBets', 'r/investing', 'r/stocks', 'r/StockMarket', 'r/SecurityAnalysis', 'r/ValueInvesting'].map((name, index) => (
                <Card key={index} className="bg-[#1E2227] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)] min-h-[280px] flex flex-col">
                  <CardHeader className="pb-3 bg-gradient-to-b from-[#1E2227] to-[#181B20] rounded-t-lg">
                    <CardTitle className="text-foreground flex items-center gap-2 text-base">
                      <Skeleton className="w-6 h-6 rounded bg-muted" />
                      <Skeleton className="w-32 h-4 rounded bg-muted" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-center">
                      <Skeleton className="w-16 h-8 mx-auto mb-2 rounded bg-muted" />
                      <Skeleton className="w-20 h-4 mx-auto mb-1 rounded bg-muted" />
                      <Skeleton className="w-24 h-3 mx-auto rounded bg-muted" />
                    </div>
                    <Skeleton className="w-full h-2 rounded-full bg-muted" />
                    <div className="space-y-1">
                      <Skeleton className="w-20 h-3 rounded bg-muted" />
                      <div className="flex gap-1">
                        <Skeleton className="w-16 h-5 rounded bg-muted" />
                        <Skeleton className="w-20 h-5 rounded bg-muted" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : !sentimentLoading && (sentimentData?.data as any)?.retail?.subreddits && (sentimentData?.data as any).retail.subreddits.length > 0 && (
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <span>🏘️</span>
              Community Breakdown
              <span className="text-sm text-muted-foreground font-normal">
                ({(sentimentData?.data as any).retail.subreddits.length} communities with mentions)
              </span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">{(sentimentData?.data as any).retail.subreddits.map((subreddit: any, index: number) => {
                const getSubredditIcon = (name: string) => {
                  switch(name.toLowerCase()) {
                    case 'wallstreetbets': return '🚀';
                    case 'investing': return '📈';
                    case 'stocks': return '📊';
                    case 'stockmarket': return '🏪';
                    case 'securityanalysis': return '🔍';
                    case 'valueinvesting': return '💎';
                    default: return '💬';
                  }
                };

                const getPlatformIcon = (name: string) => {
                  // All these are Reddit communities
                  return '🔴'; // Reddit logo representation
                };

                const getSentimentColor = (score: number) => {
                  if (score >= 70) return '#34D399'; // Muted emerald-400
                  if (score >= 60) return '#10B981'; // Emerald-500
                  if (score >= 40) return '#F59E0B'; // Amber
                  if (score >= 30) return '#FB923C'; // Orange
                  return '#F87171'; // Muted rose-400
                };

                return (
                  <Card key={index} className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)] hover:from-[#232831] transition-all min-h-[280px] flex flex-col">
                    <CardHeader className="pb-3 bg-gradient-to-b from-[#1E2227] to-[#181B20] rounded-t-lg">
                      <CardTitle className="text-foreground flex items-center gap-2 text-base">
                        <span className="text-lg">{getPlatformIcon(subreddit.subreddit)}</span>
                        <span className="text-xl">{getSubredditIcon(subreddit.subreddit)}</span>
                        {subreddit.displayName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Sentiment Score */}
                      <div className="text-center">
                        <div 
                          className="text-2xl font-bold mb-1"
                          style={{ color: getSentimentColor(subreddit.score) }}
                        >
                          {subreddit.score}%
                        </div>
                        <div className="text-[#94A3B8] text-sm mb-1">
                          {subreddit.sentiment}
                        </div>
                        <div className="text-xs text-[#94A3B8]">
                          Last {subreddit.postsAnalyzed} posts analyzed • {subreddit.confidence}% confidence
                        </div>
                      </div>

                      {/* Sentiment Bar */}
                      <div className="w-full bg-[#1E2227] rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${subreddit.score}%`,
                            backgroundColor: getSentimentColor(subreddit.score)
                          }}
                        ></div>
                      </div>

                      {/* Section Divider */}
                      <div className="border-t border-[#2F343B] pt-3">
                        <h5 className="text-xs font-medium text-[#E5E7EB] mb-2">Community Style:</h5>
                        <div className="flex flex-wrap gap-1">
                          {subreddit.characteristics.slice(0, 3).map((char: string, charIndex: number) => (
                            <span 
                              key={charIndex}
                              className="text-xs bg-[#1E2227]/60 text-[#E5E7EB] px-2 py-1 rounded"
                            >
                              {char}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Top Posts Preview */}
                      {subreddit.posts && subreddit.posts.length > 0 && (
                        <div className="border-t border-[#2F343B] pt-3">
                          <h5 className="text-xs font-medium text-[#E5E7EB] mb-2">Hot Discussion:</h5>
                          <div className="text-xs text-[#94A3B8] bg-[#1E2227]/30 p-2 rounded leading-relaxed">
                            "{subreddit.posts[0].title}"
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            {/* Show insights about search coverage */}
            {(sentimentData?.data as any)?.retail?.insights && (
              <div className="mt-6 bg-card/50 rounded-lg p-4 border border-border">
                <h4 className="text-sm font-medium text-card-foreground mb-3 flex items-center gap-2">
                  <span>📊</span>
                  Search Coverage
                </h4>
                <div className="space-y-2">
                  {(sentimentData?.data as any).retail.insights.map((insight: string, index: number) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      • {insight}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* StockTwits Card */}
        {!sentimentLoading && (sentimentData?.data as any)?.retail?.stocktwits && (
          <div>
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <span>💰</span>
              Retail Trading Platform
            </h3>
            <div className="max-w-md">
              {(() => {
                const stocktwits = (sentimentData?.data as any).retail.stocktwits;
                
                const getSentimentColor = (score: number) => {
                  if (score >= 70) return '#34D399'; // Muted emerald-400
                  if (score >= 60) return '#10B981'; // Emerald-500
                  if (score >= 40) return '#F59E0B'; // Amber
                  if (score >= 30) return '#FB923C'; // Orange
                  return '#F87171'; // Muted rose-400
                };

                return (
                  <Card className="bg-[#1E2227] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.4)] transition-all min-h-[280px] flex flex-col">
                    <CardHeader className="pb-3 bg-gradient-to-b from-[#1E2227] to-[#181B20] rounded-t-lg">
                      <CardTitle className="text-foreground flex items-center gap-2 text-base">
                        <span className="text-lg">🔵</span>
                        <span className="text-xl">📱</span>
                        {stocktwits.displayName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Sentiment Score */}
                      <div className="text-center">
                        <div 
                          className="text-2xl font-bold mb-1"
                          style={{ color: getSentimentColor(stocktwits.score) }}
                        >
                          {stocktwits.score}%
                        </div>
                        <div className="text-muted-foreground text-sm mb-1">
                          {stocktwits.sentiment}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last {stocktwits.postsAnalyzed} messages analyzed • {stocktwits.confidence}% confidence
                        </div>
                      </div>

                      {/* Sentiment Bar */}
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="h-2 rounded-full transition-all duration-500 ease-out"
                          style={{
                            width: `${stocktwits.score}%`,
                            backgroundColor: getSentimentColor(stocktwits.score)
                          }}
                        ></div>
                      </div>

                      {/* Platform Characteristics */}
                      <div>
                        <h5 className="text-xs font-medium text-card-foreground mb-2">Platform Style:</h5>
                        <div className="flex flex-wrap gap-1">
                          {stocktwits.characteristics.slice(0, 3).map((char: string, charIndex: number) => (
                            <span 
                              key={charIndex}
                              className="text-xs bg-primary/20 text-primary px-2 py-1 rounded"
                            >
                              {char}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Top Messages Preview */}
                      {stocktwits.posts && stocktwits.posts.length > 0 && (
                        <div>
                          <h5 className="text-xs font-medium text-card-foreground mb-2">Recent Buzz:</h5>
                          <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded leading-relaxed">
                            "{stocktwits.posts[0].title}"
                            <div className="text-muted-foreground mt-1">
                              {stocktwits.posts[0].score}% bullish sentiment
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </div>
        )}
        
        {/* Sentiment Insights */}
        {!sentimentLoading && (
          <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)] mt-6">
            <CardHeader>
              <CardTitle className="text-foreground flex items-center gap-2">
                <span className="text-xl">🧠</span>
                Sentiment Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(() => {
                  const retailScore = (sentimentData?.data as any)?.retail?.score || 50;
                  const professionalScore = (sentimentData?.data as any)?.professional?.score || 0;
                  const isProfessionalAvailable = !(
                    (sentimentData?.data as any)?.professional?.sentiment?.includes('Not Available') || 
                    (sentimentData?.data as any)?.professional?.sentiment?.includes('Unavailable')
                  );
                  const divergence = Math.abs(retailScore - professionalScore);
                  
                  const insights = [];
                  
                  // Only show sentiment comparisons when professional data is available
                  if (isProfessionalAvailable && divergence > 20) {
                    if (retailScore > professionalScore) {
                      insights.push({
                        icon: "⚠️",
                        text: `Retail investors are significantly more bullish than professionals (${divergence.toFixed(0)} point gap)`,
                        color: "text-accent-amber"
                      });
                    } else {
                      insights.push({
                        icon: "📈",
                        text: `Professionals are more optimistic than retail investors (${divergence.toFixed(0)} point gap)`,
                        color: "text-primary"
                      });
                    }
                  } else if (isProfessionalAvailable) {
                    insights.push({
                      icon: "🤝",
                      text: "Retail and professional sentiment are aligned",
                      color: "text-bullish"
                    });
                  }
                  
                  if (retailScore >= 70) {
                    insights.push({
                      icon: "🚀",
                      text: "Strong retail momentum detected",
                      color: "text-bullish"
                    });
                  } else if (retailScore <= 30) {
                    insights.push({
                      icon: "📉",
                      text: "Retail sentiment shows significant bearishness",
                      color: "text-bearish"
                    });
                  }
                  
                  if (professionalScore >= 65) {
                    insights.push({
                      icon: "💼",
                      text: "Professional analysts maintain positive outlook",
                      color: "text-primary"
                    });
                  }
                  
                  return insights.map((insight, index) => (
                    <div key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                      <span className="text-lg">{insight.icon}</span>
                      <span className={`text-sm ${insight.color}`}>{insight.text}</span>
                    </div>
                  ));
                })()}
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="fundamentals" className="mt-6">
        <BeginnerFundamentals ticker={tickerSymbol} />
      </TabsContent>

      <TabsContent value="technical" className="mt-6">
        <TechnicalAnalysisDashboard tickerSymbol={tickerSymbol} />
      </TabsContent>



      <TabsContent value="ai" className="mt-6">
        <AIAnalysis ticker={tickerSymbol} />
      </TabsContent>
    </Tabs>
    </div>
  );
}
