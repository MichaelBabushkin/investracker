"use client";

import React, { useEffect, useState, useMemo } from "react";
import { worldStocksAPI } from "@/services/api";
import {
  CurrencyDollarIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  BanknotesIcon,
  GlobeAmericasIcon,
} from "@heroicons/react/24/outline";
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <GlobeAmericasIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            World Market Portfolio
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <GlobeAmericasIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            World Market Portfolio
          </h2>
        </div>
        <div className="text-sm text-red-600 bg-red-50 p-4 rounded-lg">
          {error}
        </div>
      </div>
    );
  }

  if (!summary || summary.total_holdings === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <GlobeAmericasIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            World Market Portfolio
          </h2>
        </div>
        <div className="text-center py-8">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <p className="text-gray-600 mb-4">No world stock data yet</p>
          <Link
            href="/world-stocks"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <GlobeAmericasIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            World Market Portfolio
          </h2>
        </div>
        <Link
          href="/world-stocks"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View Details →
        </Link>
      </div>

      <div className="space-y-4">
        {/* Portfolio Value */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
          <div className="flex items-center space-x-3">
            <BanknotesIcon className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-blue-700 font-medium">
                Portfolio Value
              </p>
              <p className="text-2xl font-bold text-blue-900">
                {formatCurrency(summary.total_current_value)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-700">
              {summary.total_holdings} holdings
            </p>
            <p className="text-xs text-blue-600">
              {summary.total_accounts} account
              {summary.total_accounts !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {/* Unrealized P/L */}
        <div
          className={`flex items-center justify-between p-4 rounded-lg border ${
            summary.total_unrealized_pl >= 0
              ? "bg-gradient-to-r from-green-50 to-green-100 border-green-200"
              : "bg-gradient-to-r from-red-50 to-red-100 border-red-200"
          }`}
        >
          <div className="flex items-center space-x-3">
            <BuildingOfficeIcon
              className={`h-8 w-8 ${
                summary.total_unrealized_pl >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            />
            <div>
              <p
                className={`text-sm font-medium ${
                  summary.total_unrealized_pl >= 0
                    ? "text-green-700"
                    : "text-red-700"
                }`}
              >
                Unrealized P/L
              </p>
              <p
                className={`text-2xl font-bold ${
                  summary.total_unrealized_pl >= 0
                    ? "text-green-900"
                    : "text-red-900"
                }`}
              >
                {formatCurrency(summary.total_unrealized_pl)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p
              className={`text-lg font-bold ${
                plPercentage >= 0 ? "text-green-700" : "text-red-700"
              }`}
            >
              {plPercentage >= 0 ? "+" : ""}
              {plPercentage.toFixed(2)}%
            </p>
          </div>
        </div>

        {/* Dividends */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-3">
            <CurrencyDollarIcon className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-purple-700 font-medium">
                Total Dividends
              </p>
              <p className="text-2xl font-bold text-purple-900">
                {formatCurrency(summary.total_dividends)}
              </p>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <ArrowRightIcon className="h-6 w-6 text-gray-600" />
            <div>
              <p className="text-sm text-gray-700 font-medium">Transactions</p>
              <p className="text-lg font-semibold text-gray-900">
                {summary.total_transactions}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <Link
          href="/world-stocks"
          className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          Manage World Stocks
        </Link>
      </div>
    </div>
  );
}
