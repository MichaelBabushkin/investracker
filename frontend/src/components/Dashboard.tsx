"use client";

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Banknote,
  BarChart3,
  Briefcase,
  Plus,
  Upload,
  ArrowRight,
  Globe2,
  Landmark,
  Loader2,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle } from "./ui/Card";
import { MetricCard } from "./ui/MetricCard";
import ReportUploader from "./ReportUploader";
import IsraeliMarketHighlights from "./IsraeliMarketHighlights";
import WorldMarketHighlights from "./WorldMarketHighlights";
import Link from "next/link";
import { worldStocksAPI } from "@/services/api";

interface PortfolioData {
  totalValue: number;
  totalCash: number;
  totalPortfolioValue: number;
  dayChange: number;
  dayChangePercent: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  totalInvested: number;
  totalRealizedPL: number;
  totalDividends: number;
  totalCommissions: number;
  taxWithheldILS: number;
}

interface Holding {
  symbol: string;
  name: string;
  shares: number;
  currentPrice: number;
  value: number;
  gainLoss: number;
  gainLossPercent: number;
}

interface Transaction {
  id: number;
  type: string;
  symbol: string;
  shares: number;
  price: number;
  date: string | null;
  total: number;
}

interface SectorItem {
  name: string;
  value: number;
}

export default function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth);

  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [sectorData, setSectorData] = useState<SectorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const COLORS = ["#4ADE80", "#38BDF8", "#FBBF24", "#A78BFA", "#F472B6", "#34D399", "#FB923C", "#818CF8"];

  const [showUploader, setShowUploader] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await worldStocksAPI.getPortfolioDashboard();
        setPortfolioData(data.portfolioData);
        setHoldings(data.holdings || []);
        setRecentTransactions(data.recentTransactions || []);
        setSectorData(data.sectorData || []);
      } catch (err: any) {
        console.error("Dashboard fetch error:", err);
        setError(err.response?.data?.detail || err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-surface-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h1 className="text-2xl lg:text-3xl font-heading font-bold text-gray-100">
            Welcome back, {user?.first_name || "Investor"}
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Here&apos;s your portfolio overview
          </p>
        </div>

        {/* ── Metric Cards ── */}
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-surface-dark-secondary rounded-xl border border-white/5 p-5 h-24">
                <div className="h-3 bg-white/10 rounded w-1/2 mb-3"></div>
                <div className="h-6 bg-white/10 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : portfolioData ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <MetricCard
              label="Total Portfolio"
              value={`$${portfolioData.totalPortfolioValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subValue={`Holdings: $${portfolioData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Cash: $${portfolioData.totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={<DollarSign size={18} />}
            />
            <MetricCard
              label="Total Gain/Loss"
              value={`${portfolioData.totalGainLoss >= 0 ? "+" : ""}$${portfolioData.totalGainLoss.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subValue={`${portfolioData.totalGainLossPercent >= 0 ? "+" : ""}${portfolioData.totalGainLossPercent}%`}
              trend={{ value: portfolioData.totalGainLossPercent }}
              icon={portfolioData.totalGainLoss >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            />
            <MetricCard
              label="Realized P/L"
              value={`${portfolioData.totalRealizedPL >= 0 ? "+" : ""}$${portfolioData.totalRealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subValue={portfolioData.taxWithheldILS > 0 
                ? `Div: $${(portfolioData.totalDividends || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Tax: ₪${portfolioData.taxWithheldILS.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `Dividends: $${(portfolioData.totalDividends || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
              icon={<BarChart3 size={18} />}
            />
            <MetricCard
              label="Cash Available"
              value={`$${portfolioData.totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              subValue={`Invested: $${portfolioData.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              icon={<Banknote size={18} />}
            />
          </div>
        ) : error ? (
          <div className="mb-8 bg-loss/10 border border-loss/20 rounded-xl p-4 text-center text-loss text-sm">
            {error}
          </div>
        ) : null}

        {/* ── Quick Links ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Link href="/israeli-stocks" className="group p-4 rounded-xl bg-surface-dark-secondary border border-white/5 hover:border-brand-400/20 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-brand-400/10 flex items-center justify-center">
                <Landmark size={18} className="text-brand-400" />
              </div>
              <span className="text-xs text-brand-400 bg-brand-400/10 px-2 py-0.5 rounded-full font-medium">NEW</span>
            </div>
            <p className="font-semibold text-gray-200 text-sm">Israeli Market</p>
            <p className="text-xs text-gray-500 mt-0.5">Upload PDFs & analyze</p>
          </Link>
          <Link href="/world-stocks" className="group p-4 rounded-xl bg-surface-dark-secondary border border-white/5 hover:border-info/20 transition-all">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-9 h-9 rounded-lg bg-info/10 flex items-center justify-center">
                <Globe2 size={18} className="text-info" />
              </div>
              <span className="text-xs text-info bg-info/10 px-2 py-0.5 rounded-full font-medium">NEW</span>
            </div>
            <p className="font-semibold text-gray-200 text-sm">World Market</p>
            <p className="text-xs text-gray-500 mt-0.5">Track global stocks</p>
          </Link>
          <button onClick={() => setShowUploader(true)} className="p-4 rounded-xl bg-surface-dark-secondary border border-white/5 hover:border-brand-400/20 transition-all text-left">
            <div className="w-9 h-9 rounded-lg bg-brand-400/10 flex items-center justify-center mb-2">
              <Upload size={18} className="text-brand-400" />
            </div>
            <p className="font-semibold text-gray-200 text-sm">Upload Report</p>
            <p className="text-xs text-gray-500 mt-0.5">Import PDF data</p>
          </button>
          <Link href="/analytics" className="p-4 rounded-xl bg-surface-dark-secondary border border-white/5 hover:border-brand-400/20 transition-all">
            <div className="w-9 h-9 rounded-lg bg-brand-400/10 flex items-center justify-center mb-2">
              <BarChart3 size={18} className="text-brand-400" />
            </div>
            <p className="font-semibold text-gray-200 text-sm">Analytics</p>
            <p className="text-xs text-gray-500 mt-0.5">Performance insights</p>
          </Link>
        </div>

        {/* ── Charts Row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Portfolio Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Summary</CardTitle>
            </CardHeader>
            <div className="px-5 pb-5 space-y-4">
              {loading ? (
                <div className="animate-pulse space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-4 bg-white/10 rounded w-3/4"></div>
                  ))}
                </div>
              ) : portfolioData ? (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-gray-400">Total Invested</span>
                    <span className="text-sm font-medium text-gray-200 financial-value">
                      ${portfolioData.totalInvested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-gray-400">Current Value</span>
                    <span className="text-sm font-medium text-gray-200 financial-value">
                      ${portfolioData.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-gray-400">Unrealized P/L</span>
                    <span className={`text-sm font-medium financial-value ${(portfolioData.totalValue - portfolioData.totalInvested) >= 0 ? "text-gain" : "text-loss"}`}>
                      {(portfolioData.totalValue - portfolioData.totalInvested) >= 0 ? "+" : ""}
                      ${(portfolioData.totalValue - portfolioData.totalInvested).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-gray-400">Realized P/L</span>
                    <span className={`text-sm font-medium financial-value ${portfolioData.totalRealizedPL >= 0 ? "text-gain" : "text-loss"}`}>
                      {portfolioData.totalRealizedPL >= 0 ? "+" : ""}
                      ${portfolioData.totalRealizedPL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-gray-400">Dividends Received</span>
                    <span className="text-sm font-medium text-gain financial-value">
                      ${(portfolioData.totalDividends || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-sm text-gray-400">Total Commissions</span>
                    <span className="text-sm font-medium text-loss financial-value">
                      -${(portfolioData.totalCommissions || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  {(portfolioData.taxWithheldILS || 0) > 0 && (
                    <div className="flex items-center justify-between py-2 border-b border-white/5">
                      <span className="text-sm text-gray-400">Capital Gains Tax Paid</span>
                      <span className="text-sm font-medium text-amber-400 financial-value">
                        ₪{portfolioData.taxWithheldILS.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-sm text-center py-8">No portfolio data yet. Upload a broker report to get started.</p>
              )}
            </div>
          </Card>

          {/* Allocation Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Allocation</CardTitle>
            </CardHeader>
            <div className="px-5 pb-5 h-64 flex items-center">
              {loading ? (
                <div className="w-full flex items-center justify-center">
                  <Loader2 className="animate-spin text-gray-500" size={24} />
                </div>
              ) : sectorData.length > 0 ? (
                <>
                  <div className="w-1/2 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={sectorData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                          {sectorData.map((_, i) => (
                            <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px", color: "#F9FAFB" }} formatter={(value, name) => [`${value}%`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="w-1/2 space-y-3">
                    {sectorData.map((s, i) => (
                      <div key={s.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-sm text-gray-400 flex-1">{s.name}</span>
                        <span className="text-sm font-medium text-gray-200 financial-value">{s.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="w-full text-gray-500 text-sm text-center">No sector data available</p>
              )}
            </div>
          </Card>
        </div>

        {/* ── Holdings & Transactions ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Holdings Table */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between w-full">
                  <CardTitle>Current Holdings</CardTitle>
                  {holdings.length > 0 && (
                    <input
                      type="text"
                      placeholder="Search…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-3 py-1.5 text-sm rounded-lg bg-surface-dark border border-white/10 text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/40 w-40"
                    />
                  )}
                </div>
              </CardHeader>
              {loading ? (
                <div className="px-5 pb-5 animate-pulse space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-white/5 rounded"></div>
                  ))}
                </div>
              ) : holdings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Shares</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Value</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gain/Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {holdings
                        .filter((h) => h.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || h.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        .map((h) => (
                          <tr key={h.symbol} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="text-sm font-medium text-gray-200">{h.symbol}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[120px]">{h.name}</div>
                            </td>
                            <td className="px-5 py-3.5 text-right text-sm text-gray-300 financial-value">{h.shares.toLocaleString()}</td>
                            <td className="px-5 py-3.5 text-right text-sm text-gray-300 financial-value">
                              {h.currentPrice > 0 ? `$${h.currentPrice.toFixed(2)}` : "—"}
                            </td>
                            <td className="px-5 py-3.5 text-right text-sm text-gray-200 font-medium financial-value">${h.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="px-5 py-3.5 text-right">
                              <div className={`text-sm font-medium financial-value ${h.gainLoss >= 0 ? "text-gain" : "text-loss"}`}>
                                {h.gainLoss >= 0 ? "+" : ""}${h.gainLoss.toFixed(2)}
                              </div>
                              <div className={`text-xs ${h.gainLossPercent >= 0 ? "text-gain" : "text-loss"}`}>
                                {h.gainLossPercent >= 0 ? "+" : ""}{h.gainLossPercent}%
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-5 pb-5 text-center py-8">
                  <p className="text-gray-500 text-sm">No holdings yet. Upload a broker report to get started.</p>
                </div>
              )}
              {holdings.length > 0 && (
                <div className="px-5 pb-4 pt-2 border-t border-white/5">
                  <Link href="/world-stocks" className="flex items-center justify-center gap-1 text-sm text-brand-400 hover:text-brand-300 py-1 transition-colors">
                    View All Holdings <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </Card>
          </div>

          {/* Recent Transactions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <div className="px-5 pb-5 space-y-3">
                {loading ? (
                  <div className="animate-pulse space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-10 bg-white/5 rounded"></div>
                    ))}
                  </div>
                ) : recentTransactions.length > 0 ? (
                  <>
                    {recentTransactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
                            t.type === "buy" ? "bg-gain/10 text-gain" : t.type === "sell" ? "bg-loss/10 text-loss" : t.type === "dividend" ? "bg-info/10 text-info" : "bg-purple-500/10 text-purple-400"
                          }`}>
                            {t.type === "buy" ? "B" : t.type === "sell" ? "S" : t.type === "dividend" ? "D" : "FX"}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-200">{t.symbol}</p>
                            <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                          </div>
                        </div>
                        <div className={`text-sm font-medium financial-value ${t.type === "buy" ? "text-loss" : "text-gain"}`}>
                          {t.type === "buy" ? "-" : "+"}${t.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                    ))}
                    <Link href="/world-stocks" className="flex items-center justify-center gap-1 text-sm text-brand-400 hover:text-brand-300 py-2 transition-colors">
                      View All <ArrowRight size={14} />
                    </Link>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No transactions yet</p>
                )}
              </div>
            </Card>
          </div>
        </div>

        {/* ── Market Highlights ── */}
        <div className="mt-10 space-y-6">
          <IsraeliMarketHighlights />
          <WorldMarketHighlights />
        </div>
      </div>

      {/* Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-dark-secondary rounded-xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-heading font-semibold text-gray-100">Upload Investment Reports</h2>
                <button onClick={() => setShowUploader(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400">
                  <Plus size={18} className="rotate-45" />
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-1">Upload PDF reports to extract and analyze your portfolio data.</p>
            </div>
            <div className="p-6">
              <ReportUploader onUploadComplete={() => setShowUploader(false)} maxFiles={3} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
