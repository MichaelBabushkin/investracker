"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  CurrencyDollarIcon,
  CalendarIcon,
  BanknotesIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { worldStocksAPI } from "@/services/api";
import { WorldStockDividend } from "@/types/world-stocks";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

interface WorldStockDividendsProps {
  refreshTrigger?: number;
  accountId?: number;
  symbol?: string;
}

export default function WorldStockDividends({
  refreshTrigger,
  accountId,
  symbol,
}: WorldStockDividendsProps) {
  const [dividends, setDividends] = useState<WorldStockDividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDividends = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await worldStocksAPI.getDividends(accountId, symbol);
      setDividends(data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || "Failed to load dividends"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDividends();
  }, [refreshTrigger, accountId, symbol]);

  const formatCurrency = (amount?: number | string) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (!num && num !== 0) return "$0.00";
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Calculate metrics (use 'amount' field which is the gross amount from API)
  const totalGrossDividends = (dividends || []).reduce((sum, dividend) => {
    const amount = parseFloat(
      String(dividend.amount || dividend.gross_amount || 0)
    );
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  const totalWithholdingTax = (dividends || []).reduce((sum, dividend) => {
    const tax = parseFloat(String(dividend.withholding_tax || 0));
    return sum + (isNaN(tax) ? 0 : tax);
  }, 0);
  const totalNetDividends = (dividends || []).reduce((sum, dividend) => {
    const net = parseFloat(String(dividend.net_amount || 0));
    return sum + (isNaN(net) ? 0 : net);
  }, 0);

  // Group dividends by symbol
  const dividendsBySymbol = (dividends || []).reduce((acc, dividend) => {
    const key = dividend.symbol;
    if (!acc[key]) {
      acc[key] = {
        symbol: dividend.symbol,
        description: dividend.description,
        total_gross: 0,
        total_tax: 0,
        total_net: 0,
        count: 0,
        dividends: [],
      };
    }
    const gross = parseFloat(
      String(dividend.amount || dividend.gross_amount || 0)
    );
    const tax = parseFloat(String(dividend.withholding_tax || 0));
    const net = parseFloat(String(dividend.net_amount || 0));

    acc[key].total_gross += isNaN(gross) ? 0 : gross;
    acc[key].total_tax += isNaN(tax) ? 0 : tax;
    acc[key].total_net += isNaN(net) ? 0 : net;
    acc[key].count += 1;
    acc[key].dividends.push(dividend);
    return acc;
  }, {} as Record<string, any>);

  // Monthly data for chart
  const monthlyData = (() => {
    const map = new Map<
      string,
      { key: string; label: string; gross: number; tax: number; net: number }
    >();

    for (const d of dividends || []) {
      if (!d.payment_date) continue;
      const dt = new Date(d.payment_date);
      if (isNaN(dt.getTime())) continue;

      const year = dt.getFullYear();
      const month = dt.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, "0")}`;
      const label = dt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });

      if (!map.has(key)) {
        map.set(key, { key, label, gross: 0, tax: 0, net: 0 });
      }

      const item = map.get(key)!;
      const gross = parseFloat(String(d.amount || d.gross_amount || 0));
      const tax = parseFloat(String(d.withholding_tax || 0));
      const net = parseFloat(String(d.net_amount || 0));

      item.gross += isNaN(gross) ? 0 : gross;
      item.tax += isNaN(tax) ? 0 : tax;
      item.net += isNaN(net) ? 0 : net;
    }

    const sorted = Array.from(map.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    );

    return sorted.slice(-12); // Last 12 months
  })();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            World Stock Dividends
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-4 rounded-lg shadow-md border border-gray-200"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            World Stock Dividends
          </h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">
            Error Loading Dividends
          </h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchDividends}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!dividends || dividends.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            World Stock Dividends
          </h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <CurrencyDollarIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Dividends Found
          </h3>
          <p className="text-gray-600 mb-4">
            Upload a world stock broker statement to see your dividend income.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          World Stock Dividends
        </h2>
        <button
          onClick={fetchDividends}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 opacity-80" />
            <div className="ml-3">
              <p className="text-sm opacity-80">Total Payments</p>
              <p className="text-2xl font-bold">{dividends.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <BanknotesIcon className="h-8 w-8 opacity-80" />
            <div className="ml-3">
              <p className="text-sm opacity-80">Gross Dividends</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalGrossDividends)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 opacity-80" />
            <div className="ml-3">
              <p className="text-sm opacity-80">Withholding Tax</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalWithholdingTax)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <CurrencyDollarIcon className="h-8 w-8 opacity-80" />
            <div className="ml-3">
              <p className="text-sm opacity-80">Net Dividends</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalNetDividends)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Dividend Income
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={(value) => `$${value.toFixed(0)}`} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                }}
              />
              <Legend />
              <Bar dataKey="gross" fill="#10b981" name="Gross" stackId="a" />
              <Bar dataKey="tax" fill="#ef4444" name="Tax" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Dividends Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Withholding Tax
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Amount
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dividends.map((dividend) => (
                <tr key={dividend.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(dividend.payment_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-semibold text-gray-900">
                      {dividend.symbol}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {dividend.description || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                    {formatCurrency(dividend.amount || dividend.gross_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-red-600">
                    {formatCurrency(dividend.withholding_tax)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-green-600">
                    {formatCurrency(dividend.net_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td
                  colSpan={3}
                  className="px-6 py-4 text-right text-sm font-semibold text-gray-700"
                >
                  Totals:
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                  {formatCurrency(totalGrossDividends)}
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold text-red-600">
                  {formatCurrency(totalWithholdingTax)}
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold text-green-600">
                  {formatCurrency(totalNetDividends)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
