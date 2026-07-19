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

export function RSIChart({ data, ticker }: Props) {
  if (!data || !data.prices || data.prices.length === 0 || !data.rsi) {
    return (
      <div className="bg-gradient-to-b from-[#1E2227] to-[#181B20] rounded-lg p-6 text-center border border-[#2A2F36]">
        <p className="text-[#94A3B8]">No data available for RSI chart</p>
      </div>
    );
  }

  // RSI starts after the initial period (14 days), so we need to align the labels
  const rsiLabels = data.prices.slice(14).map(price => price.date);
  const rsiValues = data.rsi.slice(14); // Remove undefined values

  const chartData = {
    labels: rsiLabels,
    datasets: [
      {
        label: 'RSI',
        data: rsiValues,
        borderColor: 'rgb(147, 51, 234)', // Purple
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        fill: false,
      },
      {
        label: 'Overbought (70)',
        data: Array(rsiLabels.length).fill(70),
        borderColor: 'rgba(239, 68, 68, 0.5)', // Red
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
      },
      {
        label: 'Oversold (30)',
        data: Array(rsiLabels.length).fill(30),
        borderColor: 'rgba(34, 197, 94, 0.5)', // Green
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
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
          filter: function(legendItem: any) {
            // Only show RSI in legend, hide the reference lines
            return legendItem.text === 'RSI';
          },
        },
      },
      title: {
        display: true,
        text: `${ticker} - RSI (Relative Strength Index)`,
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
            if (context.dataset.label === 'RSI') {
              const value = context.parsed.y;
              let signal = '';
              if (value > 70) signal = ' (Overbought)';
              else if (value < 30) signal = ' (Oversold)';
              return `RSI: ${value.toFixed(2)}${signal}`;
            }
            return '';
          },
        },
        filter: function(tooltipItem: any) {
          return tooltipItem.dataset.label === 'RSI';
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
        min: 0,
        max: 100,
        grid: {
          color: 'rgba(71, 85, 105, 0.3)',
        },
        ticks: {
          color: 'rgb(148, 163, 184)',
          stepSize: 10,
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
        <Line data={chartData} options={options} />
      </div>
      <div className="mt-4 text-sm text-[#94A3B8]">
        <div className="flex flex-wrap gap-4">
          <span>RSI {'>'}  70: <span className="text-red-400">Overbought</span></span>
          <span>RSI {'<'} 30: <span className="text-green-400">Oversold</span></span>
          <span>Current RSI: <span className="text-purple-400">{rsiValues[rsiValues.length - 1]?.toFixed(2) || 'N/A'}</span></span>
        </div>
      </div>
    </div>
  );
}
