import React from 'react';
import { StockStats } from '@/types/stock-detail';
import { formatCurrency, MarketCurrency } from '@/utils/formatters';
import { StatRow, Fig } from '@/components/tape/Tape';

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

  const c = (v: number | null) => v !== null ? formatCurrency(v, currency as MarketCurrency) : '—';

  const statItems: Array<[string, string]> = [
    ['Market cap', stats.market_cap ? formatNumber(stats.market_cap) : '—'],
    ['P/E ratio', stats.pe_ratio?.toFixed(2) ?? '—'],
    ['Forward P/E', stats.forward_pe?.toFixed(2) ?? '—'],
    ['EPS', stats.eps?.toFixed(2) ?? '—'],
    ['Dividend yield', stats.dividend_yield ? stats.dividend_yield.toFixed(2) + '%' : '—'],
    ['Annual dividend', stats.dividend_rate ? c(stats.dividend_rate) + '/yr' : '—'],
    ['Ex-dividend date', stats.ex_dividend_date ?? '—'],
    ['Beta', stats.beta?.toFixed(2) ?? '—'],
    ['Day range', (price.day_low !== null && price.day_high !== null) ? `${c(price.day_low)} – ${c(price.day_high)}` : '—'],
    ['52W range', (stats.week_52_low !== null && stats.week_52_high !== null) ? `${c(stats.week_52_low)} – ${c(stats.week_52_high)}` : '—'],
    ['50-day MA', c(stats.fifty_day_avg)],
    ['200-day MA', c(stats.two_hundred_day_avg)],
    ['Avg volume', stats.avg_volume !== null ? formatNumber(stats.avg_volume) : '—'],
    ['Next earnings', stats.earnings_date ?? '—'],
  ];

  return (
    <div>
      <div className="tape-label mb-2">Key statistics</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8">
        {statItems.map(([label, value]) => (
          <StatRow key={label} label={label}><Fig>{value}</Fig></StatRow>
        ))}
      </div>
    </div>
  );
}
