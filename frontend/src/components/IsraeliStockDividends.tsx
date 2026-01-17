"use client";

import React, { useState, useEffect } from "react";
import {
  CurrencyDollarIcon,
  CalendarIcon,
  BanknotesIcon,
  ChartBarIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";
import { israeliStocksAPI } from "@/services/api";
import { IsraeliDividend } from "@/types/israeli-stocks";
import StockLogo from "./StockLogo";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface IsraeliStockDividendsProps {
  refreshTrigger?: number;
}

export default function IsraeliStockDividends({
  refreshTrigger,
}: IsraeliStockDividendsProps) {
  const [dividends, setDividends] = useState<IsraeliDividend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const fetchDividends = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await israeliStocksAPI.getDividends();
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
  }, [refreshTrigger]);

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null || isNaN(amount)) return "₪0.00";
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("he-IL");
  };

  const totalDividends = (dividends || []).reduce(
    (sum, dividend) => sum + dividend.amount,
    0
  );
  const totalTax = (dividends || []).reduce(
    (sum, dividend) => sum + (dividend.tax || 0),
    0
  );
  const netDividends = totalDividends - totalTax;

  // Group dividends by company
  const dividendsByCompany = (dividends || []).reduce((acc, dividend) => {
    const key = dividend.symbol;
    if (!acc[key]) {
      acc[key] = {
        company_name: dividend.company_name,
        symbol: dividend.symbol,
        logo_svg: dividend.logo_svg,
        total_amount: 0,
        total_tax: 0,
        count: 0,
        dividends: [],
      };
    }
    // capture logo if not already set
    if (!acc[key].logo_svg && dividend.logo_svg) {
      acc[key].logo_svg = dividend.logo_svg;
    }
    acc[key].total_amount += dividend.amount;
    acc[key].total_tax += dividend.tax || 0;
    acc[key].count += 1;
    acc[key].dividends.push(dividend);
    return acc;
  }, {} as Record<string, any>);

  const toggleCompany = (symbol: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setExpanded((prev) => ({ ...prev, [symbol]: !prev[symbol] }));
  };

  // Build monthly data for chart (last 12 months, net amounts)
  const monthlyData = (() => {
    // Build map keyed by numeric month string YYYY-MM to ensure consistency across charts
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
      // Use numeric label (YYYY-MM) instead of locale month name for unified formatting with transactions chart
      const label = key;
      if (!map.has(key)) {
        map.set(key, { key, label, gross: 0, tax: 0, net: 0 });
      }
      const item = map.get(key)!;
      const gross = d.amount || 0;
      const tax = d.tax || 0;
      item.gross += gross;
      item.tax += tax;
      item.net += gross - tax;
    }
    const sorted = Array.from(map.values()).sort((a, b) =>
      a.key.localeCompare(b.key)
    );
    // Show last 12 months for readability
    const last12 = sorted.slice(-12);
    return last12;
  })();

  const currencyTick = (value: any) =>
    new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency: "ILS",
      maximumFractionDigits: 0,
    }).format(Number(value) || 0);
  const tooltipFormatter = (value: any) => formatCurrency(Number(value) || 0);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Israeli Stock Dividends
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
              <div className="grid grid-cols-3 gap-4">
                {[...Array(3)].map((_, j) => (
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
            Israeli Stock Dividends
          </h2>
          <button onClick={fetchDividends} className="btn-primary text-sm">
            Retry
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!dividends || dividends.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Israeli Stock Dividends
          </h2>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <BanknotesIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Dividends Found
          </h3>
          <p className="text-gray-600 mb-4">
            Upload an Israeli investment PDF with dividend transactions to see
            them here.
          </p>
          <p className="text-sm text-gray-500">
            Dividends are automatically extracted from transaction data.
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
          Israeli Stock Dividends
        </h2>
        <button onClick={fetchDividends} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      {/* Summary */}
      {dividends.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="metric-card bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Gross Dividends</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(totalDividends)}
                </p>
              </div>
            </div>
          </div>

          <div className="metric-card bg-gradient-to-r from-red-500 to-red-600">
            <div className="flex items-center">
              <BanknotesIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Tax</p>
                <p className="text-2xl font-bold">{formatCurrency(totalTax)}</p>
              </div>
            </div>
          </div>

          <div className="metric-card bg-gradient-to-r from-green-500 to-green-600">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Net Dividends</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(netDividends)}
                </p>
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-center">
              <CalendarIcon className="h-8 w-8 opacity-80" />
              <div className="ml-3">
                <p className="text-sm opacity-80">Total Payments</p>
                <p className="text-2xl font-bold">{dividends.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Dividend Income (Net) */}
      {monthlyData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-gray-900">
              Monthly Dividend Income (Net)
            </h3>
            <span className="text-xs text-gray-500">
              Last {monthlyData.length} months
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={currencyTick} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={tooltipFormatter}
                  labelClassName="text-xs"
                />
                <Bar dataKey="net" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Dividends List */}
      {dividends.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CurrencyDollarIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Dividends Found
          </h3>
          <p className="text-gray-500">
            Upload a PDF report to import your Israeli stock dividends.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* By Company - expandable cards */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Dividends by Company
            </h3>
            <div className="flex flex-wrap -m-2">
              {Object.values(dividendsByCompany)
                .sort((a: any, b: any) => {
                  const netA = (a.total_amount || 0) - (a.total_tax || 0);
                  const netB = (b.total_amount || 0) - (b.total_tax || 0);
                  return netB - netA;
                })
                .map((company: any) => (
                  <div
                    key={company.symbol}
                    className="p-2 w-full md:w-1/2 lg:w-1/3"
                  >
                    <div className="bg-white p-4 rounded-lg border border-gray-200">
                      <div
                        role="button"
                        aria-expanded={!!expanded[company.symbol]}
                        onClick={(e) => toggleCompany(company.symbol, e)}
                        className="w-full text-left cursor-pointer select-none"
                      >
                        <div className="flex items-center space-x-3">
                          {company.logo_svg ? (
                            <StockLogo
                              symbol={company.symbol}
                              logoSvg={company.logo_svg}
                              size="md"
                              className="flex-shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {company.symbol.substring(0, 2)}
                              </span>
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {company.symbol}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {company.company_name}
                                </p>
                              </div>
                              <div
                                className="flex items-center gap-2"
                                onClick={(e) =>
                                  toggleCompany(company.symbol, e)
                                }
                              >
                                <span className="text-xs text-gray-500">
                                  {company.count} payments
                                </span>
                                {expanded[company.symbol] ? (
                                  <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                                ) : (
                                  <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Gross Amount:</span>
                            <span className="font-medium">
                              {formatCurrency(company.total_amount)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Tax Paid:</span>
                            <span className="font-medium">
                              {formatCurrency(company.total_tax)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Net Amount:</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(
                                company.total_amount - company.total_tax
                              )}
                            </span>
                          </div>
                        </div>
                      </div>

                      {expanded[company.symbol] && (
                        <div className="mt-4 border-t pt-3 space-y-3">
                          {company.dividends
                            .slice()
                            .sort((a: IsraeliDividend, b: IsraeliDividend) => {
                              const da = a.payment_date
                                ? new Date(a.payment_date).getTime()
                                : 0;
                              const db = b.payment_date
                                ? new Date(b.payment_date).getTime()
                                : 0;
                              return db - da;
                            })
                            .map((dividend: IsraeliDividend) => (
                              <div
                                key={dividend.id}
                                className="flex items-center justify-between text-sm"
                              >
                                <div className="flex items-center gap-3">
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {formatDate(dividend.payment_date)}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      Source: {dividend.source_pdf}
                                    </div>
                                  </div>
                                </div>
                                <div className="grid grid-cols-3 gap-6">
                                  <div>
                                    <div className="text-xs text-gray-500">
                                      Gross
                                    </div>
                                    <div className="font-medium text-blue-600">
                                      {formatCurrency(dividend.amount)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500">
                                      Tax
                                    </div>
                                    <div className="font-medium text-red-600">
                                      {formatCurrency(dividend.tax || 0)}
                                    </div>
                                  </div>
                                  <div>
                                    <div className="text-xs text-gray-500">
                                      Net
                                    </div>
                                    <div className="font-medium text-green-600">
                                      {formatCurrency(
                                        dividend.amount - (dividend.tax || 0)
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
