"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StockDetailHeader from '@/components/stock/StockDetailHeader';
import StockPriceChart from '@/components/stock/StockPriceChart';
import StockYourPosition from '@/components/stock/StockYourPosition';
import StockKeyStats from '@/components/stock/StockKeyStats';
import StockAbout from '@/components/stock/StockAbout';
import StockTransactionHistory from '@/components/stock/StockTransactionHistory';
import StockDividends from '@/components/stock/StockDividends';
import StockAnalystConsensus from '@/components/stock/StockAnalystConsensus';
import StockAnalystInsights from '@/components/stock/StockAnalystInsights';
import TelegramNewsFeed from '@/components/telegram/TelegramNewsFeed';
import { stockAPI } from '@/services/api';
import { StockDetail } from '@/types/stock-detail';

export default function WorldStockPage({ params }: { params: { ticker: string } }) {
  const router = useRouter();
  const ticker = params.ticker.toUpperCase();

  const [data, setData] = useState<StockDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await stockAPI.getWorldDetail(ticker);
        setData(result);
      } catch (err: any) {
        setError(err.response?.data?.detail || err.message || 'Failed to load stock data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ticker]);

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-pulse">
        <div className="h-4 w-16 bg-white/10 rounded" />
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 hidden sm:block" />
            <div className="space-y-2">
              <div className="h-7 w-48 bg-white/10 rounded" />
              <div className="h-4 w-32 bg-white/10 rounded" />
            </div>
          </div>
          <div className="bg-surface-dark-secondary p-4 rounded-xl border border-white/10 space-y-2">
            <div className="h-9 w-36 bg-white/10 rounded" />
            <div className="h-4 w-24 bg-white/10 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-surface-dark-secondary rounded-xl border border-white/10 h-64" />
          <div className="bg-surface-dark-secondary rounded-xl border border-white/10 h-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-surface-dark-secondary rounded-xl border border-white/10 h-80" />
            <div className="bg-surface-dark-secondary rounded-xl border border-white/10 h-48" />
          </div>
          <div className="bg-surface-dark-secondary rounded-xl border border-white/10 h-96" />
          <div className="space-y-6">
            <div className="bg-surface-dark-secondary rounded-xl border border-white/10 h-48" />
            <div className="bg-surface-dark-secondary rounded-xl border border-white/10 h-48" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8 flex flex-col items-center justify-center gap-4 min-h-[60vh]">
        <p className="text-loss text-sm">{error || 'Stock not found'}</p>
        <button onClick={() => router.back()} className="text-brand-400 text-sm hover:underline">← Go back</button>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <button
        onClick={() => router.back()}
        className="text-gray-400 hover:text-white transition-colors text-sm font-medium inline-flex items-center gap-1"
      >
        ← Back
      </button>

      <StockDetailHeader data={data} market="world" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <StockPriceChart
            ticker={ticker}
            market="world"
            currency={data.currency}
            fetchHistory={(period: string) => stockAPI.getWorldHistory(ticker, period)}
          />
        </div>
        <StockYourPosition portfolio={data.portfolio} currency={data.currency} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <StockKeyStats stats={data.stats} price={data.price} currency={data.currency} />
          <StockAnalystConsensus analyst={data.analyst} currency={data.currency} currentPrice={data.price.current} />
          <StockAnalystInsights analyst={data.analyst} />
        </div>
        <StockAbout about={data.about} />
        <div className="space-y-6">
          <StockTransactionHistory transactions={data.transactions} currency={data.currency} />
          <StockDividends dividends={data.dividends} currency={data.currency} />
        </div>
      </div>
      
      <TelegramNewsFeed ticker={ticker} compact={true} />
    </div>
  );
}
