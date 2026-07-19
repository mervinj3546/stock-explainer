import { useQuery } from '@tanstack/react-query';

interface NewsItem {
  headline: string;
  summary: string;
  url: string;
  datetime: number;
}

interface QuoteData {
  c: number; // Current price
  h: number; // High price of the day
  l: number; // Low price of the day
  o: number; // Open price
  pc: number; // Previous close
}

interface YTDData {
  priceOnJan1: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  growthPct: number | null;
}

export interface StockData {
  ticker: string;
  quote: QuoteData;
  news: NewsItem[];
  ytd: YTDData;
}

async function fetchStockData(ticker: string): Promise<StockData> {
  const response = await fetch(`/api/stock/basic?ticker=${encodeURIComponent(ticker)}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch stock data');
  }
  
  return response.json();
}

export function useStockData(ticker: string | null) {
  return useQuery({
    queryKey: ['stockData', ticker],
    queryFn: () => fetchStockData(ticker!),
    enabled: !!ticker && ticker.length > 0,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 (ticker not found) or 400 (bad request)
      if (error instanceof Error && error.message.includes('No data found')) {
        return false;
      }
      return failureCount < 3;
    }
  });
}

export type { NewsItem, QuoteData, YTDData };
