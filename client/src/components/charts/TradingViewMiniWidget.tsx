import React, { useEffect, useRef } from 'react';

type Props = {
  ticker: string;
};

export function TradingViewMiniWidget({ ticker }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ticker || !containerRef.current) return;

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol: ticker,
      width: '100%',
      height: 150,
      locale: 'en',
      dateRange: '3M',
      colorTheme: 'dark',
      trendLineColor: 'rgba(34, 197, 94, 1)', // Green theme to match your app
      underLineColor: 'rgba(34, 197, 94, 0.3)',
      isTransparent: false,
      autosize: true,
    });

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(script);
  }, [ticker]);

  return <div ref={containerRef} className="w-full" />;
}
