import React from 'react';
import { StockDividend } from '@/types/stock-detail';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatDate, MarketCurrency } from '@/utils/formatters';

interface StockDividendsProps {
  dividends: StockDividend[];
  currency: string;
}

export default function StockDividends({ dividends, currency }: StockDividendsProps) {
  if (!dividends || dividends.length === 0) return null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Dividends</CardTitle>
      </CardHeader>
      <div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 border-b border-white/10 uppercase bg-surface-dark/50">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Per Share</th>
              </tr>
            </thead>
            <tbody>
              {dividends.map((div) => (
                <tr key={div.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 tabular-nums">{formatDate(div.payment_date || undefined)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gain font-medium">+{formatCurrency(div.net_amount, currency as MarketCurrency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-400">{div.per_share ? formatCurrency(div.per_share, currency as MarketCurrency) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
