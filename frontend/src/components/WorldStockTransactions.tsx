"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ArrowRight,
  Calendar,
  Banknote,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Trash2,
  AlertTriangle,
} from "lucide-react";
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
  const [transactions, setTransactions] = useState<WorldStockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
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
  }, [accountId, symbol]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions, refreshTrigger]);

  const formatCurrency = (amount?: number | string) => {
    if (amount === null || amount === undefined) return "$0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(num);
  };

  const formatNumber = (num?: number | string) => {
    if (num === null || num === undefined) return "0";
    const value = typeof num === "string" ? parseFloat(num) : num;
    if (isNaN(value)) return "0";
    return new Intl.NumberFormat("en-US").format(value);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-US");
  };

  const getTransactionIcon = (type: string) => {
    switch (type?.toUpperCase()) {
      case "BUY":
        return <TrendingUp className="h-5 w-5 text-gain" />;
      case "SELL":
        return <TrendingDown className="h-5 w-5 text-loss" />;
      default:
        return <ArrowRight className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type?.toUpperCase()) {
      case "BUY":
        return "text-gain bg-gain/10 border-gain/20";
      case "SELL":
        return "text-loss bg-loss/10 border-loss/20";
      default:
        return "text-gray-400 bg-surface-dark border-white/10";
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type?.toUpperCase()) {
      case "BUY":
        return "Buy";
      case "SELL":
        return "Sell";
      default:
        return type || "Unknown";
    }
  };

  // Calculate comprehensive metrics
  const metrics = useMemo(() => {
    const closedTrades = transactions.filter(
      (t) => t.transaction_type?.toUpperCase() === "SELL"
    );
    const openTrades = transactions.filter(
      (t) => t.transaction_type?.toUpperCase() === "BUY"
    );

    // Helper function to safely parse numeric values
    const parseNumeric = (value: any): number => {
      if (value === null || value === undefined) return 0;
      const num = typeof value === "string" ? parseFloat(value) : Number(value);
      return isNaN(num) ? 0 : num;
    };

    // Realized P/L statistics
    const totalRealizedPL = closedTrades.reduce((sum, t) => {
      return sum + parseNumeric(t.realized_pl);
    }, 0);

    const profitableTrades = closedTrades.filter(
      (t) => parseNumeric(t.realized_pl) > 0
    );
    const losingTrades = closedTrades.filter(
      (t) => parseNumeric(t.realized_pl) < 0
    );

    const totalProfit = profitableTrades.reduce((sum, t) => {
      return sum + parseNumeric(t.realized_pl);
    }, 0);

    const totalLoss = losingTrades.reduce((sum, t) => {
      return sum + parseNumeric(t.realized_pl);
    }, 0);

    // Commission statistics
    const totalCommission = transactions.reduce((sum, t) => {
      return sum + Math.abs(parseNumeric(t.commission));
    }, 0);

    // Volume statistics
    const totalVolume = transactions.reduce((sum, t) => {
      const qty = Math.abs(parseNumeric(t.quantity));
      const price = parseNumeric(t.price || t.trade_price);
      return sum + qty * price;
    }, 0);

    const avgTradeSize =
      transactions.length > 0 ? totalVolume / transactions.length : 0;

    // Win rate
    const winRate =
      closedTrades.length > 0
        ? (profitableTrades.length / closedTrades.length) * 100
        : 0;

    // Top 5 best and worst trades by realized P/L
    const tradesWithPL = closedTrades.filter((t) => {
      const pl = parseNumeric(t.realized_pl);
      return !isNaN(pl) && pl !== 0;
    });

    const bestTrades = [...tradesWithPL]
      .sort((a, b) => parseNumeric(b.realized_pl) - parseNumeric(a.realized_pl))
      .slice(0, 5);

    const worstTrades = [...tradesWithPL]
      .sort((a, b) => parseNumeric(a.realized_pl) - parseNumeric(b.realized_pl))
      .slice(0, 5);

    // MTM P/L statistics
    const totalMTMPL = transactions.reduce((sum, t) => {
      return sum + parseNumeric(t.mtm_pl);
    }, 0);

    // Proceeds statistics
    const totalProceeds = closedTrades.reduce((sum, t) => {
      return sum + Math.abs(parseNumeric(t.total_value || t.proceeds));
    }, 0);

    const totalBasis = closedTrades.reduce((sum, t) => {
      return sum + Math.abs(parseNumeric(t.basis));
    }, 0);

    return {
      totalRealizedPL,
      totalProfit,
      totalLoss,
      profitableCount: profitableTrades.length,
      losingCount: losingTrades.length,
      totalCommission,
      totalVolume,
      avgTradeSize,
      winRate,
      bestTrades,
      worstTrades,
      totalMTMPL,
      totalProceeds,
      totalBasis,
      closedCount: closedTrades.length,
      openCount: openTrades.length,
    };
  }, [transactions]);

  const totalOpened = transactions
    .filter((t) => t.transaction_type?.toUpperCase() === "BUY")
    .reduce(
      (sum, t) =>
        sum + (t.quantity || 0) * (t.price || t.trade_price || 0) + (t.commission || 0),
      0
    );

  const totalClosed = transactions
    .filter((t) => t.transaction_type?.toUpperCase() === "SELL")
    .reduce(
      (sum, t) =>
        sum + (t.quantity || 0) * (t.price || t.trade_price || 0) - (t.commission || 0),
      0
    );

  // Monthly activity data for chart
  const monthlyData = useMemo(() => {
    const map: Record<
      string,
      { month: string; opened: number; closed: number }
    > = {};

    transactions.forEach((t) => {
      if (!t.transaction_date) return;

      const date = new Date(t.transaction_date);
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

      const value = (t.quantity || 0) * (t.price || t.trade_price || 0);

      if (t.transaction_type?.toUpperCase() === "BUY") {
        map[monthKey].opened += value;
      } else if (t.transaction_type?.toUpperCase() === "SELL") {
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
          <h2 className="text-xl font-semibold text-gray-100">
            World Stock Transactions
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="bg-surface-dark-secondary p-4 rounded-xl border border-white/10"
            >
              <div className="h-4 bg-white/10 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-1/2"></div>
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
          <h2 className="text-xl font-semibold text-gray-100">
            World Stock Transactions
          </h2>
        </div>
        <div className="bg-loss/10 border border-loss/20 rounded-xl p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-loss mb-4" />
          <h3 className="text-lg font-medium text-loss mb-2">
            Error Loading Transactions
          </h3>
          <p className="text-loss">{error}</p>
          <button
            onClick={fetchTransactions}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-loss/80 transition-colors"
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
          <h2 className="text-xl font-semibold text-gray-100">
            World Stock Transactions
          </h2>
        </div>
        <div className="bg-surface-dark border border-white/10 rounded-xl p-12 text-center">
          <ArrowRight className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">
            No Transactions Found
          </h3>
          <p className="text-gray-400 mb-4">
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
        <h2 className="text-xl font-semibold text-gray-100">
          World Stock Transactions
        </h2>
        <button
          onClick={fetchTransactions}
          className="px-4 py-2 bg-surface-dark text-gray-300 rounded-xl hover:bg-white/10 transition-colors text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Realized P/L */}
        <div
          className={`p-6 rounded-xl ${
            metrics.totalRealizedPL >= 0
              ? "bg-gradient-to-r from-green-500 to-green-600"
              : "bg-gradient-to-r from-red-500 to-red-600"
          } text-white`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Total Realized P/L</p>
              <p className="text-3xl font-bold">
                {formatCurrency(metrics.totalRealizedPL)}
              </p>
              <p className="text-xs opacity-70 mt-1">
                {metrics.closedCount} closed trades
              </p>
            </div>
            <DollarSign className="h-12 w-12 opacity-60" />
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Win Rate</p>
              <p className="text-3xl font-bold">
                {metrics.winRate.toFixed(1)}%
              </p>
              <p className="text-xs opacity-70 mt-1">
                {metrics.profitableCount}W / {metrics.losingCount}L
              </p>
            </div>
            <TrendingUp className="h-12 w-12 opacity-60" />
          </div>
        </div>

        {/* Total Commission */}
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Total Commissions</p>
              <p className="text-3xl font-bold">
                {formatCurrency(metrics.totalCommission)}
              </p>
              <p className="text-xs opacity-70 mt-1">
                {transactions.length} transactions
              </p>
            </div>
            <Banknote className="h-12 w-12 opacity-60" />
          </div>
        </div>

        {/* Total Volume */}
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-80">Total Volume</p>
              <p className="text-3xl font-bold">
                {formatCurrency(metrics.totalVolume)}
              </p>
              <p className="text-xs opacity-70 mt-1">
                Avg: {formatCurrency(metrics.avgTradeSize)}
              </p>
            </div>
            <Calendar className="h-12 w-12 opacity-60" />
          </div>
        </div>
      </div>

      {/* Additional Statistics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface-dark-secondary p-4 rounded-xl border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Profit</p>
              <p className="text-xl font-bold text-gain">
                {formatCurrency(metrics.totalProfit)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Trades</p>
              <p className="text-xl font-semibold text-gray-100">
                {metrics.profitableCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface-dark-secondary p-4 rounded-xl border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Loss</p>
              <p className="text-xl font-bold text-loss">
                {formatCurrency(metrics.totalLoss)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Trades</p>
              <p className="text-xl font-semibold text-gray-100">
                {metrics.losingCount}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface-dark-secondary p-4 rounded-xl border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">MTM P/L</p>
              <p
                className={`text-xl font-bold ${
                  metrics.totalMTMPL >= 0 ? "text-gain" : "text-loss"
                }`}
              >
                {formatCurrency(metrics.totalMTMPL)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Open Positions</p>
              <p className="text-xl font-semibold text-gray-100">
                {metrics.openCount}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Top 5 Best and Worst Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Trades */}
        <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center">
            <TrendingUp className="h-6 w-6 text-gain mr-2" />
            Top 5 Best Trades
          </h3>
          <div className="space-y-3">
            {metrics.bestTrades.length > 0 ? (
              metrics.bestTrades.map((trade, idx) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 bg-gain/10 rounded-xl border border-gain/10"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full text-sm font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-100">
                        {trade.symbol}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(trade.transaction_date)} •{" "}
                        {trade.transaction_time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gain">
                      {formatCurrency(trade.realized_pl)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {Math.abs(trade.quantity || 0)} shares
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">
                No closed trades yet
              </p>
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
            {metrics.worstTrades.length > 0 ? (
              metrics.worstTrades.map((trade, idx) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between p-3 bg-loss/10 rounded-xl border border-loss/10"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-red-600 text-white rounded-full text-sm font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-100">
                        {trade.symbol}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(trade.transaction_date)} •{" "}
                        {trade.transaction_time}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-loss">
                      {formatCurrency(trade.realized_pl)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {Math.abs(trade.quantity || 0)} shares
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-4">
                No closed trades yet
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Activity Chart */}
      {monthlyData.length > 0 && (
        <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Monthly Transaction Activity
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
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
      <div className="bg-surface-dark-secondary rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/5">
            <thead className="bg-surface-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Quantity
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Proceeds
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Comm
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Basis
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Realized P/L
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                  MTM P/L
                </th>
              </tr>
            </thead>
            <tbody className="bg-surface-dark-secondary divide-y divide-white/5">
              {transactions.map((transaction) => {
                // Helper to safely parse numbers
                const parseNum = (val: any): number => {
                  if (val === null || val === undefined) return 0;
                  const n =
                    typeof val === "string" ? parseFloat(val) : Number(val);
                  return isNaN(n) ? 0 : n;
                };

                const quantity = parseNum(transaction.quantity);
                const tradePrice = parseNum(transaction.price || transaction.trade_price);
                const realizedPL = parseNum(transaction.realized_pl);
                const mtmPL = parseNum(transaction.mtm_pl);
                const proceeds = parseNum(transaction.total_value || transaction.proceeds);
                const commission = parseNum(transaction.commission);
                const basis = parseNum(transaction.basis);

                return (
                  <tr key={transaction.id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                      <div>{formatDate(transaction.transaction_date)}</div>
                      {transaction.transaction_time && (
                        <div className="text-xs text-gray-400">
                          {transaction.transaction_time}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-100">
                        {transaction.symbol}
                      </div>
                      <div className="text-xs text-gray-400">
                        {transaction.ticker || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTransactionColor(
                          transaction.transaction_type || ""
                        )}`}
                      >
                        {getTransactionIcon(transaction.transaction_type || "")}
                        <span className="ml-1">
                          {getTransactionLabel(transaction.transaction_type || "")}
                        </span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-100">
                      {formatNumber(Math.abs(quantity))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-100">
                      {formatCurrency(tradePrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-100">
                      {formatCurrency(proceeds)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-400">
                      {formatCurrency(Math.abs(commission))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-100">
                      {formatCurrency(Math.abs(basis))}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-right text-sm font-semibold ${
                        realizedPL > 0
                          ? "text-gain"
                          : realizedPL < 0
                          ? "text-loss"
                          : "text-gray-100"
                      }`}
                    >
                      {formatCurrency(realizedPL)}
                    </td>
                    <td
                      className={`px-6 py-4 whitespace-nowrap text-right text-sm ${
                        mtmPL > 0
                          ? "text-gain"
                          : mtmPL < 0
                          ? "text-loss"
                          : "text-gray-400"
                      }`}
                    >
                      {formatCurrency(mtmPL)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-surface-dark border-t-2 border-white/10">
              <tr>
                <td
                  colSpan={7}
                  className="px-6 py-4 text-right text-sm font-semibold text-gray-300"
                >
                  Totals:
                </td>
                <td className="px-6 py-4 text-right text-sm font-bold text-gray-100">
                  {formatCurrency(Math.abs(metrics.totalBasis))}
                </td>
                <td
                  className={`px-6 py-4 text-right text-sm font-bold ${
                    metrics.totalRealizedPL >= 0
                      ? "text-gain"
                      : "text-loss"
                  }`}
                >
                  {formatCurrency(metrics.totalRealizedPL)}
                </td>
                <td
                  className={`px-6 py-4 text-right text-sm font-bold ${
                    metrics.totalMTMPL >= 0 ? "text-gain" : "text-loss"
                  }`}
                >
                  {formatCurrency(metrics.totalMTMPL)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
