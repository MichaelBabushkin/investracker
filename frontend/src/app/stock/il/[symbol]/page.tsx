"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import StockDetailHeader from '@/components/stock/StockDetailHeader';
import StockPriceChart from '@/components/stock/StockPriceChart';
import StockYourPosition from '@/components/stock/StockYourPosition';
import StockKeyStats from '@/components/stock/StockKeyStats';
import StockAbout from '@/components/stock/StockAbout';
import StockTransactionHistory from '@/components/stock/StockTransactionHistory';
import StockDividends from '@/components/stock/StockDividends';
import StockAnalystConsensus from '@/components/stock/StockAnalystConsensus';
import { stockAPI } from '@/services/api';
import { StockDetail } from '@/types/stock-detail';

export default function IsraeliStockPage({ params }: { params: { symbol: string } }) {
  const router = useRouter();
  const symbol = params.symbol.toUpperCase();

  const [data, setData] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await stockAPI.getIsraeliDetail(symbol);
        setData(result);
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message || 'Failed to load stock data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [symbol]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-dark px-4 sm:px-6 lg:px-8 py-8 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-400" size={32} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-surface-dark px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center justify-center gap-4">
        <p className="text-loss text-sm">{error || 'Stock not found'}</p>
        <button onClick={() => router.back()} className="text-brand-400 text-sm hover:underline">← Go back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-dark px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={() => router.back()}
        className="text-gray-400 hover:text-white transition-colors text-sm font-medium inline-flex items-center gap-1"
      >
        ← Back
      </button>

      <StockDetailHeader data={data} market="il" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <StockPriceChart
            ticker={symbol}
            market="il"
            currency={data.currency}
            fetchHistory={(period: string) => stockAPI.getIsraeliHistory(symbol, period)}
          />
        </div>
        <StockYourPosition portfolio={data.portfolio} currency={data.currency} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <StockKeyStats stats={data.stats} price={data.price} currency={data.currency} />
          <StockAnalystConsensus analyst={data.analyst} currency={data.currency} currentPrice={data.price.current} />
        </div>
        <StockAbout about={data.about} />
        <div className="space-y-6">
          <StockTransactionHistory transactions={data.transactions} currency={data.currency} />
          <StockDividends dividends={data.dividends} currency={data.currency} />
        </div>
      </div>
    </div>
  );
}
