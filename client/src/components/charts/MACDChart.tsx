import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

interface TechnicalData {
  ema8: number[];
  ema21: number[];
  ema34: number[];
  ema50: number[];
  macd: number[];
  signal: number[];
  histogram: number[];
  rsi: number[];
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

export function MACDChart({ data, ticker }: Props) {
  if (!data || !data.prices || data.prices.length === 0) {
    return (
      <div className="bg-gradient-to-b from-[#1E2227] to-[#181B20] rounded-lg p-6 text-center border border-[#2A2F36]">
        <p className="text-[#94A3B8]">No data available for MACD chart</p>
      </div>
    );
  }

  const labels = data.prices.map(price => price.date);

  const chartData = {
    labels,
    datasets: [
      {
        type: 'line' as const,
        label: 'MACD',
        data: data.macd,
        borderColor: 'rgb(34, 197, 94)', // Green
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'Signal',
        data: data.signal,
        borderColor: 'rgb(239, 68, 68)', // Red
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        yAxisID: 'y',
      },
      {
        type: 'bar' as const,
        label: 'Histogram',
        data: data.histogram,
        backgroundColor: data.histogram.map(value => 
          value >= 0 ? 'rgba(34, 197, 94, 0.6)' : 'rgba(239, 68, 68, 0.6)'
        ),
        borderColor: data.histogram.map(value => 
          value >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
        ),
        borderWidth: 1,
        yAxisID: 'y',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: 'rgb(148, 163, 184)', // slate-400
          font: {
            size: 12,
          },
        },
      },
      title: {
        display: true,
        text: `${ticker} - MACD (8,21,9)`,
        color: 'rgb(241, 245, 249)', // slate-100
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        titleColor: 'rgb(241, 245, 249)',
        bodyColor: 'rgb(203, 213, 225)',
        borderColor: 'rgb(71, 85, 105)',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(4)}`;
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
          color: 'rgba(71, 85, 105, 0.3)',
        },
        ticks: {
          color: 'rgb(148, 163, 184)',
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: {
          color: 'rgba(71, 85, 105, 0.3)',
        },
        ticks: {
          color: 'rgb(148, 163, 184)',
          callback: function(value: any) {
            return value.toFixed(3);
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  return (
    <div className="bg-gradient-to-b from-[#1E2227] to-[#181B20] rounded-lg p-6 border border-[#2A2F36] shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
      <div className="h-80">
        <Chart type="line" data={chartData} options={options} />
      </div>
    </div>
  );
}
