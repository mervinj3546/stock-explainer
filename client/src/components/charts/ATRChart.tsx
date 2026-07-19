import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface TechnicalData {
  atr: number[];
  prices: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
}

interface Props {
  data: TechnicalData;
  ticker: string;
}

export function ATRChart({ data, ticker }: Props) {
  // Get valid data points where we have both price and ATR data
  const validDataPoints = data.prices
    .map((price, index) => ({
      date: price.date,
      close: price.close,
      high: price.high,
      low: price.low,
      atr: data.atr[index],
    }))
    .filter(point => 
      point.atr != null && 
      !isNaN(point.atr)
    );

  const labels = validDataPoints.map(point => point.date);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'ATR (14)',
        data: validDataPoints.map(point => point.atr),
        borderColor: 'rgb(168, 85, 247)',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: 'origin',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94A3B8',
          usePointStyle: true,
          pointStyle: 'line',
          font: {
            size: 11,
          },
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(30, 34, 39, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#94A3B8',
        borderColor: '#2A2F36',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const value = typeof context.parsed.y === 'number' ? context.parsed.y.toFixed(3) : 'N/A';
            return `ATR: $${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
          displayFormats: {
            day: 'MMM dd',
          },
        },
        grid: {
          color: 'rgba(42, 47, 54, 0.5)',
        },
        ticks: {
          color: '#94A3B8',
          maxTicksLimit: 8,
          font: {
            size: 10,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(42, 47, 54, 0.5)',
        },
        ticks: {
          color: '#94A3B8',
          callback: function(value: any) {
            return '$' + value.toFixed(3);
          },
          font: {
            size: 10,
          },
        },
      },
    },
  };

  // Calculate current values and volatility assessment
  const currentATR = validDataPoints.length > 0 ? validDataPoints[validDataPoints.length - 1].atr : 0;
  const currentPrice = validDataPoints.length > 0 ? validDataPoints[validDataPoints.length - 1].close : 0;
  const atrPercentage = currentPrice > 0 ? (currentATR / currentPrice * 100) : 0;
  
  // Calculate average ATR for context
  const avgATR = validDataPoints.length > 0 
    ? validDataPoints.slice(-20).reduce((sum, point) => sum + point.atr, 0) / Math.min(20, validDataPoints.length)
    : 0;
  
  const volatilityLevel = atrPercentage > 3 ? 'High' : atrPercentage > 1.5 ? 'Medium' : 'Low';
  const volatilityColor = atrPercentage > 3 ? 'text-red-400' : atrPercentage > 1.5 ? 'text-yellow-400' : 'text-green-400';
  
  return (
    <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <span>Average True Range (14)</span>
          <div className={`text-sm font-normal ${volatilityColor}`}>
            {volatilityLevel} Volatility
          </div>
        </CardTitle>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <div className="text-purple-400 font-medium">${currentATR.toFixed(3)}</div>
            <div className="text-[#94A3B8]">Current ATR</div>
          </div>
          <div className="text-center">
            <div className="text-white font-medium">{atrPercentage.toFixed(2)}%</div>
            <div className="text-[#94A3B8]">% of Price</div>
          </div>
          <div className="text-center">
            <div className="text-[#94A3B8] font-medium">${avgATR.toFixed(3)}</div>
            <div className="text-[#94A3B8]">20-Day Avg</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-80">
          <Line data={chartData} options={options} />
        </div>
        <div className="mt-4 text-xs text-[#94A3B8] bg-[#1A1D23] p-3 rounded">
          <p><strong>Average True Range (ATR):</strong> Measures market volatility. 
          Higher ATR indicates more volatility and wider price movements. 
          Used for setting stop-losses and position sizing. Current reading of {atrPercentage.toFixed(1)}% indicates {volatilityLevel.toLowerCase()} volatility.</p>
        </div>
      </CardContent>
    </Card>
  );
}
