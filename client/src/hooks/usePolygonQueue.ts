import { useState, useEffect } from 'react';

interface QueueStatus {
  position: number;
  estimatedWaitSeconds: number;
  isQueued: boolean;
  ticker?: string;
  type?: string;
}

interface UsePolygonQueueOptions {
  ticker?: string;
  type?: 'technical' | 'quote' | 'news';
  pollInterval?: number; // milliseconds
  enabled?: boolean;
}

export function usePolygonQueue({
  ticker,
  type = 'technical',
  pollInterval = 5000, // Poll every 5 seconds
  enabled = true
}: UsePolygonQueueOptions = {}) {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQueueStatus = async () => {
    if (!ticker || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/polygon/queue/${ticker}?type=${type}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setQueueStatus({
        position: data.position,
        estimatedWaitSeconds: data.estimatedWaitSeconds,
        isQueued: data.isQueued,
        ticker: data.ticker,
        type: data.type
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch queue status');
      console.error('Error fetching queue status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (ticker && enabled) {
      fetchQueueStatus();
    }
  }, [ticker, type, enabled]);

  // Polling
  useEffect(() => {
    if (!ticker || !enabled || !queueStatus?.isQueued) return;

    const interval = setInterval(fetchQueueStatus, pollInterval);
    return () => clearInterval(interval);
  }, [ticker, type, enabled, pollInterval, queueStatus?.isQueued]);

  // Stop polling when queue is empty
  useEffect(() => {
    if (queueStatus && !queueStatus.isQueued) {
      // Stop polling after the queue is cleared
      const timeout = setTimeout(() => {
        setQueueStatus(null);
      }, 2000); // Give 2 seconds before clearing status

      return () => clearTimeout(timeout);
    }
  }, [queueStatus?.isQueued]);

  return {
    queueStatus,
    isLoading,
    error,
    refetch: fetchQueueStatus,
    // Computed values for easier use
    isInQueue: queueStatus?.isQueued ?? false,
    position: queueStatus?.position ?? 0,
    estimatedWaitTime: queueStatus?.estimatedWaitSeconds ?? 0,
    estimatedWaitMinutes: Math.ceil((queueStatus?.estimatedWaitSeconds ?? 0) / 60)
  };
}

// Higher-level hook for technical analysis state (simplified - no queue UI)
export function useTechnicalAnalysisState(ticker?: string) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startAnalysis = (tickerSymbol: string) => {
    setIsAnalyzing(true);
    setAnalysisComplete(false);
    setError(null);
  };

  const completeAnalysis = () => {
    setIsAnalyzing(false);
    setAnalysisComplete(true);
    // Reset after a short delay
    setTimeout(() => {
      setAnalysisComplete(false);
    }, 3000);
  };

  const resetAnalysis = () => {
    setIsAnalyzing(false);
    setAnalysisComplete(false);
    setError(null);
  };

  const setAnalysisError = (errorMessage: string) => {
    setError(errorMessage);
    setIsAnalyzing(false);
  };

  return {
    // Analysis state
    isAnalyzing,
    analysisComplete,
    error,
    startAnalysis,
    completeAnalysis,
    resetAnalysis,
    setAnalysisError
  };
}

export default usePolygonQueue;
