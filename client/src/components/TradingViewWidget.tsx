import { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol: string;
  width?: string | number;
  height?: string | number;
  theme?: 'light' | 'dark';
  style?: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
  locale?: string;
  toolbar_bg?: string;
  enable_publishing?: boolean;
  allow_symbol_change?: boolean;
  container_id?: string;
}

function TradingViewWidget({
  symbol,
  width = "100%",
  height = 610,
  theme = "dark",
  style = "1",
  locale = "en",
  toolbar_bg = "#f1f3f6",
  enable_publishing = false,
  allow_symbol_change = true,
  container_id = "tradingview_widget"
}: TradingViewWidgetProps) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current) {
      // Clear the container
      container.current.innerHTML = '';
      
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = `
        {
          "autosize": true,
          "symbol": "${symbol}",
          "interval": "D",
          "timezone": "Etc/UTC",
          "theme": "${theme}",
          "style": "${style}",
          "locale": "${locale}",
          "enable_publishing": ${enable_publishing},
          "allow_symbol_change": ${allow_symbol_change},
          "calendar": false,
          "support_host": "https://www.tradingview.com"
        }`;
      
      container.current.appendChild(script);
    }
  }, [symbol, theme, style, locale, enable_publishing, allow_symbol_change]);

  return (
    <div className="tradingview-widget-container" style={{ height, width }}>
      <div ref={container} className="tradingview-widget-container__widget" style={{ height: "100%", width: "100%" }}></div>
      <div className="tradingview-widget-copyright" style={{ display: 'none' }}>
        <a href="https://www.tradingview.com/" rel="noopener nofollow" target="_blank">
          <span className="blue-text">Track all markets on TradingView</span>
        </a>
      </div>
    </div>
  );
}

export default memo(TradingViewWidget);
