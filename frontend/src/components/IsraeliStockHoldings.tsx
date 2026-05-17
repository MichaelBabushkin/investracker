"use client";

import React, { useState, useEffect } from "react";
import {
  Building2,
  AlertTriangle,
  Table2,
  PieChart as PieChartLucide,
} from "lucide-react";
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
import { useConfirmDialog } from "@/components/ConfirmDialog";
import Link from "next/link";

interface IsraeliStockHoldingsProps {
  refreshTrigger?: number;
}

export default function IsraeliStockHoldings({
  refreshTrigger,
}: IsraeliStockHoldingsProps) {
  const [holdings, setHoldings] = useState<IsraeliStockHolding[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  const fetchHoldings = async () => {
    try {
      setLoading(true);
      setError(null);
      const [holdingsData, transactionsData] = await Promise.all([
        israeliStocksAPI.getHoldings(),
        israeliStocksAPI.getTransactions()
      ]);
      setHoldings(holdingsData);
      setTransactions(transactionsData);
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
    const ok = await confirm({ title: "Delete holding?", message: "This holding will be permanently removed. This cannot be undone.", confirmLabel: "Delete", variant: "danger" });
    if (!ok) return;

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

  // Calculate cash flow from transactions
  const totalDeposits = transactions
    .filter((t) => (t.transaction_type || "").toUpperCase() === "DEPOSIT")
    .reduce((sum, t) => sum + (t.total_value || 0), 0);

  const totalWithdrawals = transactions
    .filter((t) => (t.transaction_type || "").toUpperCase() === "WITHDRAWAL")
    .reduce((sum, t) => sum + (t.total_value || 0), 0);

  const totalBought = transactions
    .filter((t) => (t.transaction_type || "").toUpperCase() === "BUY")
    .reduce((sum, t) => sum + (t.total_value || 0), 0);

  const totalSold = transactions
    .filter((t) => (t.transaction_type || "").toUpperCase() === "SELL")
    .reduce((sum, t) => sum + (t.total_value || 0), 0);

  const totalCommission = transactions.reduce((sum, t) => {
    const commission = t.commission;
    return sum + (commission ? Number(commission) : 0);
  }, 0);

  const totalFxConversion = transactions
    .filter((t) => (t.transaction_type || "").toUpperCase() === "FX_CONVERSION")
    .reduce((sum, t) => sum + (t.total_value || 0), 0);

  const netCashFlow = totalDeposits - totalWithdrawals;
  const availableCash = totalDeposits - totalWithdrawals - totalBought + totalSold - totalCommission - totalFxConversion;
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
          <h2 className="text-xl font-semibold text-gray-100">
            Israeli Stock Holdings
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-surface-dark-secondary p-6 rounded-xl border border-white/10"
            >
              <div className="h-4 bg-white/10 rounded w-1/4 mb-2"></div>
              <div className="h-3 bg-white/10 rounded w-1/2 mb-4"></div>
              <div className="grid grid-cols-4 gap-4">
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="h-3 bg-white/10 rounded"></div>
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
          <h2 className="text-xl font-semibold text-gray-100">
            Israeli Stock Holdings
          </h2>
        </div>
        <div className="bg-loss/10 border border-loss/20 rounded-xl p-6 text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-loss mb-4" />
          <h3 className="text-lg font-medium text-loss mb-2">
            Error Loading Holdings
          </h3>
          <p className="text-loss">{error}</p>
          <button
            onClick={fetchHoldings}
            className="mt-4 bg-red-600 text-white px-4 py-2 rounded-xl hover:bg-loss/80 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-100">
          Israeli Stock Holdings
        </h2>
        <div className="flex items-center space-x-3">
          {holdings.length > 0 && (
            <div className="flex items-center bg-surface-dark rounded-xl p-1">
              <button
                onClick={() => setViewMode("table")}
                className={`flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "table"
                    ? "bg-surface-dark-secondary text-gray-100"
                    : "text-gray-400 hover:text-gray-100"
                }`}
              >
                <Table2 className="h-4 w-4 mr-1" />
                Table
              </button>
              <button
                onClick={() => setViewMode("chart")}
                className={`flex items-center px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "chart"
                    ? "bg-surface-dark-secondary text-gray-100"
                    : "text-gray-400 hover:text-gray-100"
                }`}
              >
                <PieChartLucide className="h-4 w-4 mr-1" />
                Chart
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Portfolio Summary — Variant D: Bloomberg-style consolidated panel */}
      {(holdings.length > 0 || totalDeposits > 0 || availableCash !== 0) && (
        <div className="bg-surface-dark-secondary border border-white/[0.06] rounded-xl overflow-hidden">
          {/* Top section */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-[1.3fr_1px_1fr] gap-6">
            {/* Hero: Current Value */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-2">
                Current Value · Israeli Stocks
              </p>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-heading font-bold text-4xl tracking-tight tabular-nums text-gray-50 leading-none">
                  {formatCurrency(totalValue)}
                </span>
                <span
                  className={`font-heading text-xs font-semibold tabular-nums px-2 py-1 rounded-md ${
                    totalReturnPercentage > 0
                      ? "bg-green-500/10 text-gain"
                      : totalReturnPercentage < 0
                      ? "bg-rose-500/10 text-loss"
                      : "bg-white/[0.06] text-gray-400"
                  }`}
                >
                  {totalReturnPercentage >= 0 ? "+" : ""}
                  {totalReturnPercentage.toFixed(2)}%
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                {holdings.length} position{holdings.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Vertical divider */}
            <div className="hidden md:block bg-white/[0.05]" />

            {/* Right ledger */}
            <div className="flex flex-col gap-3 justify-center">
              {[
                ["Cost basis", formatCurrency(totalCost), null],
                ["Total return", formatCurrency(totalReturn), totalReturn > 0 ? "up" : totalReturn < 0 ? "down" : null],
                ["Return %", formatPercentage(totalReturnPercentage), totalReturnPercentage > 0 ? "up" : totalReturnPercentage < 0 ? "down" : null],
              ].map(([label, value, tone]) => (
                <div key={label as string} className="flex justify-between items-baseline">
                  <span className="text-[11px] text-gray-400">{label}</span>
                  <span
                    className={`font-heading font-semibold text-sm tabular-nums tracking-tight ${
                      tone === "up" ? "text-gain" : tone === "down" ? "text-loss" : "text-gray-100"
                    }`}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom strip */}
          {(totalDeposits > 0 || availableCash !== 0) && (
            <div className="border-t border-white/[0.05] bg-white/[0.015] grid grid-cols-3 px-6 py-4 gap-4">
              {[
                { label: "Net Cash Flow", value: formatCurrency(netCashFlow), sub: "Invested capital", tone: null },
                { label: "Available Cash", value: formatCurrency(availableCash), sub: "Ready to invest", tone: availableCash < 0 ? "warn" : null },
                { label: "Holdings", value: String(holdings.length), sub: "Positions", tone: null },
              ].map(({ label, value, sub, tone }) => (
                <div key={label} className={`${label !== "Net Cash Flow" ? "pl-4 border-l border-white/[0.04]" : ""}`}>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1">{label}</p>
                  <p
                    className={`font-heading font-bold text-lg tabular-nums tracking-tight leading-none ${
                      tone === "warn" ? "text-warn" : "text-gray-100"
                    }`}
                  >
                    {value}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-1">{sub}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Content Area */}
      {!Array.isArray(holdings) || holdings.length === 0 ? (
        <div className="text-center py-12 bg-surface-dark rounded-xl">
          <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">
            No Holdings Found
          </h3>
          <p className="text-gray-400">
            Upload a PDF report to import your Israeli stock holdings.
          </p>
        </div>
      ) : (
        <>
          {viewMode === "table" ? (
            /* Holdings Table */
            <div className="bg-surface-dark-secondary rounded-xl border border-white/10 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/5">
                  <thead className="bg-surface-dark">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Quantity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Current Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Purchase Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Return
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Portfolio %
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Last Price
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-surface-dark-secondary divide-y divide-white/5">
                    {holdings.map((holding) => {
                      const returnData = calculateReturn(
                        holding.current_value,
                        holding.purchase_cost
                      );
                      return (
                        <tr key={holding.id} className="hover:bg-white/5">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Link href={`/stock/il/${holding.symbol}`} className="flex items-center group">
                              <StockLogo
                                symbol={holding.symbol}
                                logoSvg={holding.logo_svg}
                                size="sm"
                                className="flex-shrink-0 mr-3 group-hover:opacity-80 transition-opacity"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-100 group-hover:text-brand-400 transition-colors">
                                  {holding.symbol}
                                </div>
                                <div className="text-sm text-gray-400 max-w-xs truncate group-hover:text-brand-400/70 transition-colors">
                                  {holding.company_name}
                                </div>
                              </div>
                            </Link>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                            {formatNumber(holding.quantity)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">
                            {formatCurrency(holding.current_value)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                            {formatCurrency(holding.purchase_cost)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div
                              className={`font-medium ${
                                returnData.amount >= 0
                                  ? "text-gain"
                                  : "text-loss"
                              }`}
                            >
                              {formatCurrency(returnData.amount)}
                            </div>
                            <div
                              className={`text-xs ${
                                returnData.percentage >= 0
                                  ? "text-gain"
                                  : "text-loss"
                              }`}
                            >
                              {formatPercentage(returnData.percentage)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                            {holding.portfolio_percentage
                              ? `${holding.portfolio_percentage.toFixed(2)}%`
                              : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-100">
                            {formatCurrency(holding.last_price)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                            <button
                              onClick={() => handleDeleteHolding(holding.id)}
                              className="text-loss hover:text-loss text-sm font-medium"
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
              <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">
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
              <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-semibold text-gray-100 mb-4">
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
                        className="flex items-center justify-between p-3 bg-surface-dark rounded-xl"
                      >
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />
                          <div>
                            <p className="font-medium text-gray-100">
                              {item.name}
                            </p>
                            <p className="text-sm text-gray-400">
                              {holding?.company_name}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-100">
                            {formatCurrency(item.value)}
                          </p>
                          <p
                            className={`text-sm ${
                              returnData.percentage >= 0
                                ? "text-gain"
                                : "text-loss"
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
      {ConfirmDialogElement}
    </div>
  );
}
