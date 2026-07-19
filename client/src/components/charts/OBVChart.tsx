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
  obv: number[];
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

export function OBVChart({ data, ticker }: Props) {
  // Get valid data points where we have both price and OBV data
  const validDataPoints = data.prices
    .map((price, index) => ({
      date: price.date,
      close: price.close,
      volume: price.volume,
      obv: data.obv[index],
    }))
    .filter(point => 
      point.obv != null && 
      !isNaN(point.obv)
    );

  const labels = validDataPoints.map(point => point.date);

  // Calculate OBV trend
  const obvValues = validDataPoints.map(point => point.obv);
  const obviTrend = obvValues.length > 1 ? obvValues[obvValues.length - 1] - obvValues[obvValues.length - 2] : 0;
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'On-Balance Volume',
        data: obvValues,
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
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
            const value = typeof context.parsed.y === 'number' ? context.parsed.y : 0;
            return `OBV: ${value.toLocaleString()}`;
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
        grid: {
          color: 'rgba(42, 47, 54, 0.5)',
        },
        ticks: {
          color: '#94A3B8',
          callback: function(value: any) {
            const absValue = Math.abs(value);
            if (absValue >= 1e9) {
              return (value / 1e9).toFixed(1) + 'B';
            } else if (absValue >= 1e6) {
              return (value / 1e6).toFixed(1) + 'M';
            } else if (absValue >= 1e3) {
              return (value / 1e3).toFixed(1) + 'K';
            }
            return value.toFixed(0);
          },
          font: {
            size: 10,
          },
        },
      },
    },
  };

  // Calculate current values and trend
  const currentOBV = validDataPoints.length > 0 ? validDataPoints[validDataPoints.length - 1].obv : 0;
  const previousOBV = validDataPoints.length > 1 ? validDataPoints[validDataPoints.length - 2].obv : 0;
  const obvChange = currentOBV - previousOBV;
  const trendDirection = obvChange > 0 ? 'Rising' : obvChange < 0 ? 'Falling' : 'Flat';
  const trendColor = obvChange > 0 ? 'text-green-400' : obvChange < 0 ? 'text-red-400' : 'text-yellow-400';
  
  // Format OBV value
  const formatOBV = (value: number) => {
    const absValue = Math.abs(value);
    if (absValue >= 1e9) {
      return (value / 1e9).toFixed(2) + 'B';
    } else if (absValue >= 1e6) {
      return (value / 1e6).toFixed(2) + 'M';
    } else if (absValue >= 1e3) {
      return (value / 1e3).toFixed(2) + 'K';
    }
    return value.toFixed(0);
  };
  
  return (
    <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <span>On-Balance Volume</span>
          <div className={`text-sm font-normal ${trendColor}`}>
            {trendDirection}
          </div>
        </CardTitle>
        <div className="grid grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <div className="text-green-400 font-medium">{formatOBV(currentOBV)}</div>
            <div className="text-[#94A3B8]">Current OBV</div>
          </div>
          <div className="text-center">
            <div className={`font-medium ${trendColor}`}>
              {obvChange > 0 ? '+' : ''}{formatOBV(obvChange)}
            </div>
            <div className="text-[#94A3B8]">Daily Change</div>
          </div>
          <div className="text-center">
            <div className="text-[#94A3B8] font-medium">
              {validDataPoints.length > 0 ? validDataPoints[validDataPoints.length - 1].volume.toLocaleString() : '0'}
            </div>
            <div className="text-[#94A3B8]">Volume</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-80">
          <Line data={chartData} options={options} />
        </div>
        <div className="mt-4 text-xs text-[#94A3B8] bg-[#1A1D23] p-3 rounded">
          <p><strong>On-Balance Volume (OBV):</strong> Measures buying and selling pressure. 
          Rising OBV suggests accumulation (buying pressure), while falling OBV indicates distribution (selling pressure). 
          OBV divergences from price can signal potential trend reversals.</p>
        </div>
      </CardContent>
    </Card>
  );
}
