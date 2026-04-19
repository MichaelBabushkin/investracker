"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import StockLogo from "@/components/StockLogo";

export interface TradeEntry {
  id: number | string;
  symbol: string;
  transaction_date?: string;
  transaction_time?: string;
  quantity?: number;
  realized_pl?: number | string | null;
  logo_url?: string | null;
}

interface TopTradesPanelProps {
  trades: TradeEntry[];
  formatCurrency: (amount?: number) => string;
  formatDate: (dateStr?: string) => string;
  /** Label shown under quantity, e.g. "shares" or "units" */
  unitLabel?: string;
}

export default function TopTradesPanel({
  trades,
  formatCurrency,
  formatDate,
  unitLabel = "shares",
}: TopTradesPanelProps) {
  const parsePL = (val?: number | string | null): number => {
    if (val === null || val === undefined || val === "") return NaN;
    const n = Number(val);
    return isNaN(n) ? NaN : n;
  };

  const tradesWithPL = trades.filter((t) => {
    const pl = parsePL(t.realized_pl);
    return !isNaN(pl) && pl !== 0;
  });

  const bestTrades = [...tradesWithPL]
    .filter((t) => parsePL(t.realized_pl) > 0)
    .sort((a, b) => parsePL(b.realized_pl) - parsePL(a.realized_pl))
    .slice(0, 5);

  const worstTrades = [...tradesWithPL]
    .filter((t) => parsePL(t.realized_pl) < 0)
    .sort((a, b) => parsePL(a.realized_pl) - parsePL(b.realized_pl))
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Best Trades */}
      <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
          <TrendingUp className="h-6 w-6 text-gain mr-2" />
          Top 5 Best Trades
        </h3>
        <div className="space-y-3">
          {bestTrades.length > 0 ? (
            bestTrades.map((trade, idx) => (
              <div
                key={trade.id}
                className="flex items-center justify-between p-3 bg-gain/10 rounded-xl border border-gain/10"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <StockLogo
                    symbol={trade.symbol}
                    logoUrl={trade.logo_url}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <div>
                    <p className="font-semibold text-gray-100">{trade.symbol}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(trade.transaction_date)}
                      {trade.transaction_time ? ` • ${trade.transaction_time}` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gain">
                    {formatCurrency(parsePL(trade.realized_pl))}
                  </p>
                  <p className="text-xs text-gray-400">
                    {Math.abs(trade.quantity || 0)} {unitLabel}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-4">No profitable trades yet</p>
          )}
        </div>
      </div>

      {/* Worst Trades */}
      <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
          <TrendingDown className="h-6 w-6 text-loss mr-2" />
          Top 5 Worst Trades
        </h3>
        <div className="space-y-3">
          {worstTrades.length > 0 ? (
            worstTrades.map((trade, idx) => (
              <div
                key={trade.id}
                className="flex items-center justify-between p-3 bg-loss/10 rounded-xl border border-loss/10"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-red-600 text-white rounded-full text-sm font-bold flex-shrink-0">
                    {idx + 1}
                  </div>
                  <StockLogo
                    symbol={trade.symbol}
                    logoUrl={trade.logo_url}
                    size="sm"
                    className="flex-shrink-0"
                  />
                  <div>
                    <p className="font-semibold text-gray-100">{trade.symbol}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(trade.transaction_date)}
                      {trade.transaction_time ? ` • ${trade.transaction_time}` : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-loss">
                    {formatCurrency(parsePL(trade.realized_pl))}
                  </p>
                  <p className="text-xs text-gray-400">
                    {Math.abs(trade.quantity || 0)} {unitLabel}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-4">No losing trades yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
