import React from 'react';
import { StockDividend } from '@/types/stock-detail';
import { formatCurrency, formatDate, MarketCurrency } from '@/utils/formatters';

interface StockDividendsProps {
  dividends: StockDividend[];
  currency: string;
}

export default function StockDividends({ dividends, currency }: StockDividendsProps) {
  const empty = !dividends || dividends.length === 0;

  return (
    <div>
      <div className="tape-label mb-2">Dividends{!empty ? ` · ${dividends.length}` : ''}</div>
      {empty ? (
        <div className="h-8 flex items-center text-[13px] text-label border-b border-rule-row">No dividends recorded for this holding.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b-2 border-rule-section">
                {['Date', 'Per share', 'Amount'].map((h, i) => (
                  <th key={h} className={`tape-label py-1.5 pr-4 ${i >= 1 ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dividends.map((div) => (
                <tr key={div.id} className="border-b border-rule-row hover:bg-white/[0.02] transition-colors h-7">
                  <td className="pr-4 text-[13px] text-label whitespace-nowrap tabular-nums">{formatDate(div.payment_date || undefined)}</td>
                  <td className="pr-4 text-right text-[13px] text-label tabular-nums">{div.per_share ? formatCurrency(div.per_share, currency as MarketCurrency) : '—'}</td>
                  <td className="text-right text-[13px] tabular-nums text-gain">+{formatCurrency(div.net_amount, currency as MarketCurrency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
