import React, { useEffect, useRef } from 'react';

type Props = {
  ticker: string;
};

export function TradingViewTechnicalAnalysis({ ticker }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticker || !containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      interval: '1D',
      width: '100%',
      isTransparent: true,
      symbol: ticker,
      height: 400,
      locale: 'en',
      colorTheme: 'dark',
    });

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(script);
  }, [ticker]);

  return <div ref={containerRef} className="w-full" />;
}
