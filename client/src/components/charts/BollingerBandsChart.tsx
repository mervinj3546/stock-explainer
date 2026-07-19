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
  bollingerUpper: number[];
  bollingerMiddle: number[];
  bollingerLower: number[];
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

export function BollingerBandsChart({ data, ticker }: Props) {
  // Get valid data points where we have both price and Bollinger data
  const validDataPoints = data.prices
    .map((price, index) => ({
      date: price.date,
      close: price.close,
      upper: data.bollingerUpper[index],
      middle: data.bollingerMiddle[index],
      lower: data.bollingerLower[index],
    }))
    .filter(point => 
      point.upper != null && 
      point.middle != null && 
      point.lower != null &&
      !isNaN(point.upper) && 
      !isNaN(point.middle) && 
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
        label: 'Upper Band (2σ)',
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
        label: 'Middle Band (SMA 20)',
        data: validDataPoints.map(point => point.middle),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        order: 3,
      },
      {
        label: 'Lower Band (-2σ)',
        data: validDataPoints.map(point => point.lower),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 1.5,
        pointRadius: 0,
        pointHoverRadius: 4,
        tension: 0.1,
        fill: '-1',
        order: 4,
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

  // Calculate current values
  const currentValues = validDataPoints.length > 0 ? validDataPoints[validDataPoints.length - 1] : null;
  const upperBandDistance = currentValues ? ((currentValues.close - currentValues.lower) / (currentValues.upper - currentValues.lower) * 100) : 0;
  
  return (
    <Card className="bg-gradient-to-b from-[#1E2227] to-[#181B20] border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <span>Bollinger Bands (20, 2)</span>
          {currentValues && (
            <div className="text-sm font-normal text-[#94A3B8]">
              Position: {upperBandDistance.toFixed(1)}%
            </div>
          )}
        </CardTitle>
        {currentValues && (
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div className="text-center">
              <div className="text-red-400 font-medium">${currentValues.upper.toFixed(2)}</div>
              <div className="text-[#94A3B8]">Upper</div>
            </div>
            <div className="text-center">
              <div className="text-blue-400 font-medium">${currentValues.middle.toFixed(2)}</div>
              <div className="text-[#94A3B8]">Middle</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 font-medium">${currentValues.lower.toFixed(2)}</div>
              <div className="text-[#94A3B8]">Lower</div>
            </div>
            <div className="text-center">
              <div className="text-white font-medium">${currentValues.close.toFixed(2)}</div>
              <div className="text-[#94A3B8]">Price</div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-80">
          <Line data={chartData} options={options} />
        </div>
        <div className="mt-4 text-xs text-[#94A3B8] bg-[#1A1D23] p-3 rounded">
          <p><strong>Bollinger Bands:</strong> Price typically stays within the bands 95% of the time. 
          When price touches the upper band, it may indicate overbought conditions. 
          When it touches the lower band, it may indicate oversold conditions.</p>
        </div>
      </CardContent>
    </Card>
  );
}
