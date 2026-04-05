import React from 'react';
import { StockStats } from '@/types/stock-detail';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, MarketCurrency } from '@/utils/formatters';

interface StockKeyStatsProps {
  stats: StockStats;
  currency: string;
}

export default function StockKeyStats({ stats, currency }: StockKeyStatsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString();
  };

  const statItems = [
    { label: 'Market Cap', value: formatNumber(stats.market_cap) },
    { label: 'P/E Ratio', value: stats.pe_ratio?.toFixed(2) ?? '-' },
    { label: 'EPS', value: stats.eps?.toFixed(2) ?? '-' },
    { label: 'Div Yield', value: stats.dividend_yield ? (stats.dividend_yield * 100).toFixed(2) + '%' : '-' },
    { label: 'Beta', value: stats.beta?.toFixed(2) ?? '-' },
    { label: '52W High', value: formatCurrency(stats.week_52_high, currency as MarketCurrency) },
    { label: '52W Low', value: formatCurrency(stats.week_52_low, currency as MarketCurrency) },
    { label: 'Avg Volume', value: formatNumber(stats.avg_volume) },
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Key Statistics</CardTitle>
      </CardHeader>
      <div>
        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
          {statItems.map((st, i) => (
            <div key={i} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0">
              <span className="text-sm text-gray-400">{st.label}</span>
              <span className="font-medium whitespace-nowrap tabular-nums">{st.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
