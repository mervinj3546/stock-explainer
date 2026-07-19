import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartLine, User } from "lucide-react";
import { useAuth, useLogout } from "@/hooks/use-auth";
import { getInitials } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Sidebar } from "@/components/sidebar";
import { TickerSearch } from "@/components/ticker-search";
import { ContentTabs } from "@/components/content-tabs";
import { OverallSummaryBadge } from "@/components/OverallSummaryBadge";
import LandingPage from "@/pages/landing";
import type { Ticker } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  const logoutMutation = useLogout();
  const [currentTicker, setCurrentTicker] = useState<string>("");

  const { data: tickerData, isLoading: tickerLoading } = useQuery<Ticker>({
    queryKey: ["/api/tickers", currentTicker],
    enabled: !!currentTicker,
  });

  const handleTickerSelect = (symbol: string) => {
    setCurrentTicker(symbol.toUpperCase());
  };

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

  // Show landing page when no ticker is selected
  if (!currentTicker) {
    return <LandingPage onTickerSelect={handleTickerSelect} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="bg-card border-b border-border px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Title */}
          <div className="flex items-center space-x-4">
            <div className="h-10 w-10 bg-gradient-to-r from-accent-teal to-primary rounded-lg flex items-center justify-center">
              <ChartLine className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-primary">Should I buy this stock</h1>
          </div>

          {/* User Profile */}
          <div className="flex items-center space-x-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-accent-purple hover:shadow-lg hover:shadow-primary/25 transition-all duration-200">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-transparent text-white">
                      {user ? getInitials(user) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-card border-border" align="end">
                <DropdownMenuItem className="text-card-foreground hover:bg-card-hover">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => logoutMutation.mutate()}
                  className="text-destructive hover:bg-card-hover hover:text-destructive"
                >
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* Centered Search Bar */}
      <div className="bg-card border-b border-border py-4">
        <div className="max-w-lg mx-auto px-4">
          <TickerSearch onTickerSelect={handleTickerSelect} currentTicker={currentTicker} />
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex">
        {/* Sidebar */}
        <Sidebar onTickerSelect={handleTickerSelect} currentTicker={currentTicker} />

        {/* Main Content */}
        <div className="flex-1 p-6">
          {/* Current Ticker Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between p-6 bg-gradient-to-b from-[#1E2227] to-[#181B20] border border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)] rounded-lg">
              <div className="flex items-center space-x-6">
                <h2 className="text-4xl font-bold text-foreground">{currentTicker}</h2>
                {tickerData && (
                  <span className="text-xl text-muted-foreground">{tickerData.name}</span>
                )}
                {currentTicker && (
                  <OverallSummaryBadge ticker={currentTicker} />
                )}
              </div>
              <div className="text-right">
                {tickerLoading ? (
                  <div className="animate-pulse">
                    <div className="h-10 bg-muted rounded w-32 mb-2"></div>
                    <div className="h-6 bg-muted rounded w-24"></div>
                  </div>
                ) : tickerData ? (
                  <>
                    <div className="text-3xl font-bold text-foreground">
                      {formatPrice(tickerData.price)}
                    </div>
                    <div className={`text-lg font-semibold ${getChangeColor(tickerData.change)}`}>
                      {formatChange(tickerData.change, tickerData.changePercent)}
                    </div>
                  </>
                ) : (
                  <div className="text-muted-foreground">No data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Content Tabs */}
          {currentTicker && <ContentTabs tickerSymbol={currentTicker} />}
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#14171C] border-t border-border px-6 py-10 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-foreground font-semibold mb-4">Explain This Ticker</h3>
              <p className="text-muted-foreground text-sm">Financial intelligence platform for smart investors.</p>
            </div>
            <div>
              <h4 className="text-foreground font-medium mb-3">Platform</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-card-foreground transition-colors">Features</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-card-foreground transition-colors">Pricing</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-card-foreground transition-colors">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-foreground font-medium mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-card-foreground transition-colors">About</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-card-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-card-foreground transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-foreground font-medium mb-3">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-muted-foreground hover:text-card-foreground transition-colors">Help Center</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-card-foreground transition-colors">Contact</a></li>
                <li><a href="#" className="text-muted-foreground hover:text-card-foreground transition-colors">Privacy</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-muted-foreground text-sm">&copy; 2024 Explain This Ticker. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
