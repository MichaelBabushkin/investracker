import React from 'react';
import { StockStats } from '@/types/stock-detail';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, MarketCurrency } from '@/utils/formatters';

interface StockKeyStatsProps {
  stats: StockStats;
  price: { day_high: number | null; day_low: number | null };
  currency: string;
}

export default function StockKeyStats({ stats, price, currency }: StockKeyStatsProps) {
  const formatNumber = (num: number) => {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    return num.toLocaleString();
  };

  const statItems = [
    { label: 'Market Cap', value: stats.market_cap ? formatNumber(stats.market_cap) : '-' },
    { label: 'P/E Ratio', value: stats.pe_ratio?.toFixed(2) ?? '-' },
    { label: 'Forward P/E', value: stats.forward_pe?.toFixed(2) ?? '-' },
    { label: 'EPS', value: stats.eps?.toFixed(2) ?? '-' },
    { label: 'Div Yield', value: stats.dividend_yield ? stats.dividend_yield.toFixed(2) + '%' : '-' },
    { label: 'Annual Dividend', value: stats.dividend_rate ? formatCurrency(stats.dividend_rate, currency as MarketCurrency) + '/yr' : '-' },
    { label: 'Ex-Dividend Date', value: stats.ex_dividend_date ?? '-' },
    { label: 'Beta', value: stats.beta?.toFixed(2) ?? '-' },
    { label: 'Day Range', value: (price.day_low !== null && price.day_high !== null) ? `${formatCurrency(price.day_low, currency as MarketCurrency)} - ${formatCurrency(price.day_high, currency as MarketCurrency)}` : '-' },
    { label: '52W High', value: stats.week_52_high !== null ? formatCurrency(stats.week_52_high, currency as MarketCurrency) : '-' },
    { label: '52W Low', value: stats.week_52_low !== null ? formatCurrency(stats.week_52_low, currency as MarketCurrency) : '-' },
    { label: '50-Day MA', value: stats.fifty_day_avg !== null ? formatCurrency(stats.fifty_day_avg, currency as MarketCurrency) : '-' },
    { label: '200-Day MA', value: stats.two_hundred_day_avg !== null ? formatCurrency(stats.two_hundred_day_avg, currency as MarketCurrency) : '-' },
    { label: 'Avg Volume', value: stats.avg_volume !== null ? formatNumber(stats.avg_volume) : '-' },
    { label: 'Next Earnings', value: stats.earnings_date ?? '-' }
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
