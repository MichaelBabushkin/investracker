"use client";

import React, { useState, useEffect } from "react";
import {
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
  BanknotesIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TableCellsIcon,
  ChartPieIcon,
} from "@heroicons/react/24/outline";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { israeliStocksAPI } from "@/services/api";
import { IsraeliStockHolding } from "@/types/israeli-stocks";
import StockLogo from "./StockLogo";

interface IsraeliStockHoldingsProps {
  refreshTrigger?: number;
}

export default function IsraeliStockHoldings({
  refreshTrigger,
}: IsraeliStockHoldingsProps) {
  const [holdings, setHoldings] = useState<IsraeliStockHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");

  const fetchHoldings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await israeliStocksAPI.getHoldings();
      setHoldings(data);
    } catch (err: any) {
      setError(
        err.response?.data?.detail || err.message || "Failed to load holdings"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHoldings();
  }, [refreshTrigger]);

  const handleDeleteHolding = async (holdingId: number) => {
    if (!confirm("Are you sure you want to delete this holding?")) return;

    try {
      await israeliStocksAPI.deleteHolding(holdingId);
      setHoldings((prev) => prev.filter((h) => h.id !== holdingId));
    } catch (err: any) {
      alert(
        "Failed to delete holding: " +
          (err.response?.data?.detail || err.message)
      );
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount && amount !== 0) return "₪0.00";
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (percentage?: number) => {
    if (!percentage && percentage !== 0) return "0.00%";
    const sign = percentage >= 0 ? "+" : "";
    return `${sign}${percentage.toFixed(2)}%`;
  };

  const formatNumber = (num?: number) => {
    if (!num) return "0";
    return new Intl.NumberFormat("he-IL").format(num);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("he-IL");
  };

  // Calculate metrics
  const totalValue = Array.isArray(holdings)
    ? holdings.reduce((sum, holding) => sum + (holding.current_value || 0), 0)
    : 0;
  const totalCost = Array.isArray(holdings)
    ? holdings.reduce((sum, holding) => sum + (holding.purchase_cost || 0), 0)
    : 0;
  const totalReturn = totalValue - totalCost;
  const totalReturnPercentage =
    totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

  // Helper function to calculate return for individual holdings
  const calculateReturn = (currentValue?: number, purchaseCost?: number) => {
    if (!currentValue || !purchaseCost) return { amount: 0, percentage: 0 };
    const returnAmount = currentValue - purchaseCost;
    const returnPercentage = (returnAmount / purchaseCost) * 100;
    return { amount: returnAmount, percentage: returnPercentage };
  };

  // Prepare pie chart data
  const pieChartData = Array.isArray(holdings)
    ? holdings
        .map((holding, index) => ({
          name: holding.symbol,
          value: holding.current_value || 0,
          percentage: holding.portfolio_percentage || 0,
          color: `hsl(${(index * 137.5) % 360}, 70%, 50%)`, // Generate distinct colors
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
            Israeli Stock Holdings
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
            Israeli Stock Holdings
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
            Israeli Stock Holdings
          </h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <BuildingOfficeIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Holdings Found
          </h3>
          <p className="text-gray-600 mb-4">
            Upload an Israeli investment PDF to see your stock holdings here.
          </p>
          <p className="text-sm text-gray-500">
            We support TA-125 and SME-60 stocks from Israeli brokers.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Israeli Stock Holdings
          </h2>
          <button onClick={fetchHoldings} className="btn-primary text-sm">
            Retry
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Israeli Stock Holdings
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

          <button onClick={fetchHoldings} className="btn-secondary text-sm">
            Refresh
          </button>
        </div>
      </div>

      {/* Summary */}
      {Array.isArray(holdings) && holdings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="metric-card">
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

          <div className="metric-card bg-gradient-to-r from-blue-500 to-blue-600">
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

          <div className="metric-card bg-gradient-to-r from-gray-500 to-gray-600">
            <div className="flex items-center">
              <BanknotesIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Cost</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalCost)}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`metric-card bg-gradient-to-r ${
              totalReturn >= 0
                ? "from-green-500 to-green-600"
                : "from-red-500 to-red-600"
            }`}
          >
            <div className="flex items-center">
              {totalReturn >= 0 ? (
                <ArrowUpIcon className="h-8 w-8 opacity-80" />
              ) : (
                <ArrowDownIcon className="h-8 w-8 opacity-80" />
              )}
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Return</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalReturn)}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`metric-card bg-gradient-to-r ${
              totalReturnPercentage >= 0
                ? "from-green-500 to-green-600"
                : "from-red-500 to-red-600"
            }`}
          >
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Return %</p>
                <p className="text-2xl font-bold">
                  {formatPercentage(totalReturnPercentage)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Area */}
      {!Array.isArray(holdings) || holdings.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Holdings Found
          </h3>
          <p className="text-gray-500">
            Upload a PDF report to import your Israeli stock holdings.
          </p>
        </div>
      ) : (
        <>
          {viewMode === "table" ? (
            /* Holdings Table */
            <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Purchase Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Return
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Portfolio %
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {holdings.map((holding) => {
                      const returnData = calculateReturn(
                        holding.current_value,
                        holding.purchase_cost
                      );
                      return (
                        <tr key={holding.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <StockLogo
                                symbol={holding.symbol}
                                logoSvg={holding.logo_svg}
                                size="sm"
                                className="flex-shrink-0 mr-3"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {holding.symbol}
                                </div>
                                <div className="text-sm text-gray-500 max-w-xs truncate">
                                  {holding.company_name}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatNumber(holding.quantity)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {formatCurrency(holding.current_value)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(holding.purchase_cost)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div
                              className={`font-medium ${
                                returnData.amount >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatCurrency(returnData.amount)}
                            </div>
                            <div
                              className={`text-xs ${
                                returnData.percentage >= 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {formatPercentage(returnData.percentage)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {holding.portfolio_percentage
                              ? `${holding.portfolio_percentage.toFixed(2)}%`
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatCurrency(
                              typeof holding.last_price === "number"
                                ? holding.last_price / 100
                                : holding.last_price
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => handleDeleteHolding(holding.id)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Portfolio Pie Chart */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pie Chart */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Portfolio Distribution
                </h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ percentage }) => `${percentage.toFixed(1)}%`}
                        outerRadius={80}
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
                        formatter={(value: number) => [
                          formatCurrency(value),
                          "Value",
                        ]}
                        labelFormatter={(label) => `${label}`}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Holdings Summary List */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Holdings Summary
                </h3>
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {pieChartData.map((item, index) => {
                    const holding = holdings.find(
                      (h) => h.symbol === item.name
                    );
                    const returnData = calculateReturn(
                      holding?.current_value,
                      holding?.purchase_cost
                    );
                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {holding?.company_name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {formatCurrency(item.value)}
                          </p>
                          <p
                            className={`text-sm ${
                              returnData.percentage >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatPercentage(returnData.percentage)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
