import React, { useState, useEffect } from 'react';
import { Loader2, TrendingUp, BarChart3, Activity, Calculator } from 'lucide-react';

interface TechnicalLoadingStateProps {
  ticker?: string;
  className?: string;
  onComplete?: () => void;
}

interface LoadingStep {
  id: string;
  message: string;
  icon: React.ReactNode;
  duration: number; // in milliseconds
}

const LOADING_STEPS: LoadingStep[] = [
  {
    id: 'preparing',
    message: 'Preparing your comprehensive stock analysis...',
    icon: <TrendingUp className="w-5 h-5" />,
    duration: 3000
  },
  {
    id: 'historical',
    message: 'Fetching historical price data...',
    icon: <BarChart3 className="w-5 h-5" />,
    duration: 4000
  },
  {
    id: 'ema',
    message: 'Calculating EMAs (8, 21, 34, 50 periods)...',
    icon: <Calculator className="w-5 h-5" />,
    duration: 5000
  },
  {
    id: 'macd',
    message: 'Analyzing MACD and signal lines...',
    icon: <Activity className="w-5 h-5" />,
    duration: 5000
  },
  {
    id: 'rsi',
    message: 'Computing RSI momentum indicators...',
    icon: <TrendingUp className="w-5 h-5" />,
    duration: 5000
  },
  {
    id: 'patterns',
    message: 'Identifying chart patterns and trends...',
    icon: <BarChart3 className="w-5 h-5" />,
    duration: 4000
  },
  {
    id: 'finalizing',
    message: 'Finalizing technical analysis...',
    icon: <Calculator className="w-5 h-5" />,
    duration: 3000
  }
];

export function TechnicalLoadingState({ 
  ticker, 
  className = "",
  onComplete 
}: TechnicalLoadingStateProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const currentStep = LOADING_STEPS[currentStepIndex];
  const totalSteps = LOADING_STEPS.length;

  useEffect(() => {
    if (isCompleted) return;

    const stepDuration = currentStep.duration;
    const startTime = Date.now();

    // Update progress bar smoothly
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const stepProgress = Math.min(elapsed / stepDuration, 1);
      const overallProgress = ((currentStepIndex + stepProgress) / totalSteps) * 100;
      setProgress(overallProgress);
    }, 50);

    // Move to next step after duration
    const stepTimeout = setTimeout(() => {
      if (currentStepIndex < totalSteps - 1) {
        setCurrentStepIndex(prev => prev + 1);
      } else {
        // Analysis complete
        setIsCompleted(true);
        setProgress(100);
        onComplete?.();
      }
    }, stepDuration);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(stepTimeout);
    };
  }, [currentStepIndex, currentStep.duration, totalSteps, onComplete, isCompleted]);

  // Reset when ticker changes
  useEffect(() => {
    setCurrentStepIndex(0);
    setProgress(0);
    setIsCompleted(false);
  }, [ticker]);

  if (isCompleted) {
    return (
      <div className={`flex items-center justify-center p-6 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-lg font-medium text-green-600">
            Technical analysis complete!
          </p>
          {ticker && (
            <p className="text-sm text-gray-500 mt-1">
              {ticker.toUpperCase()} analysis ready
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 space-y-6 ${className}`}>
      {/* Animated Icon */}
      <div className="relative">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <div className="text-blue-600 animate-pulse">
            {currentStep.icon}
          </div>
        </div>
        {/* Spinning loader ring */}
        <Loader2 className="absolute inset-0 w-16 h-16 text-blue-200 animate-spin" />
      </div>

      {/* Main Message */}
      <div className="text-center max-w-md">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {ticker ? `Analyzing ${ticker.toUpperCase()}` : 'Technical Analysis'}
        </h3>
        <p className="text-sm text-gray-600 animate-pulse">
          {currentStep.message}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="w-full max-w-xs">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Step {currentStepIndex + 1} of {totalSteps}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex space-x-2">
        {LOADING_STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`w-2 h-2 rounded-full transition-colors duration-300 ${
              index < currentStepIndex 
                ? 'bg-green-500' 
                : index === currentStepIndex 
                ? 'bg-blue-500' 
                : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      {/* Queue Position (if applicable) */}
      <p className="text-xs text-gray-400 text-center">
        Processing technical indicators for comprehensive analysis
      </p>
    </div>
  );
}

// Hook for managing loading state
export function useTechnicalLoading() {
  const [isLoading, setIsLoading] = useState(false);
  const [ticker, setTicker] = useState<string>('');

  const startLoading = (tickerSymbol: string) => {
    setTicker(tickerSymbol);
    setIsLoading(true);
  };

  const stopLoading = () => {
    setIsLoading(false);
    setTicker('');
  };

  return {
    isLoading,
    ticker,
    startLoading,
    stopLoading,
    LoadingComponent: isLoading ? (
      <TechnicalLoadingState 
        ticker={ticker} 
        onComplete={stopLoading}
      />
    ) : null
  };
}

export default TechnicalLoadingState;
