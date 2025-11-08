"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowRightIcon,
  CalendarIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  TrashIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { worldStocksAPI } from "@/services/api";
import { WorldStockTransaction } from "@/types/world-stocks";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

interface WorldStockTransactionsProps {
  refreshTrigger?: number;
  accountId?: number;
  symbol?: string;
}

export default function WorldStockTransactions({
  refreshTrigger,
  accountId,
  symbol,
}: WorldStockTransactionsProps) {
  const [transactions, setTransactions] = useState<WorldStockTransaction[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await worldStocksAPI.getTransactions(accountId, symbol);
      setTransactions(data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          err.message ||
          "Failed to load transactions"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [refreshTrigger, accountId, symbol]);

  const formatCurrency = (amount?: number) => {
    if (!amount && amount !== 0) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatNumber = (num?: number) => {
    if (!num) return "0";
    return new Intl.NumberFormat("en-US").format(num);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US");
  };

  const getTransactionIcon = (code: string) => {
    switch (code?.toUpperCase()) {
      case "O": // Open
        return <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />;
      case "C": // Close
        return <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />;
      case "P": // Partial
        return <ArrowRightIcon className="h-5 w-5 text-blue-600" />;
      default:
        return <ArrowRightIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTransactionColor = (code: string) => {
    switch (code?.toUpperCase()) {
      case "O":
        return "text-green-600 bg-green-50 border-green-200";
      case "C":
        return "text-red-600 bg-red-50 border-red-200";
      case "P":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getTransactionLabel = (code: string) => {
    switch (code?.toUpperCase()) {
      case "O":
        return "Open";
      case "C":
        return "Close";
      case "P":
        return "Partial";
      default:
        return code || "Unknown";
    }
  };

  // Calculate metrics
  const totalOpened = transactions
    .filter((t) => t.o_c_p_code?.toUpperCase() === "O")
    .reduce(
      (sum, t) => sum + (t.quantity || 0) * (t.price || 0) + (t.commission || 0),
      0
    );

  const totalClosed = transactions
    .filter((t) => t.o_c_p_code?.toUpperCase() === "C")
    .reduce(
      (sum, t) => sum + (t.quantity || 0) * (t.price || 0) - (t.commission || 0),
      0
    );

  const totalCommission = transactions.reduce(
    (sum, t) => sum + (t.commission || 0),
    0
  );

  // Monthly activity data for chart
  const monthlyData = useMemo(() => {
    const map: Record<string, { month: string; opened: number; closed: number }> =
      {};

    transactions.forEach((t) => {
      if (!t.trade_date) return;
      
      const date = new Date(t.trade_date);
      if (isNaN(date.getTime())) return;

      const monthKey = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });

      if (!map[monthKey]) {
        map[monthKey] = { month: monthLabel, opened: 0, closed: 0 };
      }

      const value = (t.quantity || 0) * (t.price || 0);

      if (t.o_c_p_code?.toUpperCase() === "O") {
        map[monthKey].opened += value;
      } else if (t.o_c_p_code?.toUpperCase() === "C") {
        map[monthKey].closed += value;
      }
    });

    return Object.values(map).sort((a, b) => {
      const [aYear, aMonth] = a.month.split(" ");
      const [bYear, bMonth] = b.month.split(" ");
      return (
        new Date(`${aMonth} 1, ${aYear}`).getTime() -
        new Date(`${bMonth} 1, ${bYear}`).getTime()
      );
    });
  }, [transactions]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            World Stock Transactions
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
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
            World Stock Transactions
          </h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">
            Error Loading Transactions
          </h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchTransactions}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            World Stock Transactions
          </h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <ArrowRightIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Transactions Found
          </h3>
          <p className="text-gray-600 mb-4">
            Upload a world stock broker statement to see your transaction
            history.
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
          World Stock Transactions
        </h2>
        <button
          onClick={fetchTransactions}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <CalendarIcon className="h-8 w-8 opacity-80" />
            <div className="ml-3">
              <p className="text-sm opacity-80">Total Transactions</p>
              <p className="text-2xl font-bold">{transactions.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="h-8 w-8 opacity-80" />
            <div className="ml-3">
              <p className="text-sm opacity-80">Opened Positions</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalOpened)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <ArrowTrendingDownIcon className="h-8 w-8 opacity-80" />
            <div className="ml-3">
              <p className="text-sm opacity-80">Closed Positions</p>
              <p className="text-2xl font-bold">
                {formatCurrency(totalClosed)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Activity Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Monthly Transaction Activity
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                }}
              />
              <Legend />
              <Bar dataKey="opened" fill="#10b981" name="Opened" />
              <Bar dataKey="closed" fill="#ef4444" name="Closed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Value
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commission
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => {
                const totalValue =
                  (transaction.quantity || 0) * (transaction.price || 0);

                return (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(transaction.trade_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900">
                        {transaction.symbol}
                      </div>
                      <div className="text-xs text-gray-500 max-w-xs truncate">
                        {transaction.description || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTransactionColor(
                          transaction.o_c_p_code || ""
                        )}`}
                      >
                        {getTransactionIcon(transaction.o_c_p_code || "")}
                        <span className="ml-1">
                          {getTransactionLabel(transaction.o_c_p_code || "")}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatNumber(transaction.quantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                      {formatCurrency(transaction.price)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                      {formatCurrency(totalValue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      {formatCurrency(transaction.commission)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-gray-50 border-t-2 border-gray-200">
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-4 text-right text-sm font-semibold text-gray-700"
                >
                  Total Commission:
                </td>
                <td
                  colSpan={2}
                  className="px-6 py-4 text-right text-sm font-bold text-gray-900"
                >
                  {formatCurrency(totalCommission)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
