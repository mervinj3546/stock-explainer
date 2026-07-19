import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ChartLine, TrendingUp, Shield, Zap, BarChart3, Brain, Users, Target, Globe, Clock, Search, AlertCircle } from "lucide-react";
import { ContentTabs } from "@/components/content-tabs";
import { OverallSummaryBadge } from "@/components/OverallSummaryBadge";

const FREE_TICKERS = ["TSLA", "NVDA", "AAPL"];

export default function HomePage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicker, setSelectedTicker] = useState<string>("");
  const [showError, setShowError] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const ticker = searchQuery.toUpperCase().trim();
    
    if (!ticker) return;

    if (FREE_TICKERS.includes(ticker)) {
      setSelectedTicker(ticker);
      setShowError(false);
    } else {
      setShowError(true);
      setSelectedTicker("");
    }
  };

  const handleTickerClick = (ticker: string) => {
    setSearchQuery(ticker);
    setSelectedTicker(ticker);
    setShowError(false);
  };

  const handleSignUp = () => {
    setLocation("/login");
  };

  // If a ticker is selected, show the analysis dashboard
  if (selectedTicker) {
    return (
      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="bg-card border-b border-border px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                <ChartLine className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-xl font-bold text-primary">Should I buy this stock</h1>
            </div>

            {/* Navigation Items */}
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSelectedTicker("");
                  setSearchQuery("");
                  setShowError(false);
                }}
                className="text-muted-foreground hover:text-primary"
              >
                ← Back to Try Demo
              </Button>
              <Link href="/login">
                <Button className="btn-premium">
                  Sign Up for Full Access
                </Button>
              </Link>
            </div>
          </div>
        </nav>

        {/* Ticker Header */}
        <div className="bg-card border-b border-border py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h2 className="text-2xl font-bold text-primary">{selectedTicker}</h2>
                {selectedTicker && (
                  <OverallSummaryBadge ticker={selectedTicker} />
                )}
              </div>
              <Badge variant="outline" className="text-primary border-primary">
                Free Trial
              </Badge>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <ContentTabs tickerSymbol={selectedTicker} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
              <ChartLine className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-primary">Should I buy this stock</h1>
          </div>

          {/* Navigation Items */}
          <div className="flex items-center space-x-6">
            <Link href="/pricing">
              <Button variant="ghost" className="text-muted-foreground hover:text-primary">
                Pricing
              </Button>
            </Link>
            <Link href="/how-to-use">
              <Button variant="ghost" className="text-muted-foreground hover:text-primary">
                How to use this site
              </Button>
            </Link>
            <Link href="/about">
              <Button variant="ghost" className="text-muted-foreground hover:text-primary">
                About us
              </Button>
            </Link>
            <Link href="/login">
              <Button className="btn-premium">
                Login now
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Interactive Demo Section */}
      <div className="py-16" style={{ backgroundColor: '#0E1013' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Is This Stock a Smart Buy Right Now?
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Get a complete view of any stock with AI powered insights, technical indicators, 
            fundamentals and real time sentiment analysis all in one place.
          </p>

          {/* Main Layout - Flexbox with proper proportions */}
          <div className="max-w-6xl mx-auto mb-6">
            <div className="flex items-start gap-3">
              {/* Column 1: Search Bar + Text + Tickers (11/16 = ~68.75%) */}
              <div className="flex-1" style={{ flex: '11' }}>
                {/* Search Bar */}
                <form onSubmit={handleSearch} className="mb-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search for a stock..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-3 text-lg bg-gray-800 border-gray-700 text-white placeholder-gray-400 w-full h-[52px]"
                    />
                  </div>
                </form>

                {/* Text centered to search bar */}
                <div className="text-center mb-4">
                  <p className="text-sm text-gray-400 mb-4">
                    See it in action and analyze these stocks for free before signing up
                  </p>
                  
                  {/* Free Tickers centered to text */}
                  <div className="flex justify-center gap-3">
                    {FREE_TICKERS.map((ticker) => (
                      <Button
                        key={ticker}
                        variant="outline"
                        onClick={() => handleTickerClick(ticker)}
                        className="font-semibold bg-gray-800 border-gray-600 text-white hover:bg-primary hover:text-white hover:border-primary transition-colors"
                      >
                        {ticker}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Column 2: Try Now Button (2/16 = ~12.5%) */}
              <div className="flex-shrink-0" style={{ flex: '2' }}>
                <Button 
                  onClick={handleSearch} 
                  variant="ghost"
                  className="px-8 py-3 text-white hover:bg-gray-800 border border-gray-600 text-sm whitespace-nowrap w-full h-[52px]"
                >
                  Try Now
                </Button>
              </div>

              {/* Column 3: Sign Up/Login Button (3/16 = ~18.75%) */}
              <div className="flex-shrink-0" style={{ flex: '3' }}>
                <Link href="/login" className="w-full">
                  <Button className="btn-premium px-8 py-3 w-full text-center h-[52px]">
                    Sign Up Free
                  </Button>
                </Link>
                <p className="text-xs text-gray-500 mt-2 text-center leading-tight">
                  Sign up to see complete stock insights with no limits.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {showError && (
            <Alert className="max-w-md mx-auto mb-6 border-orange-500/50 bg-orange-500/10">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <AlertDescription className="text-orange-300">
                This ticker requires a premium account. 
                <Button 
                  variant="link" 
                  className="p-0 h-auto font-semibold text-orange-400 hover:text-orange-300"
                  onClick={handleSignUp}
                >
                  Sign up for full access
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-muted">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold text-primary mb-6">
              Features that you will love
            </h2>
            <p className="text-secondary text-xl max-w-3xl mx-auto">
              We have the largest collection of tools for all kinds of traders
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {/* Know when to buy */}
            <div className="card-premium p-8 rounded-xl">
              <div className="h-14 w-14 bg-accent-blue rounded-xl flex items-center justify-center mb-6">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-4">Know when to buy</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Use technical analysis with EMA crossovers, MACD signals, and RSI indicators to know exactly when to buy, sell, or do nothing.
              </p>
              <div className="mt-6 bg-background rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-primary font-semibold">AAPL Analysis</span>
                  <span className="bg-bullish text-white px-2 py-1 rounded text-xs font-bold">STRONG BUY</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EMA Alignment</span>
                    <span className="text-bullish">✓ Bullish (Strength: 5)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MACD Signal</span>
                    <span className="text-bullish">✓ Bullish Crossover</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">RSI (47.2)</span>
                    <span className="text-bullish">✓ Healthy Momentum</span>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border">
                    <div className="text-accent-blue text-sm">Confidence: 87%</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comprehensive Sentiment Analysis */}
            <div className="card-premium p-8 rounded-xl">
              <div className="h-14 w-14 bg-accent-purple rounded-xl flex items-center justify-center mb-6">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-4">Comprehensive Sentiment Analysis</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Compare retail investors vs professionals across Reddit, StockTwits, and financial news with real-time AI analysis.
              </p>
              <div className="mt-6 bg-background rounded-lg p-4 border border-border">
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary text-sm">Retail Sentiment</span>
                    <span className="text-bullish font-bold">73% Bullish</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div className="bg-bullish h-2 rounded-full" style={{width: '73%'}}></div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-secondary text-sm">Professional Sentiment</span>
                    <span className="text-accent-blue font-bold">68% Bullish</span>
                  </div>
                  <div className="w-full bg-border rounded-full h-2">
                    <div className="bg-accent-blue h-2 rounded-full" style={{width: '68%'}}></div>
                  </div>
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="text-xs text-muted-foreground mb-2">Live Sources:</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">r/investing</span>
                      <span className="text-bullish">67%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">StockTwits</span>
                      <span className="text-accent-blue">64%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">r/stocks</span>
                      <span className="text-bullish">71%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Financial News</span>
                      <span className="text-accent-amber">69%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Investment Analysis */}
            <div className="card-premium p-8 rounded-xl">
              <div className="h-14 w-14 bg-accent-teal rounded-xl flex items-center justify-center mb-6">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-4">AI Investment Analysis</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Comprehensive AI-powered investment thesis combining technical analysis, sentiment data, and fundamental insights.
              </p>
              <div className="mt-6 bg-background rounded-lg p-4 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-primary font-semibold">AI Recommendation</span>
                  <span className="bg-bullish text-white px-2 py-1 rounded text-xs font-bold">BUY</span>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Investment Thesis</span>
                    <span className="text-bullish">✓ Strong Bullish</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk Assessment</span>
                    <span className="text-accent-amber">⚠ Moderate</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valuation</span>
                    <span className="text-accent-blue">ℹ Fair Value</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Market Outlook</span>
                    <span className="text-bullish">✓ Positive</span>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-border">
                  <div className="text-muted-foreground text-xs">AI combines 15+ data points for comprehensive analysis</div>
                </div>
              </div>
            </div>
          </div>

          {/* Second Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Interactive Charts & Indicators */}
            <div className="card-premium p-8 rounded-xl">
              <div className="h-14 w-14 bg-accent-teal rounded-xl flex items-center justify-center mb-6">
                <TrendingUp className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-4">Interactive Financial Charts</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                TradingView integration plus custom EMA, MACD, and RSI charts with 6 months of historical data.
              </p>
              <div className="mt-6 bg-background rounded-lg p-4 border border-border">
                <div className="text-primary font-semibold mb-3">Current Indicators</div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="text-center">
                    <div className="text-accent-blue font-bold">$178.42</div>
                    <div className="text-muted-foreground">EMA 8</div>
                  </div>
                  <div className="text-center">
                    <div className="text-bearish font-bold">$175.83</div>
                    <div className="text-muted-foreground">EMA 21</div>
                  </div>
                  <div className="text-center">
                    <div className="text-accent-purple font-bold">$172.91</div>
                    <div className="text-muted-foreground">EMA 34</div>
                  </div>
                  <div className="text-center">
                    <div className="text-bullish font-bold">47.2</div>
                    <div className="text-muted-foreground">RSI</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comprehensive Stock Research */}
            <div className="card-premium p-8 rounded-xl">
              <div className="h-14 w-14 bg-accent-amber rounded-xl flex items-center justify-center mb-6">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-4">Complete Stock Research Hub</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Everything you need: fundamentals, news, AI analysis, technical signals, and sentiment - all in one dashboard.
              </p>
              <div className="mt-6 bg-background rounded-lg p-4 border border-border">
                <div className="text-primary font-semibold mb-3">Research Categories</div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-accent-blue rounded-full"></div>
                    <span className="text-secondary">Primary Details & News</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-accent-purple rounded-full"></div>
                    <span className="text-secondary">AI Investment Analysis</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-bullish rounded-full"></div>
                    <span className="text-secondary">Financial Fundamentals</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-accent-amber rounded-full"></div>
                    <span className="text-secondary">Technical Analysis</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-accent-rose rounded-full"></div>
                    <span className="text-secondary">Sentiment Comparison</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Investment Tracking */}
            <div className="card-premium p-8 rounded-xl">
              <div className="h-14 w-14 bg-accent-blue rounded-xl flex items-center justify-center mb-6">
                <Target className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-primary mb-4">Personal Investment Tracker</h3>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Save your favorite stocks to watchlist, track search history, and get personalized investment insights.
              </p>
              <div className="mt-6 bg-background rounded-lg p-4 border border-border">
                <div className="text-primary font-semibold mb-3">Your Portfolio Insights</div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Watchlist Items</span>
                    <span className="text-primary">12 stocks</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Recent Searches</span>
                    <span className="text-primary">8 tickers</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Avg Sentiment</span>
                    <span className="text-bullish">68% Bullish</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Strong Buy Signals</span>
                    <span className="text-bullish">3 stocks</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-primary mb-4">
            Ready to Make Better Investment Decisions?
          </h2>
          <p className="text-secondary text-lg mb-8">
            Join thousands of investors who use our platform to analyze stocks before buying.
          </p>
          <Link href="/login">
            <Button size="lg" className="btn-premium px-8 py-3">
              Start Analyzing Stocks Now
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                <ChartLine className="h-5 w-5 text-white" />
              </div>
              <span className="text-primary font-semibold">Should I buy this stock</span>
            </div>
            <div className="text-muted-foreground text-sm">
              © 2025 Should I buy this stock. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}