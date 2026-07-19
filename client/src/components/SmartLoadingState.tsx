import React, { useState, useEffect } from 'react';
import { Clock, Users, TrendingUp } from 'lucide-react';
import TechnicalLoadingState from './TechnicalLoadingState';

interface QueueLoadingStateProps {
  queuePosition?: number;
  estimatedWaitTime?: number; // in seconds
  ticker?: string;
  className?: string;
}

export function QueueLoadingState({ 
  queuePosition = 0, 
  estimatedWaitTime = 0,
  ticker,
  className = ""
}: QueueLoadingStateProps) {
  const [timeRemaining, setTimeRemaining] = useState(estimatedWaitTime);

  useEffect(() => {
    setTimeRemaining(estimatedWaitTime);
  }, [estimatedWaitTime]);

  useEffect(() => {
    if (timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining]);

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (queuePosition <= 0) {
    return <TechnicalLoadingState ticker={ticker} className={className} />;
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 space-y-4 ${className}`}>
      {/* Queue Icon */}
      <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
        <Users className="w-8 h-8 text-orange-600" />
      </div>

      {/* Main Message */}
      <div className="text-center">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {ticker ? `Queued for ${ticker.toUpperCase()} Analysis` : 'Queued for Analysis'}
        </h3>
        <p className="text-sm text-gray-600">
          High demand for technical analysis - you're in line!
        </p>
      </div>

      {/* Queue Position */}
      <div className="bg-orange-50 rounded-lg p-4 text-center">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Clock className="w-5 h-5 text-orange-600" />
          <span className="text-2xl font-bold text-orange-600">
            #{queuePosition}
          </span>
        </div>
        <p className="text-sm text-orange-700">
          Position in queue
        </p>
      </div>

      {/* Estimated Wait Time */}
      {timeRemaining > 0 && (
        <div className="text-center">
          <p className="text-lg font-medium text-gray-700">
            Estimated wait: {formatTime(timeRemaining)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            We process 1 analysis per 30 seconds
          </p>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Processing queue</span>
          <span>Please wait</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-orange-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
      </div>

      {/* Info Message */}
      <div className="bg-blue-50 rounded-lg p-3 text-center max-w-md">
        <p className="text-xs text-blue-700">
          <TrendingUp className="w-4 h-4 inline mr-1" />
          We're fetching real-time data from multiple sources to ensure the most accurate technical analysis
        </p>
      </div>
    </div>
  );
}

// Combined loading component that always shows processing state
interface SmartLoadingStateProps {
  ticker?: string;
  className?: string;
  onComplete?: () => void;
}

export function SmartLoadingState({
  ticker,
  className = "",
  onComplete
}: SmartLoadingStateProps) {
  // Always show the technical loading state, never the queue
  return (
    <TechnicalLoadingState
      ticker={ticker}
      className={className}
      onComplete={onComplete}
    />
  );
}

export default SmartLoadingState;
