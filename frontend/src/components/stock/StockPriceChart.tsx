"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, MarketCurrency } from '@/utils/formatters';
import { Loader2 } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart
} from 'recharts';

interface ChartDataPoint {
  date: string;
  close: number;
  volume: number;
}

interface StockPriceChartProps {
  ticker: string;
  market: 'world' | 'il';
  currency: string;
  fetchHistory?: (period: string) => Promise<{ data: { date: string; open: number; high: number; low: number; close: number; volume: number }[] }>;
}

// Generate some fake mock data for the chart since it's hardcoded for now
const generateMockData = (points: number): ChartDataPoint[] => {
  const data: ChartDataPoint[] = [];
  let currentPrice = 150;
  for (let i = 0; i < points; i++) {
    currentPrice = currentPrice + (Math.random() - 0.48) * 5;
    data.push({
      date: new Date(Date.now() - (points - i) * 86400000).toISOString().split('T')[0],
      close: currentPrice,
      volume: Math.floor(Math.random() * 5000000) + 1000000
    });
  }
  return data;
};

export default function StockPriceChart({ ticker, market, currency, fetchHistory }: StockPriceChartProps) {
  const [period, setPeriod] = useState('1M');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ChartDataPoint[]>(generateMockData(30));

  const loadHistory = async (p: string) => {
    if (!fetchHistory) return;
    setLoading(true);
    try {
      const result = await fetchHistory(p);
      if (result?.data?.length) {
        setData(result.data.map((r: any) => ({ date: r.date, close: r.close, volume: r.volume })));
      }
    } catch {
      // keep existing data on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(period);
  }, [ticker]);

  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    loadHistory(newPeriod);
  };

  const isWorld = market === 'world';
  const strokeColor = isWorld ? '#4ADE80' : '#3B82F6';
  
  return (
    <Card className="h-full col-span-1 md:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>Price Details</CardTitle>
        <div className="flex bg-surface-dark-tertiary rounded-lg p-1">
          {['1D', '1W', '1M', '3M', '1Y', 'ALL'].map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                period === p ? 'bg-surface-dark shadow text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </CardHeader>
      <div>
        <div className="h-[300px] w-full relative pt-4 px-4 pb-4">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-dark-secondary/50 backdrop-blur-sm rounded-lg">
              <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={strokeColor} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#ffffff40"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => {
                  const d = new Date(val);
                  return `${d.getMonth() + 1}/${d.getDate()}`;
                }}
              />
              <YAxis
                yAxisId="price"
                domain={['auto', 'auto']}
                stroke="#ffffff40"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => formatCurrency(val, currency as MarketCurrency)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#111827', borderColor: '#ffffff20', borderRadius: '8px' }}
                itemStyle={{ color: '#fff' }}
                formatter={(value: number) => [formatCurrency(value, currency as MarketCurrency), 'Price']}
                labelFormatter={(label) => new Date(label).toLocaleDateString()}
              />
              <Area
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke={strokeColor}
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Card>
  );
}
