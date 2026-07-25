import React from 'react';
import { StockDetail } from '@/types/stock-detail';
import { formatCurrency, formatPercentage, MarketCurrency } from '@/utils/formatters';
import StockLogo from '@/components/StockLogo';

interface StockDetailHeaderProps {
  data: StockDetail;
  market: 'world' | 'il';
}

export default function StockDetailHeader({ data, market }: StockDetailHeaderProps) {
  const isPositive = (data.price.change ?? 0) >= 0;
  const isPostMarketPositive = (data.price.post_market_change_pct ?? 0) >= 0;

  const statusColor = {
    OPEN: 'bg-gain',
    CLOSED: 'bg-gray-500',
    PRE: 'bg-warn',
    POST: 'bg-warn',
  }[data.market_state] || 'bg-gray-500';

  const stateLabel = data.market_state === 'PRE' ? 'Pre-market'
    : data.market_state === 'POST' ? 'After-hours'
    : data.market_state === 'OPEN' ? 'Open' : 'Closed';

  return (
    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-4 border-b-2 border-rule-section">
      <div className="flex items-center gap-3 min-w-0">
        <StockLogo
          symbol={data.ticker}
          logoUrl={data.logo_url}
          size="sm"
          className="!w-11 !h-11 hidden sm:flex shrink-0"
        />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h1 className="text-[24px] font-heading font-bold text-figure leading-none" dir="auto">{data.company_name}</h1>
            <span className="text-[14px] font-semibold text-label">{data.ticker}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[12px] text-label">
            <span>{data.exchange}</span>
            <span className="text-rule-section">·</span>
            <span>{data.sector}</span>
            <span className="text-rule-section">·</span>
            <span className="inline-flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
              {stateLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:items-end shrink-0">
        <div className="flex items-baseline gap-2">
          <span className="tape-fig text-[30px] leading-none font-bold text-figure">
            {formatCurrency(data.price.current, data.currency as MarketCurrency)}
          </span>
          <span className="text-[12px] text-label">{data.currency}</span>
        </div>
        <div className={`flex items-center gap-2 text-[14px] font-semibold tabular-nums mt-1 ${isPositive ? 'text-gain' : 'text-loss'}`}>
          <span>{isPositive && data.price.change !== null ? '+' : ''}{data.price.change !== null ? formatCurrency(data.price.change, data.currency as MarketCurrency) : '—'}</span>
          <span>({data.price.change_pct !== null ? formatPercentage(data.price.change_pct) : '—'})</span>
        </div>
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-label tabular-nums">
          {(data.price.day_low !== null && data.price.day_high !== null) && (
            <span>Day {formatCurrency(data.price.day_low, data.currency as MarketCurrency)} – {formatCurrency(data.price.day_high, data.currency as MarketCurrency)}</span>
          )}
          {data.market_state !== 'OPEN' && data.price.post_market_price !== null && (
            <span>
              Post {formatCurrency(data.price.post_market_price, data.currency as MarketCurrency)}
              <span className={isPostMarketPositive ? 'text-gain ml-1' : 'text-loss ml-1'}>{formatPercentage(data.price.post_market_change_pct || 0)}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
