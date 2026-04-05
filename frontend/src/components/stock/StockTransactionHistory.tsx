import React from 'react';
import { StockTransaction } from '@/types/stock-detail';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate, MarketCurrency } from '@/utils/formatters';

interface StockTransactionHistoryProps {
  transactions: StockTransaction[];
  currency: string;
}

export default function StockTransactionHistory({ transactions, currency }: StockTransactionHistoryProps) {
  if (!transactions || transactions.length === 0) return null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
      </CardHeader>
      <div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-400 border-b border-white/10 uppercase bg-surface-dark/50">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 text-right">Shares</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 tabular-nums">{formatDate(tx.date)}</td>
                  <td className="px-4 py-3">
                    <Badge
                      variant={
                        tx.type === 'BUY'
                          ? 'gain'
                          : tx.type === 'SELL'
                          ? 'loss'
                          : 'info'
                      }
                    >
                      {tx.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{tx.quantity}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(tx.price, currency as MarketCurrency)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(tx.total, currency as MarketCurrency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Card>
  );
}
