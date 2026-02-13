"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  BuildingOfficeIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  TableCellsIcon,
  ChartPieIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { worldStocksAPI } from "@/services/api";
import { WorldStockHolding } from "@/types/world-stocks";

interface WorldStockHoldingsProps {
  refreshTrigger?: number;
  accountId?: number;
}

export default function WorldStockHoldings({
  refreshTrigger,
  accountId,
}: WorldStockHoldingsProps) {
  const [holdings, setHoldings] = useState<WorldStockHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");

  const fetchHoldings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await worldStocksAPI.getHoldings(accountId);
      setHoldings(data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || "Failed to load holdings"
      );
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    fetchHoldings();
  }, [fetchHoldings, refreshTrigger]);

  const handleDeleteHolding = async (holdingId: number) => {
    if (!confirm("Are you sure you want to delete this holding?")) return;

    try {
      await worldStocksAPI.deleteHolding(holdingId);
      setHoldings((prev) => prev.filter((h) => h.id !== holdingId));
    } catch (err: any) {
      alert(
        "Failed to delete holding: " +
          (err.response?.data?.detail || err.message)
      );
    }
  };

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

  // Calculate metrics
  const totalValue = Array.isArray(holdings)
    ? holdings.reduce((sum, holding) => sum + (holding.current_value || 0), 0)
    : 0;
  const totalUnrealizedPL = Array.isArray(holdings)
    ? holdings.reduce((sum, holding) => sum + (holding.unrealized_gain || 0), 0)
    : 0;
  const totalUnrealizedPLPercent =
    totalValue > 0
      ? (totalUnrealizedPL / (totalValue - totalUnrealizedPL)) * 100
      : 0;

  // Prepare pie chart data
  const pieChartData = Array.isArray(holdings)
    ? holdings
        .map((holding, index) => ({
          name: holding.symbol,
          value: holding.current_value || 0,
          color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`,
        }))
        .sort((a, b) => b.value - a.value)
    : [];

  const COLORS = [
    "#0088FE",
    "#00C49F",
    "#FFBB28",
    "#FF8042",
    "#8884D8",
    "#82CA9D",
    "#FFC658",
    "#FF7C7C",
    "#8DD1E1",
    "#D084D0",
    "#87D068",
    "#FFB347",
    "#FFD700",
    "#FF6B6B",
    "#4ECDC4",
  ];

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            World Stock Holdings
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-lg shadow-md border border-gray-200"
            >
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-3 bg-gray-200 rounded"></div>
                ))}
              </div>
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
            World Stock Holdings
          </h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">
            Error Loading Holdings
          </h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchHoldings}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!holdings || holdings.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            World Stock Holdings
          </h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <BuildingOfficeIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Holdings Found
          </h3>
          <p className="text-gray-600 mb-4">
            Upload a world stock broker statement PDF to see your holdings here.
          </p>
          <p className="text-sm text-gray-500">
            We support US and international stock portfolios.
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
          World Stock Holdings
        </h2>
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode("table")}
              className={`flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <TableCellsIcon className="h-4 w-4 mr-1" />
              Table
            </button>
            <button
              onClick={() => setViewMode("chart")}
              className={`flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === "chart"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <ChartPieIcon className="h-4 w-4 mr-1" />
              Chart
            </button>
          </div>

          <button
            onClick={fetchHoldings}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {Array.isArray(holdings) && holdings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Holdings</p>
                <p className="text-2xl font-bold">
                  {Array.isArray(holdings) ? holdings.length : 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <BanknotesIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Current Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalValue)}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`bg-gradient-to-r ${
              totalUnrealizedPL >= 0
                ? "from-green-500 to-green-600"
                : "from-red-500 to-red-600"
            } text-white p-6 rounded-lg shadow-md`}
          >
            <div className="flex items-center">
              {totalUnrealizedPL >= 0 ? (
                <ArrowUpIcon className="h-8 w-8 opacity-80" />
              ) : (
                <ArrowDownIcon className="h-8 w-8 opacity-80" />
              )}
              <div className="ml-3">
                <p className="text-sm opacity-80">Unrealized P/L</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalUnrealizedPL)}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`bg-gradient-to-r ${
              totalUnrealizedPLPercent >= 0
                ? "from-green-500 to-green-600"
                : "from-red-500 to-red-600"
            } text-white p-6 rounded-lg shadow-md`}
          >
            <div className="flex items-center">
              {totalUnrealizedPLPercent >= 0 ? (
                <ArrowUpIcon className="h-8 w-8 opacity-80" />
              ) : (
                <ArrowDownIcon className="h-8 w-8 opacity-80" />
              )}
              <div className="ml-3">
                <p className="text-sm opacity-80">Return %</p>
                <p className="text-2xl font-bold">
                  {totalUnrealizedPLPercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Purchase Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unrealized P/L
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Since
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-end space-x-1">
                      <span>TWR</span>
                      <div className="relative group">
                        <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-gray-400 rounded-full cursor-help hover:bg-gray-600">
                          ?
                        </span>
                        <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg z-50 whitespace-normal">
                          <div className="font-semibold mb-1">Time-Weighted Return (TWR)</div>
                          <div>Measures portfolio performance independent of cash flows. Best for comparing to benchmarks.</div>
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center justify-end space-x-1">
                      <span>MWR</span>
                      <div className="relative group">
                        <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-gray-400 rounded-full cursor-help hover:bg-gray-600">
                          ?
                        </span>
                        <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg shadow-lg z-50 whitespace-normal">
                          <div className="font-semibold mb-1">Money-Weighted Return (MWR/IRR)</div>
                          <div>Measures actual investor return accounting for timing and size of contributions.</div>
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {holdings.map((holding) => {
                  return (
                    <tr key={holding.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">
                          {holding.symbol}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatNumber(holding.quantity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                        {holding.quantity && holding.purchase_cost
                          ? formatCurrency(holding.purchase_cost / holding.quantity)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(holding.last_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {formatCurrency(holding.purchase_cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(holding.current_value)}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-right text-sm font-semibold ${
                          (holding.unrealized_gain || 0) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(holding.unrealized_gain)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-600" title="Position opened">
                        {holding.holding_date ? formatDate(holding.holding_date) : "-"}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                          (holding.twr || 0) >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                        title="Time-Weighted Return"
                      >
                        {holding.twr ? (
                          <>
                            {holding.twr >= 0 ? "+" : ""}
                            {Number(holding.twr).toFixed(2)}%
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                          (holding.mwr || 0) >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                        title="Money-Weighted Return (IRR)"
                      >
                        {holding.mwr ? (
                          <>
                            {holding.mwr >= 0 ? "+" : ""}
                            {Number(holding.mwr).toFixed(2)}%
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => handleDeleteHolding(holding.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Delete holding"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Chart View */}
      {viewMode === "chart" && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Portfolio Allocation
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e5e7eb",
                  borderRadius: "0.5rem",
                  padding: "0.75rem",
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
