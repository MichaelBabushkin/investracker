"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  AlertTriangle,
  Table2,
  PieChart as PieChartLucide,
  Trash2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { worldStocksAPI, portfolioAPI } from "@/services/api";
import { WorldStockHolding } from "@/types/world-stocks";
import { useConfirmDialog } from "@/components/ConfirmDialog";
import StockLogo from "@/components/StockLogo";
import RsiBadge from "@/components/indicators/RsiBadge";
import Link from "next/link";

interface WorldStockHoldingsProps {
  refreshTrigger?: number;
  accountId?: number;
}

// Crypto ETFs are shown as their own section, separate from equities
const CRYPTO_TICKERS = new Set(["ETHA", "IBIT"]);

type DisplayRow =
  | { kind: "header"; label: string; icon: string; count: number; value: number; pl: number }
  | { kind: "holding"; holding: WorldStockHolding };

export default function WorldStockHoldings({
  refreshTrigger,
  accountId,
}: WorldStockHoldingsProps) {
  const [holdings, setHoldings] = useState<WorldStockHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rsiMap, setRsiMap] = useState<Record<string, number | null>>({});

  useEffect(() => {
    let cancelled = false;
    portfolioAPI
      .getHoldingsRsi()
      .then((r) => !cancelled && setRsiMap(r.world))
      .catch(() => { /* badges are optional decoration */ });
    return () => { cancelled = true; };
  }, [refreshTrigger]);
  const [viewMode, setViewMode] = useState<"table" | "chart">("table");
  const [summaryData, setSummaryData] = useState<{
    total_realized_pl: number;
    total_cash: number;
    total_unrealized_pl: number;
    total_unrealized_pl_pct: number;
    total_cost: number;
    total_invested: number;
    total_tax_withheld_ils: number;
  } | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  const fetchHoldings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [data, summary] = await Promise.all([
        worldStocksAPI.getHoldings(accountId),
        worldStocksAPI.getSummary(accountId),
      ]);
      setHoldings(data);
      setSummaryData(summary);
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
    const ok = await confirm({ title: "Delete holding?", message: "This holding will be permanently removed. This cannot be undone.", confirmLabel: "Delete", variant: "danger" });
    if (!ok) return;

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
    const date = new Date(dateStr);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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
  
  // Use summary data from API for realized P/L and cash
  const totalRealizedPL = summaryData?.total_realized_pl || 0;
  const totalCash = summaryData?.total_cash || 0;

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
          <h2 className="text-xl font-semibold text-gray-100">
            World Stock Holdings
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
            World Stock Holdings
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

  if (!holdings || holdings.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-100">
            World Stock Holdings
          </h2>
        </div>
        <div className="bg-surface-dark border border-white/10 rounded-xl p-12 text-center">
          <Building2 className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-100 mb-2">
            No Holdings Found
          </h3>
          <p className="text-gray-400 mb-4">
            Upload a world stock broker statement PDF to see your holdings here.
          </p>
          <p className="text-sm text-gray-400">
            We support US and international stock portfolios.
          </p>
        </div>
      </div>
    );
  }

  // Split equities from crypto ETFs; section headers carry subtotals
  const stockHoldings = holdings.filter((h) => !CRYPTO_TICKERS.has(h.symbol));
  const cryptoHoldings = holdings.filter((h) => CRYPTO_TICKERS.has(h.symbol));

  const subtotal = (hs: WorldStockHolding[]) => ({
    value: hs.reduce((s, h) => s + (h.current_value ?? 0), 0),
    pl: hs.reduce((s, h) => s + (h.unrealized_gain ?? 0), 0),
  });

  const displayRows: DisplayRow[] = [];
  if (stockHoldings.length > 0 && cryptoHoldings.length > 0) {
    displayRows.push({
      kind: "header", label: "International Stocks", icon: "🌍",
      count: stockHoldings.length, ...subtotal(stockHoldings),
    });
  }
  for (const h of stockHoldings) displayRows.push({ kind: "holding", holding: h });
  if (cryptoHoldings.length > 0) {
    displayRows.push({
      kind: "header", label: "Crypto", icon: "₿",
      count: cryptoHoldings.length, ...subtotal(cryptoHoldings),
    });
    for (const h of cryptoHoldings) displayRows.push({ kind: "holding", holding: h });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-100">
          World Stock Holdings
        </h2>
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
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

        </div>
      </div>

      {/* Portfolio Summary — Variant D: Bloomberg-style consolidated panel */}
      {Array.isArray(holdings) && holdings.length > 0 && (
        <div className="bg-surface-dark-secondary border border-white/[0.06] rounded-xl overflow-hidden">
          {/* Top section */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-[1.3fr_1px_1fr] gap-6">
            {/* Hero: Total Portfolio */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-2">
                Total Portfolio · World Stocks
              </p>
              <div className="flex items-baseline gap-3 mb-2">
                <span className="font-heading font-bold text-4xl tracking-tight tabular-nums text-gray-50 leading-none">
                  {formatCurrency(totalValue + totalCash)}
                </span>
                <span
                  className={`font-heading text-xs font-semibold tabular-nums px-2 py-1 rounded-md ${
                    totalUnrealizedPLPercent > 0
                      ? "bg-green-500/10 text-gain"
                      : totalUnrealizedPLPercent < 0
                      ? "bg-rose-500/10 text-loss"
                      : "bg-white/[0.06] text-gray-400"
                  }`}
                >
                  {totalUnrealizedPLPercent >= 0 ? "+" : ""}
                  {totalUnrealizedPLPercent.toFixed(2)}%
                </span>
              </div>
              <p className="text-[11px] text-gray-500">
                Holdings {formatCurrency(totalValue)} · Cash {formatCurrency(totalCash)}
              </p>
            </div>

            {/* Vertical divider */}
            <div className="hidden md:block bg-white/[0.05]" />

            {/* Right ledger */}
            <div className="flex flex-col gap-3 justify-center">
              {[
                ["Unrealized P/L", formatCurrency(totalUnrealizedPL), totalUnrealizedPL > 0 ? "up" : totalUnrealizedPL < 0 ? "down" : null],
                ["Realized P/L", formatCurrency(totalRealizedPL), totalRealizedPL > 0 ? "up" : totalRealizedPL < 0 ? "down" : null],
                ["Return %", `${totalUnrealizedPLPercent >= 0 ? "+" : ""}${totalUnrealizedPLPercent.toFixed(2)}%`, totalUnrealizedPLPercent > 0 ? "up" : totalUnrealizedPLPercent < 0 ? "down" : null],
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
          <div className="border-t border-white/[0.05] bg-white/[0.015] px-6 py-4">
            <div className={`grid gap-4 ${(summaryData?.total_tax_withheld_ils ?? 0) > 0 ? "grid-cols-4" : "grid-cols-3"}`}>
              {[
                { label: "Holdings", value: String(holdings.length), sub: "Positions", tone: null },
                { label: "Cash", value: formatCurrency(totalCash), sub: "Available", tone: null },
                ...(((summaryData?.total_tax_withheld_ils ?? 0) > 0)
                  ? [{ label: "Tax Withheld", value: `₪${(summaryData?.total_tax_withheld_ils || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, sub: "Capital gains", tone: "warn" as const }]
                  : []),
                { label: "Total Holdings", value: formatCurrency(totalValue), sub: "Market value", tone: null },
              ].map(({ label, value, sub, tone }, i) => (
                <div key={label} className={i > 0 ? "pl-4 border-l border-white/[0.04]" : ""}>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mb-1">{label}</p>
                  <p className={`font-heading font-bold text-lg tabular-nums tracking-tight leading-none ${tone === "warn" ? "text-warn" : "text-gray-100"}`}>
                    {value}
                  </p>
                  <p className="text-[10px] text-gray-600 mt-1">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="bg-surface-dark-secondary rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5">
              <thead className="bg-surface-dark">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Symbol
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Purchase Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Current Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Purchase Cost
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Current Value
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Unrealized P/L
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Since
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center justify-end space-x-1">
                      <span>TWR</span>
                      <div className="relative group">
                        <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-gray-400 rounded-full cursor-help hover:bg-gray-600">
                          ?
                        </span>
                        <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-xl shadow-lg z-50 whitespace-normal">
                          <div className="font-semibold mb-1">Time-Weighted Return (TWR)</div>
                          <div>Measures portfolio performance independent of cash flows. Best for comparing to benchmarks.</div>
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center justify-end space-x-1">
                      <span>MWR</span>
                      <div className="relative group">
                        <span className="inline-flex items-center justify-center w-4 h-4 text-xs font-bold text-white bg-gray-400 rounded-full cursor-help hover:bg-gray-600">
                          ?
                        </span>
                        <div className="hidden group-hover:block absolute right-0 top-full mt-2 w-64 px-3 py-2 text-xs text-white bg-gray-900 rounded-xl shadow-lg z-50 whitespace-normal">
                          <div className="font-semibold mb-1">Money-Weighted Return (MWR/IRR)</div>
                          <div>Measures actual investor return accounting for timing and size of contributions.</div>
                        </div>
                      </div>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-surface-dark-secondary divide-y divide-white/5">
                {displayRows.map((row, ri) => {
                  if (row.kind === "header") {
                    const plPos = row.pl >= 0;
                    return (
                      <tr key={`sec-${ri}`} className="bg-surface-dark/80">
                        <td colSpan={6} className="px-6 py-2.5">
                          <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                            {row.icon} {row.label}
                            <span className="ml-2 font-normal text-gray-500 normal-case">
                              {row.count} {row.count === 1 ? "position" : "positions"} · {formatCurrency(row.value)}
                            </span>
                          </span>
                        </td>
                        <td className="px-6 py-2.5 text-right">
                          <span className={`text-xs font-semibold tabular-nums ${plPos ? "text-gain" : "text-loss"}`}>
                            {plPos ? "+" : ""}{formatCurrency(row.pl)}
                          </span>
                        </td>
                        <td colSpan={4} />
                      </tr>
                    );
                  }
                  const holding = row.holding;
                  return (
                    <tr key={holding.id} className="hover:bg-white/5">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/stock/${holding.symbol}`} className="flex items-center group">
                          <StockLogo
                            symbol={holding.symbol}
                            logoUrl={holding.logo_url}
                            size="sm"
                            className="flex-shrink-0 mr-3 group-hover:opacity-80 transition-opacity"
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-100 group-hover:text-brand-400 transition-colors flex items-center gap-1.5">
                              {holding.symbol}
                              <RsiBadge rsi={rsiMap[holding.symbol]} />
                            </div>
                            <div className="text-sm text-gray-400 max-w-xs truncate group-hover:text-brand-400/70 transition-colors">
                              {holding.company_name}
                            </div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-100">
                        {formatNumber(holding.quantity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-400">
                        {holding.quantity && holding.purchase_cost
                          ? formatCurrency(holding.purchase_cost / holding.quantity)
                          : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-100">
                        {formatCurrency(holding.last_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-100">
                        {formatCurrency(holding.purchase_cost)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-gray-100">
                        {formatCurrency(holding.current_value)}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-right text-sm font-semibold ${
                          (holding.unrealized_gain || 0) >= 0
                            ? "text-gain"
                            : "text-loss"
                        }`}
                      >
                        {formatCurrency(holding.unrealized_gain)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-400" title="Position opened">
                        {holding.holding_date ? formatDate(holding.holding_date) : "-"}
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                          (holding.twr || 0) >= 0 ? "text-gain" : "text-loss"
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
                          (holding.mwr || 0) >= 0 ? "text-gain" : "text-loss"
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
                          className="text-loss hover:text-loss transition-colors"
                          title="Delete holding"
                        >
                          <Trash2 className="h-5 w-5" />
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
        <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
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
      {ConfirmDialogElement}
    </div>
  );
}
