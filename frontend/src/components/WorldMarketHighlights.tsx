"use client";

import React, { useEffect, useState, useMemo } from "react";
import { worldStocksAPI } from "@/services/api";
import {
  DollarSign,
  Building2,
  ArrowRight,
  Banknote,
  Globe,
} from "lucide-react";
import Link from "next/link";

interface WorldStockSummary {
  total_accounts: number;
  total_holdings: number;
  total_current_value: number;
  total_unrealized_pl: number;
  total_dividends: number;
  total_transactions: number;
}

export default function WorldMarketHighlights() {
  const [summary, setSummary] = useState<WorldStockSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchSummary() {
      try {
        setLoading(true);
        setError(null);
        const data = await worldStocksAPI.getSummary();
        if (!cancelled) {
          setSummary(data);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(
            e.response?.data?.detail ||
              e.message ||
              "Failed fetching world market data"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Globe className="h-6 w-6 text-brand-400" />
          <h2 className="text-xl font-semibold text-gray-100">
            World Market Portfolio
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-white/10 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Globe className="h-6 w-6 text-brand-400" />
          <h2 className="text-xl font-semibold text-gray-100">
            World Market Portfolio
          </h2>
        </div>
        <div className="text-sm text-loss bg-loss/10 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!summary || summary.total_holdings === 0) {
    return (
      <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Globe className="h-6 w-6 text-brand-400" />
          <h2 className="text-xl font-semibold text-gray-100">
            World Market Portfolio
          </h2>
        </div>
        <div className="text-center py-8">
          <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p className="text-gray-400 mb-4">No world stock data yet</p>
          <Link
            href="/world-stocks"
            className="inline-flex items-center px-4 py-2 bg-brand-400 text-surface-dark rounded-lg hover:bg-brand-500 transition-colors text-sm font-medium"
          >
            Upload Broker Statement
          </Link>
        </div>
      </div>
    );
  }

  const plPercentage =
    summary.total_current_value > 0
      ? (summary.total_unrealized_pl /
          (summary.total_current_value - summary.total_unrealized_pl)) *
        100
      : 0;

  return (
    <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Globe className="h-6 w-6 text-brand-400" />
          <h2 className="text-xl font-semibold text-gray-100">
            World Market Portfolio
          </h2>
        </div>
        <Link
          href="/world-stocks"
          className="text-sm text-brand-400 hover:text-brand-500 font-medium"
        >
          View Details →
        </Link>
      </div>

      <div className="space-y-4">
        {/* Portfolio Value */}
        <div className="flex items-center justify-between p-4 bg-brand-400/10 rounded-xl border border-brand-400/20">
          <div className="flex items-center space-x-3">
            <Banknote className="h-8 w-8 text-brand-400" />
            <div>
              <p className="text-sm text-brand-400 font-medium">
                Portfolio Value
              </p>
              <p className="text-2xl font-bold text-gray-100">
                {formatCurrency(summary.total_current_value)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-brand-400">
              {summary.total_holdings} holdings
            </p>
            <p className="text-xs text-brand-400/70">
              {summary.total_accounts} account
              {summary.total_accounts !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Unrealized P/L */}
        <div
          className={`flex items-center justify-between p-4 rounded-xl border ${
            summary.total_unrealized_pl >= 0
              ? "bg-gain/10 border-gain/20"
              : "bg-loss/10 border-loss/20"
          }`}
        >
          <div className="flex items-center space-x-3">
            <Building2
              className={`h-8 w-8 ${
                summary.total_unrealized_pl >= 0
                  ? "text-gain"
                  : "text-loss"
              }`}
            />
            <div>
              <p
                className={`text-sm font-medium ${
                  summary.total_unrealized_pl >= 0
                    ? "text-gain"
                    : "text-loss"
                }`}
              >
                Unrealized P/L
              </p>
              <p
                className={`text-2xl font-bold ${
                  summary.total_unrealized_pl >= 0
                    ? "text-gain"
                    : "text-loss"
                }`}
              >
                {formatCurrency(summary.total_unrealized_pl)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`text-lg font-bold ${
                plPercentage >= 0 ? "text-gain" : "text-loss"
              }`}
            >
              {plPercentage >= 0 ? "+" : ""}
              {plPercentage.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Dividends */}
        <div className="flex items-center justify-between p-4 bg-purple-500/10 rounded-xl border border-purple-500/20">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-sm text-purple-400 font-medium">
                Total Dividends
              </p>
              <p className="text-2xl font-bold text-gray-100">
                {formatCurrency(summary.total_dividends)}
              </p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
          <div className="flex items-center space-x-3">
            <ArrowRight className="h-6 w-6 text-gray-400" />
            <div>
              <p className="text-sm text-gray-300 font-medium">Transactions</p>
              <p className="text-lg font-semibold text-gray-100">
                {summary.total_transactions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6 pt-6 border-t border-white/10">
        <Link
          href="/world-stocks"
          className="block w-full text-center px-4 py-2 bg-brand-400 text-surface-dark rounded-lg hover:bg-brand-500 transition-colors font-medium"
        >
          Manage World Stocks
        </Link>
      </div>
    </div>
  );
}
