import React from 'react';
import { StockDetail } from '@/types/stock-detail';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatPercentage, MarketCurrency } from '@/utils/formatters';

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

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div className="flex items-center gap-4">
        {data.logo_url ? (
          <img src={data.logo_url} alt={data.ticker} className="w-12 h-12 rounded-full hidden sm:block bg-white p-1" />
        ) : (
          <div className="w-12 h-12 rounded-full hidden sm:flex bg-surface-dark-tertiary items-center justify-center text-xl font-bold">
            {data.ticker.charAt(0)}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{data.company_name}</h1>
            <Badge variant="neutral" className="text-xs">{data.ticker}</Badge>
            <Badge variant="info">{data.exchange}</Badge>
            <Badge variant="neutral">{data.sector}</Badge>
          </div>
          <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
            <span className="capitalize">Market {data.market_state === 'PRE' ? 'Pre-Market' : data.market_state === 'POST' ? 'After-Hours' : data.market_state}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-start md:items-end bg-surface-dark-secondary p-4 rounded-xl border border-white/10">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white tabular-nums">
            {formatCurrency(data.price.current, data.currency as MarketCurrency)}
          </span>
          <span className="text-sm text-gray-400 tabular-nums">{data.currency}</span>
        </div>
        <div className={`flex items-center gap-2 font-medium tabular-nums ${isPositive ? 'text-gain' : 'text-loss'}`}>
          <span>{isPositive && data.price.change !== null ? '+' : ''}{data.price.change !== null ? formatCurrency(data.price.change, data.currency as MarketCurrency) : '-'}</span>
          <span>({isPositive && data.price.change_pct !== null ? '+' : ''}{data.price.change_pct !== null ? formatPercentage(data.price.change_pct) : '-'})</span>
        </div>
        {data.market_state !== "OPEN" && data.price.post_market_price !== null && (
          <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 tabular-nums">
            <span>Post-Market:</span>
            <span>{formatCurrency(data.price.post_market_price, data.currency as MarketCurrency)}</span>
            <span className={isPostMarketPositive ? 'text-gain' : 'text-loss'}>
              {isPostMarketPositive ? '+' : ''}{formatPercentage(data.price.post_market_change_pct || 0)}
            </span>
          </div>
        )}
        {(data.price.day_high !== null && data.price.day_low !== null) && (
          <div className="text-xs text-gray-500 mt-2">
            Day: {formatCurrency(data.price.day_low, data.currency as MarketCurrency)} – {formatCurrency(data.price.day_high, data.currency as MarketCurrency)}
          </div>
        )}
      </div>
    </div>
  );
}
