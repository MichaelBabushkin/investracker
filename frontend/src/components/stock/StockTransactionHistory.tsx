import React from 'react';
import { StockTransaction } from '@/types/stock-detail';
import { formatCurrency, formatDate, MarketCurrency } from '@/utils/formatters';

interface StockTransactionHistoryProps {
  transactions: StockTransaction[];
  currency: string;
}

const TYPE_TONE: Record<string, string> = { BUY: 'text-gain', SELL: 'text-loss' };

export default function StockTransactionHistory({ transactions, currency }: StockTransactionHistoryProps) {
  if (!transactions || transactions.length === 0) return null;

  return (
    <div>
      <div className="tape-label mb-2">Transaction history · {transactions.length}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b-2 border-rule-section">
              {['Date', 'Type', 'Shares', 'Price', 'Total'].map((h, i) => (
                <th key={h} className={`tape-label py-1.5 pr-4 ${i >= 2 ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-rule-row hover:bg-white/[0.02] transition-colors h-7">
                <td className="pr-4 text-[13px] text-label whitespace-nowrap tabular-nums">{formatDate(tx.date)}</td>
                <td className={`pr-4 text-[13px] font-semibold ${TYPE_TONE[tx.type] ?? 'text-label'}`}>{tx.type}</td>
                <td className="pr-4 text-right text-[13px] text-figure tabular-nums">{tx.quantity}</td>
                <td className="pr-4 text-right text-[13px] text-figure tabular-nums">{formatCurrency(tx.price, currency as MarketCurrency)}</td>
                <td className="text-right text-[13px] text-figure tabular-nums">{formatCurrency(tx.total, currency as MarketCurrency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
