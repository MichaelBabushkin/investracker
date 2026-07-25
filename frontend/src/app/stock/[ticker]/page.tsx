"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import StockDetailHeader from '@/components/stock/StockDetailHeader';
import StockYourPosition from '@/components/stock/StockYourPosition';
import StockKeyStats from '@/components/stock/StockKeyStats';
import StockAbout from '@/components/stock/StockAbout';
import StockTransactionHistory from '@/components/stock/StockTransactionHistory';
import StockDividends from '@/components/stock/StockDividends';
import StockAnalystConsensus from '@/components/stock/StockAnalystConsensus';
import StockAnalystInsights from '@/components/stock/StockAnalystInsights';
import NewsFeed from '@/components/telegram/NewsFeed';
import TechnicalIndicators from '@/components/indicators/TechnicalIndicators';
import StockSectionNav from '@/components/stock/StockSectionNav';
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
      <div className="px-4 sm:px-6 lg:px-10 py-6 animate-pulse">
        <div className="flex justify-between gap-4 pb-4 border-b-2 border-rule-section">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/[0.06] hidden sm:block" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-white/[0.06] rounded" />
              <div className="h-3 w-32 bg-white/[0.04] rounded" />
            </div>
          </div>
          <div className="space-y-2 text-right">
            <div className="h-7 w-32 bg-white/[0.06] rounded ml-auto" />
            <div className="h-3 w-24 bg-white/[0.04] rounded ml-auto" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-7 bg-white/[0.03] rounded" />)}</div>
          <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="h-7 bg-white/[0.03] rounded" />)}</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="px-4 sm:px-6 lg:px-10 py-6 flex flex-col items-center justify-center gap-3 min-h-[60vh]">
        <p className="text-loss text-[13px]">{error || 'Stock not found'}</p>
        <button onClick={() => router.back()} className="text-brand-400 text-[13px] hover:underline">← Go back</button>
      </div>
    );
  }

  const held = data.portfolio.held && data.portfolio.quantity > 0;

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6">
      <button
        onClick={() => router.back()}
        className="text-label hover:text-figure transition-colors text-[12px] font-medium inline-flex items-center gap-1 mb-3"
      >
        ← Back
      </button>

      <StockDetailHeader data={data} market="world" />

      <StockSectionNav
        items={[
          ...(held ? [{ id: "position", label: "Position" }] : []),
          { id: "stats", label: "Stats & Activity" },
          { id: "about", label: "About" },
          { id: "chart", label: "Chart & Signals" },
          { id: "news", label: "News" },
        ]}
      />

      {/* 1. Your stake — the most personal fact, right under the header */}
      {held && (
        <section id="position" className="scroll-mt-16 pt-6">
          <StockYourPosition portfolio={data.portfolio} currency={data.currency} />
        </section>
      )}

      {/* 2. Market data & opinions | 3. Your activity */}
      <section id="stats" className={`scroll-mt-16 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-x-10 gap-y-8 items-start ${held ? "mt-6 border-t border-rule-section" : ""}`}>
        <div className="lg:col-span-2 space-y-8">
          <StockKeyStats stats={data.stats} price={data.price} currency={data.currency} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 items-start">
            <StockTransactionHistory transactions={data.transactions} currency={data.currency} />
            <StockDividends dividends={data.dividends} currency={data.currency} />
          </div>
        </div>
        <div className="lg:col-span-1 space-y-8">
          <StockAnalystConsensus analyst={data.analyst} currency={data.currency} currentPrice={data.price.current} />
          <StockAnalystInsights analyst={data.analyst} />
        </div>
      </section>

      {/* 4. Company background — reads better full-width, lowest priority */}
      <section id="about" className="scroll-mt-16 pt-6 mt-6 border-t border-rule-section">
        <StockAbout about={data.about} />
      </section>

      {/* 5. The chart: price + overlays + trades + oscillators, all synced */}
      <section id="chart" className="scroll-mt-16 pt-6 mt-6 border-t border-rule-section">
        <TechnicalIndicators
          symbol={ticker}
          market="world"
          trades={data.transactions
            .filter((t) => t.date && (t.type === "BUY" || t.type === "SELL"))
            .map((t) => ({ date: t.date!, type: t.type, quantity: t.quantity, price: t.price }))}
        />
      </section>

      <section id="news" className="scroll-mt-16 pt-6 mt-6 border-t border-rule-section">
        <NewsFeed layout="compact" ticker={ticker} title="News" seeAllHref="/news" pageSize={5} />
      </section>
    </div>
  );
}
