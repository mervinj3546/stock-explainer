import { useQuery } from '@tanstack/react-query';

export interface YTDData {
  priceOnJan1: number | null;
  yearHigh: number | null;
  yearLow: number | null;
  growthPct: number | null;
  currentPrice: number;
}

async function fetchYTDData(ticker: string): Promise<YTDData> {
  const response = await fetch(`/api/stock/ytd?ticker=${encodeURIComponent(ticker)}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch YTD data');
  }
  
  return response.json();
}

export function useYTDData(ticker: string | null) {
  return useQuery({
    queryKey: ['ytdData', ticker],
    queryFn: () => fetchYTDData(ticker!),
    enabled: !!ticker && ticker.length > 0,
    staleTime: 10 * 60 * 1000, // Consider YTD data fresh for 10 minutes
    retry: (failureCount, error) => {
      // Don't retry on 404 (ticker not found) or 400 (bad request)
      if (error instanceof Error && (error.message.includes('404') || error.message.includes('400'))) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: 2000,
  });
}
