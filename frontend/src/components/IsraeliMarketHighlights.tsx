"use client";

import React, { useEffect, useState, useMemo } from "react";
import { israeliStocksAPI } from "@/services/api";
import {
  DollarSign,
  Building2,
  ArrowRight,
  Banknote,
  BarChart3,
} from "lucide-react";

interface IsraeliHolding {
  id: number;
  symbol: string;
  quantity: number;
  current_value?: number;
  purchase_cost?: number;
  last_price?: number;
  company_name?: string;
  logo_svg?: string;
}
interface IsraeliTransaction {
  id: number;
  transaction_type: string;
  date?: string;
  time?: string;
  quantity?: number;
  price?: number;
  total_value?: number;
  commission?: number;
  symbol?: string;
}
interface IsraeliDividend {
  id: number;
  symbol: string;
  amount: number;
  tax?: number;
  payment_date?: string;
}

export default function IsraeliMarketHighlights() {
  const [holdings, setHoldings] = useState<IsraeliHolding[]>([]);
  const [transactions, setTransactions] = useState<IsraeliTransaction[]>([]);
  const [dividends, setDividends] = useState<IsraeliDividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      try {
        setLoading(true);
        setError(null);
        const [h, t, d] = await Promise.all([
          israeliStocksAPI.getHoldings(500),
          israeliStocksAPI.getTransactions(500),
          israeliStocksAPI.getDividends(500),
        ]);
        if (!cancelled) {
          setHoldings(h || []);
          setTransactions(t || []);
          setDividends(d || []);
        }
      } catch (e: any) {
        if (!cancelled)
          setError(
            e.response?.data?.detail ||
              e.message ||
              "Failed fetching Israeli market data"
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, []);

  const metrics = useMemo(() => {
    const totalHoldings = holdings.length;
    const grossDividends = dividends.reduce((s, d) => s + (d.amount || 0), 0);
    const totalDividendTax = dividends.reduce((s, d) => s + (d.tax || 0), 0);
    const netDividends = grossDividends - totalDividendTax;
    let commission = 0;
    transactions.forEach((t) => {
      if (t.commission) commission += t.commission;
    });

    // Align with holdings tab: current value = sum(current_value); invested = sum(purchase_cost)
    const currentValue = holdings.reduce(
      (sum, h) => sum + (h.current_value || 0),
      0
    );
    const invested = holdings.reduce(
      (sum, h) => sum + (h.purchase_cost || 0),
      0
    );
    const totalReturnAmount = currentValue - invested;
    const totalReturnPercent =
      invested > 0 ? (totalReturnAmount / invested) * 100 : 0;

    // Recent activity: last 5 transactions excluding dividends
    const recent = transactions
      .filter(
        (t) => t.transaction_type === "BUY" || t.transaction_type === "SELL"
      )
      .sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return db - da;
      })
      .slice(0, 5);

    return {
      totalHoldings,
      grossDividends,
      totalDividendTax,
      netDividends,
      commission,
      invested,
      currentValue,
      totalReturnAmount,
      totalReturnPercent,
      recent,
    };
  }, [holdings, transactions, dividends]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(value || 0);

  if (loading) {
    return (
      <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6 animate-pulse">
        <div className="h-4 bg-white/10 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-white/5 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-dark-secondary rounded-xl border border-loss/30 p-6">
        <h3 className="text-lg font-medium text-loss mb-2">
          Israeli Market Highlights
        </h3>
        <p className="text-sm text-loss mb-2">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            setError(null);
          }}
          className="text-sm text-brand-400 font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-100">
          Israeli Market Highlights
        </h3>
        <a
          href="/israeli-stocks"
          className="text-sm text-brand-400 hover:text-brand-500 font-medium flex items-center gap-1"
        >
          View Dashboard <ArrowRight className="h-4 w-4" />
        </a>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="metric-card bg-gradient-to-r from-blue-500 to-blue-600">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 opacity-80" />
            <div className="ml-3">
              <p className="text-xs opacity-80">Holdings</p>
              <p className="text-xl font-bold">{metrics.totalHoldings}</p>
            </div>
          </div>
        </div>
        {/* Unified Dividends Card */}
        <div className="metric-card bg-gradient-to-r from-green-500 to-green-600">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 opacity-80" />
            <div className="ml-3">
              <p className="text-xs opacity-80">Dividends (Gross / Net)</p>
              <p className="text-sm font-semibold leading-tight">
                {formatCurrency(metrics.grossDividends)}
              </p>
              <p className="text-[11px] opacity-80">
                Net: {formatCurrency(metrics.netDividends)}
              </p>
            </div>
          </div>
        </div>
        {/* Current Value Card */}
        <div className="metric-card bg-gradient-to-r from-amber-500 to-amber-600">
          <div className="flex items-center">
            <Banknote className="h-8 w-8 opacity-80" />
            <div className="ml-3">
              <p className="text-xs opacity-80">Current Value</p>
              <p className="text-xl font-bold">
                {formatCurrency(metrics.currentValue)}
              </p>
            </div>
          </div>
        </div>
        <div className="metric-card bg-gradient-to-r from-purple-500 to-purple-600">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 opacity-80" />
            <div className="ml-3">
              <p className="text-xs opacity-80">Commission Paid</p>
              <p className="text-xl font-bold">
                {formatCurrency(metrics.commission)}
              </p>
            </div>
          </div>
        </div>
        {/* Total Return Card */}
        <div
          className={`metric-card ${
            metrics.totalReturnAmount >= 0
              ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
              : "bg-gradient-to-r from-rose-500 to-rose-600"
          }`}
        >
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 opacity-80" />
            <div className="ml-3">
              <p className="text-xs opacity-80">Total Return</p>
              <p className="text-sm font-semibold leading-tight">
                {formatCurrency(metrics.totalReturnAmount)}
              </p>
              <p className="text-[11px] opacity-80">
                {metrics.totalReturnPercent.toFixed(2)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-300 mb-2">
          Recent Activity
        </h4>
        {metrics.recent.length === 0 ? (
          <p className="text-xs text-gray-500">No recent transactions</p>
        ) : (
          <ul className="divide-y divide-white/5">
            {metrics.recent.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between py-2 text-xs"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full text-white font-medium ${
                      t.transaction_type === "BUY"
                        ? "bg-gain"
                        : "bg-loss"
                    }`}
                  >
                    {t.transaction_type}
                  </span>
                  <span className="font-medium text-gray-100">{t.symbol || "-"}</span>
                  <span className="text-gray-500">
                    {t.quantity || 0} @ {t.price || 0}
                  </span>
                </div>
                <div
                  className={`font-medium ${
                    t.transaction_type === "BUY"
                      ? "text-loss"
                      : "text-gain"
                  }`}
                >
                  {formatCurrency(t.total_value || 0)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
