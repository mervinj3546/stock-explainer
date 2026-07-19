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

export interface FastStockData {
  ticker: string;
  quote: QuoteData;
  news: NewsItem[];
}

async function fetchFastStockData(ticker: string): Promise<FastStockData> {
  const response = await fetch(`/api/stock/fast?ticker=${encodeURIComponent(ticker)}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch stock data');
  }
  
  return response.json();
}

export function useFastStockData(ticker: string | null) {
  return useQuery({
    queryKey: ['fastStockData', ticker],
    queryFn: () => fetchFastStockData(ticker!),
    enabled: !!ticker && ticker.length > 0,
    staleTime: 2 * 60 * 1000, // Consider data fresh for 2 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 (ticker not found) or 400 (bad request)
      if (error instanceof Error && error.message.includes('No data found')) {
        return false;
      }
      return failureCount < 3;
    }
  });
}

export type { NewsItem, QuoteData };
