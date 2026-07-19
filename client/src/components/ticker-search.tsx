import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import type { Ticker } from "@shared/schema";

interface SearchHistoryItem {
  id: string;
  tickerSymbol: string;
  ticker?: Ticker;
}

interface TickerSearchProps {
  onTickerSelect: (symbol: string) => void;
  currentTicker?: string;
}

export function TickerSearch({ onTickerSelect, currentTicker }: TickerSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const queryClient = useQueryClient();

  // Remove the API-based search results, we'll use search history instead
  const { data: searchHistory = [] } = useQuery<SearchHistoryItem[]>({
    queryKey: ["/api/search-history"],
  });

  // Filter search history based on search query and remove duplicates
  const filteredSuggestions = searchQuery.length > 0 
    ? searchHistory
        .filter(item => 
          item.tickerSymbol.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .reduce((unique, item) => {
          // Remove duplicates by ticker symbol
          const exists = unique.find(u => u.tickerSymbol === item.tickerSymbol);
          if (!exists) {
            unique.push(item);
          }
          return unique;
        }, [] as SearchHistoryItem[])
        .slice(0, 5) // Limit to 5 suggestions
    : [];

  const addToSearchHistoryMutation = useMutation({
    mutationFn: async (symbol: string) => {
      await apiRequest("POST", `/api/search-history/${symbol}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/search-history"] });
    },
  });

  const handleTickerSelect = (symbol: string) => {
    setSearchQuery(symbol);
    setShowResults(false);
    setShowHistory(false);
    onTickerSelect(symbol);
    addToSearchHistoryMutation.mutate(symbol);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Clear dropdown states
      setShowResults(false);
      setShowHistory(false);
      setHasSearched(true); // Mark that a search has been completed
      // Always use exactly what the user typed, no autocomplete
      onTickerSelect(searchQuery.trim().toUpperCase());
      addToSearchHistoryMutation.mutate(searchQuery.trim().toUpperCase());
    }
  };

  useEffect(() => {
    if (currentTicker) {
      setSearchQuery(currentTicker);
      setHasSearched(true); // Mark as searched when ticker is set
      setShowResults(false); // Ensure dropdown is hidden
      setShowHistory(false);
    }
  }, [currentTicker]);

  return (
    <div className="relative">
      <form onSubmit={handleSearch} className="relative flex gap-3">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Search for a stock..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setHasSearched(false); // Reset search completed flag when user types
              setShowResults(e.target.value.length > 0);
              setShowHistory(false);
            }}
            onBlur={() => {
              // Delay hiding results to allow for clicking
              setTimeout(() => {
                setShowResults(false);
                setShowHistory(false);
              }, 150);
            }}
            onFocus={() => {
              if (searchQuery.length > 0 && !hasSearched) {
                setShowResults(true);
                setShowHistory(false);
              } else if (searchQuery.length === 0) {
                setShowHistory(true);
                setShowResults(false);
              }
              // If hasSearched is true and searchQuery.length > 0, don't show dropdown
            }}
            className="w-full h-16 pr-14 px-4 text-lg bg-[#1E2227] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)] text-white placeholder-slate-400 focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] transition-all duration-200 rounded-lg"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white h-10 w-10 p-0"
            onClick={() => {
              if (searchQuery.length > 0 && !hasSearched) {
                setShowResults(true);
                setShowHistory(false);
              } else if (searchQuery.length === 0) {
                setShowHistory(true);
                setShowResults(false);
              }
              // If hasSearched is true, don't show dropdown
            }}
          >
            <Search className="h-5 w-5" />
          </Button>
        </div>
        <Button
          type="submit"
          className="h-16 px-8 bg-[#2563EB] hover:bg-[#1E40AF] text-white font-semibold shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-200 rounded-lg"
          disabled={!searchQuery.trim()}
        >
          Search
        </Button>
      </form>

      {/* Search Suggestions Dropdown (from search history) */}
      {showResults && searchQuery.length > 0 && (
        <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto" style={{ width: 'calc(100% - 7rem)' }}>
          {filteredSuggestions.length === 0 ? (
            <div className="p-3 text-slate-400 text-sm">No matching previous searches</div>
          ) : (
            filteredSuggestions.map((item) => (
              <button
                key={item.id}
                className="w-full text-left p-3 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
                onClick={() => handleTickerSelect(item.tickerSymbol)}
              >
                <div>
                  <div className="font-medium text-white">{item.tickerSymbol}</div>
                  <div className="text-sm text-slate-400 truncate">
                    {item.ticker?.name || `${item.tickerSymbol} Inc.`}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Previously Searched Dropdown */}
      {showHistory && searchQuery.length === 0 && (
        <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto" style={{ width: 'calc(100% - 7rem)' }}>
          {searchHistory.length === 0 ? (
            <div className="p-3 text-slate-400 text-sm">No recent searches</div>
          ) : (
            <>
              <div className="p-2 border-b border-slate-700">
                <div className="text-xs text-slate-400 font-medium uppercase tracking-wide">Previously Searched</div>
              </div>
              {searchHistory
                .reduce((unique, item) => {
                  // Remove duplicates by ticker symbol
                  const exists = unique.find(u => u.tickerSymbol === item.tickerSymbol);
                  if (!exists) {
                    unique.push(item);
                  }
                  return unique;
                }, [] as SearchHistoryItem[])
                .slice(0, 5)
                .map((item) => (
                <button
                  key={item.id}
                  className="w-full text-left p-3 hover:bg-slate-700 transition-colors border-b border-slate-700 last:border-b-0"
                  onClick={() => handleTickerSelect(item.tickerSymbol)}
                >
                  <div>
                    <div className="font-medium text-white">{item.tickerSymbol}</div>
                    {item.ticker && item.ticker.name && (
                      <div className="text-sm text-slate-400 truncate">{item.ticker.name}</div>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
