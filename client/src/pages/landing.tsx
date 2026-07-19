import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartLine, User, Star, Clock, TrendingUp } from "lucide-react";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { getInitials } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { TickerSearch } from "@/components/ticker-search";
import { TickerLimitModal } from "@/components/TickerLimitModal";
import type { Ticker } from "@shared/schema";

interface WatchlistItem {
  id: string;
  tickerSymbol: string;
  ticker: Ticker;
}

interface SearchHistoryItem {
  id: string;
  tickerSymbol: string;
  ticker: Ticker;
  searchedAt: string;
}

interface UserUsage {
  usage: any[];
  usageCount: number;
  remainingLimit: number;
  tier: string;
  isLimitReached: boolean;
  tickersUsed: number;
  tickerLimit: number;
}

// Common popular tickers for fallback
const POPULAR_TICKERS = [
  { symbol: "AAPL", name: "Apple Inc." },
  { symbol: "MSFT", name: "Microsoft Corporation" },
  { symbol: "NVDA", name: "NVIDIA Corporation" },
  { symbol: "TSLA", name: "Tesla, Inc." },
  { symbol: "AMZN", name: "Amazon.com, Inc." },
  { symbol: "GOOGL", name: "Alphabet Inc." },
  { symbol: "META", name: "Meta Platforms, Inc." },
  { symbol: "BRK.B", name: "Berkshire Hathaway Inc." }
];

interface LandingPageProps {
  onTickerSelect: (symbol: string) => void;
}

export default function LandingPage({ onTickerSelect }: LandingPageProps) {
  const { user } = useAuth();
  const logoutMutation = useLogout();

  // Fetch watchlist
  const { data: watchlist = [] } = useQuery<WatchlistItem[]>({
    queryKey: ["/api/watchlist"],
  });

  // Fetch search history
  const { data: searchHistory = [] } = useQuery<SearchHistoryItem[]>({
    queryKey: ["/api/search-history"],
  });

  // Fetch user usage to check if limit is reached
  const { data: userUsage } = useQuery<UserUsage>({
    queryKey: ["/api/user/usage"],
  });

  // Show modal if user has hit their limit
  const showLimitModal = userUsage?.isLimitReached && user?.tier !== 'admin';

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}$${Math.abs(change).toFixed(2)} (${sign}${changePercent.toFixed(2)}%)`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-bullish' : 'text-bearish';
  };

  const handleTickerSelect = (symbol: string) => {
    onTickerSelect(symbol.toUpperCase());
  };

  const handleUpgrade = () => {
    window.location.href = '/pricing';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="bg-card border-b border-border px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 bg-gradient-to-r from-accent-teal to-accent-blue rounded-lg flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.3)]">
              <ChartLine className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-primary">Should I buy this stock</h1>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 rounded-full bg-gradient-to-r from-accent-blue to-accent-purple hover:shadow-lg hover:shadow-accent-blue/25 transition-all duration-200">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-transparent text-white">
                      {user ? getInitials(user) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border" align="end">
                <DropdownMenuItem className="text-secondary hover:bg-muted">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  className="text-accent-rose hover:bg-muted hover:text-accent-rose"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-primary mb-4">
            Welcome back, {user?.firstName || 'Investor'}
          </h2>
          <p className="text-xl text-muted-foreground">
            Search for any stock to get comprehensive analysis and insights
          </p>
        </div>

        {/* Centered Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <div className="relative">
            <TickerSearch onTickerSelect={handleTickerSelect} />
          </div>
        </div>

        {/* Content Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Favorites Section */}
          {watchlist.length > 0 && (
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center text-primary">
                  <Star className="h-5 w-5 mr-2 text-accent-amber" />
                  Your Favorites
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {watchlist.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted hover:bg-border rounded-lg cursor-pointer transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                    onClick={() => handleTickerSelect(item.tickerSymbol)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-primary font-semibold">
                        {item.tickerSymbol}
                      </div>
                      <div className="text-secondary text-sm">
                        {item.ticker?.name || `${item.tickerSymbol} Inc.`}
                      </div>
                    </div>
                    {item.ticker && (
                      <div className="text-right">
                        <div className="text-primary font-medium">
                          {formatPrice(item.ticker.price)}
                        </div>
                        <div className={`text-sm ${getChangeColor(item.ticker.change)}`}>
                          {formatChange(item.ticker.change, item.ticker.changePercent)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recently Searched Section */}
          {searchHistory.length > 0 && (
            <Card className="card-premium">
              <CardHeader>
                <CardTitle className="flex items-center text-primary">
                  <Clock className="h-5 w-5 mr-2 text-accent-blue" />
                  Recently Searched
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {searchHistory.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 bg-muted hover:bg-border rounded-lg cursor-pointer transition-colors shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                    onClick={() => handleTickerSelect(item.tickerSymbol)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="text-primary font-semibold">
                        {item.tickerSymbol}
                      </div>
                      <div className="text-secondary text-sm">
                        {item.ticker?.name || `${item.tickerSymbol} Inc.`}
                      </div>
                    </div>
                    {item.ticker && (
                      <div className="text-right">
                        <div className="text-primary font-medium">
                          {formatPrice(item.ticker.price)}
                        </div>
                        <div className={`text-sm ${getChangeColor(item.ticker.change)}`}>
                          {formatChange(item.ticker.change, item.ticker.changePercent)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Popular Tickers Fallback - Show ONLY when no favorites AND no recent searches */}
        {watchlist.length === 0 && searchHistory.length === 0 && (
          <Card className="card-premium mt-8">
            <CardHeader>
              <CardTitle className="flex items-center text-primary">
                <TrendingUp className="h-5 w-5 mr-2 text-accent-teal" />
                Popular Stocks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {POPULAR_TICKERS.map((ticker) => (
                  <div
                    key={ticker.symbol}
                    className="p-4 bg-muted hover:bg-border rounded-lg cursor-pointer transition-colors text-center shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
                    onClick={() => handleTickerSelect(ticker.symbol)}
                  >
                    <div className="text-primary font-semibold text-lg mb-1">
                      {ticker.symbol}
                    </div>
                    <div className="text-secondary text-sm">
                      {ticker.name}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-card border-t border-border px-6 py-8 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-primary font-semibold mb-4">Explain This Ticker</h3>
              <p className="text-muted-foreground text-sm">Financial intelligence platform for smart investors.</p>
            </div>
            <div>
              <h4 className="text-primary font-medium mb-3">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">Features</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-primary font-medium mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">About</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">Blog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-primary font-medium mb-3">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">Contact</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-secondary transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-muted-foreground text-sm">&copy; 2024 Explain This Ticker. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Ticker Limit Modal */}
      <TickerLimitModal 
        isOpen={showLimitModal || false}
        onUpgrade={handleUpgrade}
      />
    </div>
  );
}
