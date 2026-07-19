import { useQuery } from "@tanstack/react-query";

interface TechnicalData {
  ema8: number[];
  ema21: number[];
  ema34: number[];
  ema50: number[];
  macd: number[];
  signal: number[];
  histogram: number[];
  rsi: number[];
  bollingerUpper: number[];
  bollingerMiddle: number[];
  bollingerLower: number[];
  atr: number[];
  obv: number[];
  donchianUpper: number[];
  donchianLower: number[];
  prices: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

async function fetchTechnicalIndicators(ticker: string): Promise<TechnicalData> {
  console.log(`🔍 Fetching technical indicators for ${ticker}...`);
  const response = await fetch(`/api/stock/technical?ticker=${ticker}`);
  
  console.log(`📡 Technical indicators response for ${ticker}:`, response.status, response.statusText);
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ Technical indicators failed for ${ticker}:`, errorText);
    throw new Error(`Failed to fetch technical indicators: ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log(`✅ Technical indicators loaded for ${ticker}:`, Object.keys(data));
  return data;
}

export function useTechnicalIndicators(ticker: string) {
  const result = useQuery<TechnicalData, Error>({
    queryKey: ["/api/stock/technical", ticker],
    queryFn: () => fetchTechnicalIndicators(ticker),
    enabled: !!ticker,
    staleTime: 15 * 60 * 1000, // 15 minutes - longer cache due to rate limiting
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in memory longer
    retry: 1, // Only retry once due to rate limiting
    retryDelay: 30000, // Wait 30 seconds before retry
  });

  console.log(`🎯 Technical indicators hook for ${ticker}:`, {
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error?.message,
    dataKeys: result.data ? Object.keys(result.data) : 'no data'
  });

  return result;
}
