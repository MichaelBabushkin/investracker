import React from 'react';
import { Wallet } from 'lucide-react';
import { StockPortfolio } from '@/types/stock-detail';
import { formatCurrency, MarketCurrency } from '@/utils/formatters';

interface StockYourPositionProps {
  portfolio: StockPortfolio;
  currency: string;
}

/**
 * Compact full-width band under the page header: the user's own stake comes
 * before any market data. Renders nothing when the stock isn't held.
 */
export default function StockYourPosition({ portfolio, currency }: StockYourPositionProps) {
  if (!portfolio.held || portfolio.quantity === 0) return null;

  const plPositive = portfolio.unrealized_pl >= 0;

  const cells: Array<{ label: string; value: React.ReactNode; cls?: string }> = [
    {
      label: 'Shares Held',
      value: portfolio.quantity.toLocaleString(undefined, { maximumFractionDigits: 4 }),
    },
    {
      label: 'Avg Cost',
      value: formatCurrency(portfolio.avg_cost_per_share, currency as MarketCurrency),
    },
    {
      label: 'Current Value',
      value: formatCurrency(portfolio.current_value, currency as MarketCurrency),
    },
    {
      label: 'Unrealized P&L',
      value: (
        <>
          {plPositive ? '+' : '-'}
          {formatCurrency(Math.abs(portfolio.unrealized_pl), currency as MarketCurrency)}
          <span className="ml-1.5 text-sm font-medium">
            ({plPositive ? '+' : ''}{portfolio.unrealized_pl_pct.toFixed(2)}%)
          </span>
        </>
      ),
      cls: plPositive ? 'text-gain' : 'text-loss',
    },
  ];

  return (
    <div className="bg-surface-dark-secondary border border-white/10 rounded-xl px-5 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Wallet size={14} className="text-brand-400" />
        <span className="text-sm font-heading font-semibold text-gray-200">Your Position</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cells.map(({ label, value, cls }) => (
          <div key={label}>
            <div className="text-xs text-gray-500 mb-1">{label}</div>
            <div className={`text-lg font-semibold tabular-nums ${cls ?? 'text-gray-100'}`}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
