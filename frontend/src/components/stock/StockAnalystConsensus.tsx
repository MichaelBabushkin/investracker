import React from 'react';
import { StockAnalyst } from '@/types/stock-detail';
import { formatCurrency, MarketCurrency } from '@/utils/formatters';

interface StockAnalystConsensusProps {
  analyst: StockAnalyst;
  currency: string;
  currentPrice: number | null;
}

const REC_TONE: Record<string, string> = {
  strong_buy: 'text-gain', 'strong buy': 'text-gain', buy: 'text-gain',
  hold: 'text-warn',
  sell: 'text-loss', strong_sell: 'text-loss', 'strong sell': 'text-loss',
};

export default function StockAnalystConsensus({ analyst, currency, currentPrice }: StockAnalystConsensusProps) {
  if (!analyst || !analyst.recommendation) {
    return (
      <div>
        <div className="tape-label mb-2">Analyst consensus</div>
        <p className="text-[13px] text-label leading-relaxed max-w-[46ch]">
          No analyst coverage in our data — common for TASE small- and mid-caps.
        </p>
      </div>
    );
  }

  const rec = analyst.recommendation.toLowerCase();
  const recTone = REC_TONE[rec] ?? 'text-figure';

  const hasRange = analyst.target_low !== null && analyst.target_high !== null && currentPrice !== null;
  let pricePosition = 0;
  if (hasRange) {
    const min = analyst.target_low!, max = analyst.target_high!;
    const range = max - min;
    if (range > 0) pricePosition = Math.max(0, Math.min(100, ((currentPrice! - min) / range) * 100));
  }

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2.5">
        <div className="tape-label">Analyst consensus</div>
        <span className="text-[11px] text-label">{analyst.analyst_count ? `${analyst.analyst_count} analysts` : ''}</span>
      </div>
      <div className={`tape-fig text-[22px] font-bold uppercase ${recTone}`}>{analyst.recommendation.replace('_', ' ')}</div>

      {hasRange && (
        <div className="mt-5">
          <div className="text-[11px] text-label mb-1">Price target</div>
          <div className="relative pt-5 pb-1">
            <span className="absolute top-0 left-0 text-[11px] text-label tabular-nums">{formatCurrency(analyst.target_low, currency as MarketCurrency)}</span>
            <span className="absolute top-0 left-1/2 -translate-x-1/2 text-[11px] font-medium text-figure tabular-nums">{formatCurrency(analyst.target_mean, currency as MarketCurrency)}</span>
            <span className="absolute top-0 right-0 text-[11px] text-label tabular-nums">{formatCurrency(analyst.target_high, currency as MarketCurrency)}</span>
            <div className="h-px w-full bg-rule-section relative mt-1.5">
              <div className="absolute top-1/2 left-1/2 w-px h-2.5 -translate-y-1/2 bg-rule-section" />
              <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-brand-400 rounded-full z-10" style={{ left: `calc(${pricePosition}% - 4px)` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
