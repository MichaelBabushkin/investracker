import React from 'react';
import { StockPortfolio } from '@/types/stock-detail';
import { formatCurrency, MarketCurrency } from '@/utils/formatters';

interface StockYourPositionProps {
  portfolio: StockPortfolio;
  currency: string;
}

/**
 * The user's own stake, before any market data. Renders nothing when unheld.
 * Tape: a labelled band of stacked figure columns, no card.
 */
export default function StockYourPosition({ portfolio, currency }: StockYourPositionProps) {
  if (!portfolio.held || portfolio.quantity === 0) return null;

  const plPositive = portfolio.unrealized_pl >= 0;

  const cells: Array<{ label: string; value: React.ReactNode; cls?: string }> = [
    { label: 'Shares held', value: portfolio.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 }) },
    { label: 'Avg cost', value: formatCurrency(portfolio.avg_cost_per_share, currency as MarketCurrency) },
    { label: 'Market value', value: formatCurrency(portfolio.current_value, currency as MarketCurrency) },
    {
      label: 'Unrealized P&L',
      value: (
        <>
          {plPositive ? '+' : '-'}{formatCurrency(Math.abs(portfolio.unrealized_pl), currency as MarketCurrency)}
          <span className="ml-1.5 text-[13px] font-medium">({plPositive ? '+' : ''}{portfolio.unrealized_pl_pct.toFixed(2)}%)</span>
        </>
      ),
      cls: plPositive ? 'text-gain' : 'text-loss',
    },
  ];

  return (
    <div>
      <div className="tape-label mb-2.5">Your position</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4">
        {cells.map(({ label, value, cls }) => (
          <div key={label}>
            <div className="text-[11px] text-label mb-1">{label}</div>
            <div className={`tape-fig text-[18px] font-semibold ${cls ?? 'text-figure'}`}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
