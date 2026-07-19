import React from 'react';
import SmartLoadingState from './SmartLoadingState';
import { useTechnicalAnalysisState } from '../hooks/usePolygonQueue';

interface TechnicalAnalysisButtonProps {
  ticker: string;
  onAnalysisComplete?: (data: any) => void;
}

export function TechnicalAnalysisButton({ 
  ticker, 
  onAnalysisComplete 
}: TechnicalAnalysisButtonProps) {
  const {
    isAnalyzing,
    analysisComplete,
    startAnalysis,
    completeAnalysis,
    setAnalysisError,
    error
  } = useTechnicalAnalysisState(ticker);

  const handleStartAnalysis = async () => {
    startAnalysis(ticker);
    
    try {
      // Make the actual API call for technical data
      const response = await fetch(`/api/ticker-data/${ticker}/technical?refresh=true`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch technical analysis');
      }
      
      const data = await response.json();
      
      // Analysis complete
      completeAnalysis();
      onAnalysisComplete?.(data);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch technical analysis';
      console.error('Technical analysis failed:', err);
      setAnalysisError(errorMessage);
    }
  };

  // Show loading state whenever analyzing
  if (isAnalyzing) {
    return (
      <SmartLoadingState
        ticker={ticker}
        className="min-h-[400px]"
        onComplete={completeAnalysis}
      />
    );
  }

  if (analysisComplete) {
    return (
      <div className="text-center p-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-green-600 mb-2">
          Analysis Complete!
        </h3>
        <p className="text-sm text-gray-600">
          Technical indicators for {ticker.toUpperCase()} are ready
        </p>
      </div>
    );
  }

  // Default button state
  return (
    <div className="text-center p-6">
      <button
        onClick={handleStartAnalysis}
        disabled={isAnalyzing}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isAnalyzing ? 'Analyzing...' : `Analyze ${ticker.toUpperCase()}`}
      </button>
      
      {error && (
        <p className="text-red-600 text-sm mt-2">
          {error}
        </p>
      )}
    </div>
  );
}

// Example usage in a dashboard component
export function TechnicalAnalysisDashboard({ ticker }: { ticker: string }) {
  const [analysisData, setAnalysisData] = React.useState(null);

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-bold mb-4">
        Technical Analysis - {ticker.toUpperCase()}
      </h2>
      
      {!analysisData ? (
        <TechnicalAnalysisButton
          ticker={ticker}
          onAnalysisComplete={setAnalysisData}
        />
      ) : (
        <div>
          {/* Render your technical analysis charts/data here */}
          <p className="text-green-600 mb-4">✅ Analysis complete!</p>
          <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto">
            {JSON.stringify(analysisData, null, 2)}
          </pre>
          
          <button
            onClick={() => setAnalysisData(null)}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Run New Analysis
          </button>
        </div>
      )}
    </div>
  );
}

export default TechnicalAnalysisButton;
