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
  Filler,
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
  TimeScale,
  Filler
);

interface TechnicalData {
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

interface Props {
  data: TechnicalData;
  ticker: string;
}

export function DonchianChannelsChart({ data, ticker }: Props) {
  // Get valid data points where we have both price and Donchian data
  const validDataPoints = data.prices
    .map((price, index) => ({
      date: price.date,
      close: price.close,
      high: price.high,
      low: price.low,
      upper: data.donchianUpper[index],
      lower: data.donchianLower[index],
    }))
    .filter(point => 
      point.upper != null && 
      point.lower != null &&
      !isNaN(point.upper) && 
      !isNaN(point.lower)
    );

  const labels = validDataPoints.map(point => point.date);

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Close Price',
        data: validDataPoints.map(point => point.close),
        borderColor: 'rgb(255, 255, 255)',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        order: 1,
      },
      {
        label: 'Upper Channel (20-Day High)',
        data: validDataPoints.map(point => point.upper),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: '+1',
        order: 2,
      },
      {
        label: 'Lower Channel (20-Day Low)',
        data: validDataPoints.map(point => point.lower),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: 'origin',
        order: 3,
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
            const label = context.dataset.label || '';
            const value = typeof context.parsed.y === 'number' ? context.parsed.y.toFixed(2) : 'N/A';
            return `${label}: $${value}`;
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
        beginAtZero: false,
        grid: {
          color: 'rgba(42, 47, 54, 0.5)',
        },
        ticks: {
          color: '#94A3B8',
          callback: function(value: any) {
            return '$' + value.toFixed(2);
          },
          font: {
            size: 10,
          },
        },
      },
    },
  };

  // Calculate current values and position within channel
  const currentValues = validDataPoints.length > 0 ? validDataPoints[validDataPoints.length - 1] : null;
  const channelPosition = currentValues ? 
    ((currentValues.close - currentValues.lower) / (currentValues.upper - currentValues.lower) * 100) : 0;
  
  // Determine breakout status
  const isNearUpper = channelPosition > 90;
  const isNearLower = channelPosition < 10;
  const breakoutStatus = isNearUpper ? 'Near Upper Breakout' : 
                        isNearLower ? 'Near Lower Breakdown' : 
                        'Within Channel';
  const statusColor = isNearUpper ? 'text-red-400' : 
                     isNearLower ? 'text-green-400' : 
                     'text-yellow-400';
  
  return (
    <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <span>Donchian Channels (20)</span>
          <div className={`text-sm font-normal ${statusColor}`}>
            {breakoutStatus}
          </div>
        </CardTitle>
        {currentValues && (
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="text-center">
              <div className="text-red-400 font-medium">${currentValues.upper.toFixed(2)}</div>
              <div className="text-[#94A3B8]">Upper</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 font-medium">${currentValues.lower.toFixed(2)}</div>
              <div className="text-[#94A3B8]">Lower</div>
            </div>
            <div className="text-center">
              <div className="text-white font-medium">${currentValues.close.toFixed(2)}</div>
              <div className="text-[#94A3B8]">Price</div>
            </div>
            <div className="text-center">
              <div className={`font-medium ${statusColor}`}>{channelPosition.toFixed(1)}%</div>
              <div className="text-[#94A3B8]">Position</div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-80">
          <Line data={chartData} options={options} />
        </div>
        <div className="mt-4 text-xs text-[#94A3B8] bg-[#1A1D23] p-3 rounded">
          <p><strong>Donchian Channels:</strong> Show the highest high and lowest low over the past 20 periods. 
          Price breaking above the upper channel suggests bullish momentum, while breaking below the lower channel 
          indicates bearish momentum. Used for trend-following and breakout strategies.</p>
        </div>
      </CardContent>
    </Card>
  );
}
