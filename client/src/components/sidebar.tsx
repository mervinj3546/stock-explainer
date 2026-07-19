import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UsageTracker } from "@/components/usage-tracker";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Ticker } from "@shared/schema";

interface SidebarProps {
  onTickerSelect: (symbol: string) => void;
  currentTicker?: string;
}

interface WatchlistItem {
  id: string;
  tickerSymbol: string;
  ticker?: Ticker;
}

interface SearchHistoryItem {
  id: string;
  tickerSymbol: string;
  ticker?: Ticker;
}

export function Sidebar({ onTickerSelect, currentTicker }: SidebarProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const { data: searchHistory = [] } = useQuery<SearchHistoryItem[]>({
    queryKey: ["/api/search-history"],
  });

  const { data: watchlist = [] } = useQuery<WatchlistItem[]>({
    queryKey: ["/api/watchlist"],
  });

  const addToWatchlistMutation = useMutation({
    mutationFn: async (symbol: string) => {
      await apiRequest("POST", `/api/watchlist/${symbol}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Success",
        description: "Added to watchlist",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (symbol: string) => {
      await apiRequest("DELETE", `/api/watchlist/${symbol}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
      toast({
        title: "Success",
        description: "Removed from watchlist",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(price);
  };

  const formatChange = (change: number, changePercent: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${changePercent.toFixed(2)}%`;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-500' : 'text-red-500';
  };

  const isInWatchlist = (symbol: string) => {
    return watchlist.some(item => item.tickerSymbol === symbol);
  };

  const handleWatchlistToggle = (symbol: string) => {
    if (isInWatchlist(symbol)) {
      removeFromWatchlistMutation.mutate(symbol);
    } else {
      addToWatchlistMutation.mutate(symbol);
    }
  };

  return (
    <div className="w-80 bg-sidebar-card min-h-screen border-r border-slate-700 p-6 hidden lg:block">
      <Tabs defaultValue="favorites" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-transparent border-0 p-0 h-auto gap-1 mb-6">
          <TabsTrigger 
            value="favorites" 
            className="flex items-center justify-center px-4 py-3 bg-transparent border-0 text-gray-400 data-[state=active]:text-[#2563EB] data-[state=active]:bg-[#2563EB]/10 data-[state=active]:font-bold hover:text-white transition-all duration-200 rounded-lg relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#2563EB] after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity after:duration-200 font-medium text-sm"
          >
            Favorites
          </TabsTrigger>
          <TabsTrigger 
            value="recent" 
            className="flex items-center justify-center px-4 py-3 bg-transparent border-0 text-gray-400 data-[state=active]:text-[#2563EB] data-[state=active]:bg-[#2563EB]/10 data-[state=active]:font-bold hover:text-white transition-all duration-200 rounded-lg relative after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-[#2563EB] after:opacity-0 data-[state=active]:after:opacity-100 after:transition-opacity after:duration-200 font-medium text-sm"
          >
            Recently Searched
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favorites" className="mt-0">
          <div className="space-y-2">
            {watchlist.length === 0 ? (
              <p className="text-slate-400 text-sm">No favorites yet</p>
            ) : (
              watchlist.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg hover:bg-[#232831] transition-colors cursor-pointer ${
                    currentTicker === item.tickerSymbol ? 'bg-[#232831]' : 'bg-[#374151]'
                  }`}
                  onClick={() => onTickerSelect(item.tickerSymbol)}
                >
                  <div className="flex-1">
                    <span className="font-medium text-white">{item.tickerSymbol}</span>
                    {item.ticker && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-slate-200">{formatPrice(item.ticker.price)}</span>
                        <span className={`text-sm ${getChangeColor(item.ticker.change)}`}>
                          {formatChange(item.ticker.change, item.ticker.changePercent)}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 text-yellow-500 hover:text-yellow-400 hover:bg-slate-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWatchlistToggle(item.tickerSymbol);
                    }}
                  >
                    <Star className="h-4 w-4 fill-current" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="mt-0">
          <div className="space-y-2">
            {searchHistory.length === 0 ? (
              <p className="text-slate-400 text-sm">No recent searches</p>
            ) : (
              searchHistory.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center justify-between p-3 rounded-lg hover:bg-[#232831] transition-colors cursor-pointer ${
                    currentTicker === item.tickerSymbol ? 'bg-[#232831]' : 'bg-[#374151]'
                  }`}
                  onClick={() => onTickerSelect(item.tickerSymbol)}
                >
                  <div className="flex-1">
                    <span className="font-medium text-white">{item.tickerSymbol}</span>
                    {item.ticker && (
                      <div className="flex justify-between items-center mt-1">
                        <span className="text-sm text-slate-200">{formatPrice(item.ticker.price)}</span>
                        <span className={`text-sm ${getChangeColor(item.ticker.change)}`}>
                          {formatChange(item.ticker.change, item.ticker.changePercent)}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`ml-2 hover:bg-slate-600 ${
                      isInWatchlist(item.tickerSymbol) 
                        ? 'text-yellow-500 hover:text-yellow-400' 
                        : 'text-slate-400 hover:text-yellow-500'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWatchlistToggle(item.tickerSymbol);
                    }}
                  >
                    {isInWatchlist(item.tickerSymbol) ? (
                      <Star className="h-4 w-4 fill-current" />
                    ) : (
                      <Star className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Usage Tracker for authenticated users */}
      {isAuthenticated && (
        <div className="mt-4">
          <UsageTracker />
        </div>
      )}
    </div>
  );
}
