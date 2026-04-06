import React from 'react';
import { StockPortfolio } from '@/types/stock-detail';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { MetricCard } from '@/components/ui/MetricCard';
import { formatCurrency, formatPercentage, MarketCurrency } from '@/utils/formatters';

interface StockYourPositionProps {
  portfolio: StockPortfolio;
  currency: string;
}

export default function StockYourPosition({ portfolio, currency }: StockYourPositionProps) {
  if (!portfolio.held || portfolio.quantity === 0) return null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Your Position</CardTitle>
      </CardHeader>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-400 mb-1">Shares Held</div>
          <div className="text-xl font-semibold tabular-nums">{portfolio.quantity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })}</div>
        </div>
        <div>
          <div className="text-sm text-gray-400 mb-1">Avg Cost</div>
          <div className="text-xl font-semibold tabular-nums">{formatCurrency(portfolio.avg_cost_per_share, currency as MarketCurrency)}</div>
        </div>
        
        <div className="col-span-2 mt-2">
          <MetricCard
            label="Current Value"
            value={formatCurrency(portfolio.current_value, currency as MarketCurrency)}
            subValue={formatCurrency(Math.abs(portfolio.unrealized_pl), currency as MarketCurrency)}
            trend={{ value: portfolio.unrealized_pl_pct }}
          />
        </div>
      </div>
    </Card>
  );
}
