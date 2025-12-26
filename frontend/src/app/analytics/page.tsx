"use client";

import { useState, useEffect } from "react";
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from "@heroicons/react/24/outline";
import ProtectedRoute from "@/components/ProtectedRoute";

interface AnalyticsData {
  totalValue: number;
  totalGain: number;
  gainPercentage: number;
  portfolioAllocation: { name: string; value: number; color: string }[];
  performanceHistory: { date: string; value: number }[];
  topPerformers: { name: string; gain: number; percentage: number }[];
  recentActivity: { type: string; stock: string; amount: number; date: string }[];
}

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d" | "1y" | "all">("30d");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalValue: 125430.50,
    totalGain: 12543.20,
    gainPercentage: 11.1,
    portfolioAllocation: [
      { name: "Israeli Stocks", value: 65000, color: "bg-blue-500" },
      { name: "US Stocks", value: 45000, color: "bg-green-500" },
      { name: "Bonds", value: 10000, color: "bg-yellow-500" },
      { name: "Cash", value: 5430, color: "bg-gray-500" },
    ],
    performanceHistory: [],
    topPerformers: [
      { name: "TEVA", gain: 5234, percentage: 18.5 },
      { name: "AAPL", gain: 3421, percentage: 15.2 },
      { name: "MSFT", gain: 2876, percentage: 12.8 },
    ],
    recentActivity: [
      { type: "BUY", stock: "HARL", amount: 1562.7, date: "2025-01-07" },
      { type: "DIVIDEND", stock: "TEVA", amount: 156.3, date: "2025-01-05" },
      { type: "SELL", stock: "INTC", amount: 2340.0, date: "2025-01-03" },
    ],
  });

  useEffect(() => {
    // Simulate loading analytics data
    setTimeout(() => setLoading(false), 500);
  }, [timeframe]);

  const formatCurrency = (value: number): string => {
    return `₪${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics</h1>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm sm:text-base text-gray-600 mt-2">
              Track your investment performance and insights
            </p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex gap-1 sm:gap-2 bg-white rounded-lg shadow p-1 w-full sm:w-auto overflow-x-auto">
            {[
              { value: "7d", label: "7D" },
              { value: "30d", label: "30D" },
              { value: "90d", label: "90D" },
              { value: "1y", label: "1Y" },
              { value: "all", label: "All" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTimeframe(option.value as typeof timeframe)}
                className={`flex-1 sm:flex-initial px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  timeframe === option.value
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Total Portfolio Value */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500">
                Total Portfolio Value
              </h3>
              <CurrencyDollarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900">
              {formatCurrency(analytics.totalValue)}
            </div>
          </div>

          {/* Total Gain/Loss */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500">
                Total Gain/Loss
              </h3>
              {analytics.totalGain >= 0 ? (
                <ArrowTrendingUpIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
              ) : (
                <ArrowTrendingDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
              )}
            </div>
            <div
              className={`text-2xl sm:text-3xl font-bold ${
                analytics.totalGain >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(analytics.totalGain)}
            </div>
            <div
              className={`text-sm mt-1 ${
                analytics.gainPercentage >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatPercentage(analytics.gainPercentage)}
            </div>
          </div>

          {/* Return Rate */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500">
                Return Rate ({timeframe.toUpperCase()})
              </h3>
              <ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-blue-600">
              {formatPercentage(analytics.gainPercentage)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              vs. previous period
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Portfolio Allocation */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Portfolio Allocation
            </h3>
            <div className="space-y-4">
              {analytics.portfolioAllocation.map((item) => {
                const percentage = (
                  (item.value / analytics.totalValue) *
                  100
                ).toFixed(1);
                return (
                  <div key={item.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-3 h-3 rounded-full ${item.color}`}
                        ></div>
                        <span className="text-sm font-medium text-gray-700">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-sm text-gray-900">
                        {formatCurrency(item.value)} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${item.color}`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
              Top Performers
            </h3>
            <div className="space-y-4">
              {analytics.topPerformers.map((stock, index) => (
                <div
                  key={stock.name}
                  className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs sm:text-sm font-semibold text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {stock.name}
                      </div>
                      <div className="text-sm text-green-600 flex items-center gap-1">
                        <ArrowUpIcon className="h-3 w-3" />
                        {formatPercentage(stock.percentage)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(stock.gain)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Performance Chart Placeholder */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6 sm:mb-8">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            Portfolio Performance
          </h3>
          <div className="h-48 sm:h-64 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg flex items-center justify-center">
            <div className="text-center px-4">
              <ChartBarIcon className="h-12 w-12 sm:h-16 sm:w-16 text-blue-300 mx-auto mb-3" />
              <p className="text-sm sm:text-base text-gray-600">
                Chart visualization coming soon
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Integration with Chart.js or Recharts
              </p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Stock
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {analytics.recentActivity.map((activity, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          activity.type === "BUY"
                            ? "bg-green-100 text-green-800"
                            : activity.type === "SELL"
                            ? "bg-red-100 text-red-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {activity.type}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {activity.stock}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(activity.amount)}
                    </td>
                    <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(activity.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Insights Section */}
        <div className="mt-6 sm:mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                <ArrowTrendingUpIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
                  Strong Performance
                </h4>
                <p className="text-xs sm:text-sm text-gray-700">
                  Your portfolio is outperforming the market by 3.2% this month.
                  Keep up the good work!
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <ChartBarIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-1">
                  Diversification Tip
                </h4>
                <p className="text-xs sm:text-sm text-gray-700">
                  Consider adding more international exposure to balance your
                  portfolio risk.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  );
}
