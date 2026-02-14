"use client";

import React, { useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Briefcase,
  Plus,
  Upload,
  ArrowRight,
  Globe2,
  Landmark,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle } from "./ui/Card";
import { MetricCard } from "./ui/MetricCard";
import ReportUploader from "./ReportUploader";
import IsraeliMarketHighlights from "./IsraeliMarketHighlights";
import WorldMarketHighlights from "./WorldMarketHighlights";
import Link from "next/link";

export default function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth);

  const [portfolioData] = useState({
    totalValue: 125430.5,
    dayChange: 2340.25,
    dayChangePercent: 1.9,
    totalGainLoss: 15430.5,
    totalGainLossPercent: 13.9,
    totalInvested: 110000.0,
  });

  const [holdings] = useState([
    { symbol: "AAPL", name: "Apple Inc.", shares: 50, currentPrice: 182.52, value: 9126.0, gainLoss: 1205.5, gainLossPercent: 15.2 },
    { symbol: "GOOGL", name: "Alphabet Inc.", shares: 25, currentPrice: 2785.48, value: 69637.0, gainLoss: -892.35, gainLossPercent: -1.3 },
    { symbol: "MSFT", name: "Microsoft Corp.", shares: 75, currentPrice: 415.26, value: 31144.5, gainLoss: 2134.75, gainLossPercent: 7.4 },
    { symbol: "TSLA", name: "Tesla Inc.", shares: 30, currentPrice: 248.5, value: 7455.0, gainLoss: -523.2, gainLossPercent: -6.6 },
  ]);

  const [recentTransactions] = useState([
    { id: 1, type: "buy", symbol: "AAPL", shares: 10, price: 178.25, date: "2024-01-15", total: 1782.5 },
    { id: 2, type: "sell", symbol: "GOOGL", shares: 5, price: 2790.0, date: "2024-01-14", total: 13950.0 },
    { id: 3, type: "buy", symbol: "MSFT", shares: 25, price: 412.8, date: "2024-01-12", total: 10320.0 },
    { id: 4, type: "dividend", symbol: "AAPL", shares: 0, price: 0.24, date: "2024-01-08", total: 12.0 },
  ]);

  const [performanceData] = useState([
    { date: "2024-01-01", value: 120000 },
    { date: "2024-01-03", value: 121500 },
    { date: "2024-01-05", value: 119800 },
    { date: "2024-01-08", value: 122300 },
    { date: "2024-01-10", value: 123800 },
    { date: "2024-01-12", value: 124200 },
    { date: "2024-01-15", value: 125430 },
  ]);

  const [sectorData] = useState([
    { name: "Technology", value: 69.6 },
    { name: "Automotive", value: 5.9 },
    { name: "Cash", value: 6.4 },
    { name: "Services", value: 18.1 },
  ]);

  const COLORS = ["#4ADE80", "#38BDF8", "#FBBF24", "#A78BFA"];

  const [selectedTimeframe, setSelectedTimeframe] = useState("30d");
  const [showUploader, setShowUploader] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            label="Total Value"
            value={`$${portfolioData.totalValue.toLocaleString()}`}
            icon={<DollarSign size={18} />}
          />
          <MetricCard
            label="Today's Change"
            value={`${portfolioData.dayChange >= 0 ? "+" : ""}$${portfolioData.dayChange.toLocaleString()}`}
            subValue={`${portfolioData.dayChangePercent >= 0 ? "+" : ""}${portfolioData.dayChangePercent}%`}
            trend={{ value: portfolioData.dayChangePercent }}
            icon={portfolioData.dayChange >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          />
          <MetricCard
            label="Total Gain/Loss"
            value={`${portfolioData.totalGainLoss >= 0 ? "+" : ""}$${portfolioData.totalGainLoss.toLocaleString()}`}
            subValue={`${portfolioData.totalGainLossPercent >= 0 ? "+" : ""}${portfolioData.totalGainLossPercent}%`}
            trend={{ value: portfolioData.totalGainLossPercent }}
            icon={<BarChart3 size={18} />}
          />
          <MetricCard
            label="Total Invested"
            value={`$${portfolioData.totalInvested.toLocaleString()}`}
            subValue={`${((portfolioData.totalValue / portfolioData.totalInvested - 1) * 100).toFixed(1)}% return`}
            icon={<Briefcase size={18} />}
          />
        </div>

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
          {/* Performance Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Portfolio Performance</CardTitle>
                <div className="flex gap-1 bg-surface-dark rounded-lg p-0.5">
                  {["7d", "30d", "90d", "1y"].map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setSelectedTimeframe(tf)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        selectedTimeframe === tf
                          ? "bg-brand-400/10 text-brand-400"
                          : "text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      {tf.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <div className="px-5 pb-5 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickFormatter={(v) => new Date(v).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    stroke="#1E293B"
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#6B7280" }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    stroke="#1E293B"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#1F2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "12px", color: "#F9FAFB" }}
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, "Value"]}
                    labelFormatter={(l) => new Date(l).toLocaleDateString()}
                  />
                  <Line type="monotone" dataKey="value" stroke="#4ADE80" strokeWidth={2} dot={{ fill: "#4ADE80", strokeWidth: 0, r: 3 }} activeDot={{ r: 5, stroke: "#4ADE80", strokeWidth: 2, fill: "#0B0F1A" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Allocation Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Portfolio Allocation</CardTitle>
            </CardHeader>
            <div className="px-5 pb-5 h-64 flex items-center">
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
                  <input
                    type="text"
                    placeholder="Search…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg bg-surface-dark border border-white/10 text-gray-300 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/40 w-40"
                  />
                </div>
              </CardHeader>
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
                          <td className="px-5 py-3.5 text-right text-sm text-gray-300 financial-value">{h.shares}</td>
                          <td className="px-5 py-3.5 text-right text-sm text-gray-300 financial-value">${h.currentPrice.toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-right text-sm text-gray-200 font-medium financial-value">${h.value.toLocaleString()}</td>
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
            </Card>
          </div>

          {/* Recent Transactions */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <div className="px-5 pb-5 space-y-3">
                {recentTransactions.map((t) => (
                  <div key={t.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${
                        t.type === "buy" ? "bg-gain/10 text-gain" : t.type === "sell" ? "bg-loss/10 text-loss" : "bg-info/10 text-info"
                      }`}>
                        {t.type === "buy" ? "B" : t.type === "sell" ? "S" : "D"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-200">{t.symbol}</p>
                        <p className="text-xs text-gray-500">{t.date}</p>
                      </div>
                    </div>
                    <div className={`text-sm font-medium financial-value ${t.type === "buy" ? "text-loss" : "text-gain"}`}>
                      {t.type === "buy" ? "-" : "+"}${t.total.toLocaleString()}
                    </div>
                  </div>
                ))}
                <Link href="/portfolio" className="flex items-center justify-center gap-1 text-sm text-brand-400 hover:text-brand-300 py-2 transition-colors">
                  View All <ArrowRight size={14} />
                </Link>
              </div>
            </Card>

            {/* Market Overview */}
            <Card>
              <CardHeader>
                <CardTitle>Market Overview</CardTitle>
              </CardHeader>
              <div className="px-5 pb-5 space-y-3">
                {[
                  { name: "S&P 500", val: "4,185.47", change: "+0.8%" },
                  { name: "NASDAQ", val: "13,052.20", change: "+1.2%" },
                  { name: "DOW", val: "33,875.40", change: "-0.3%" },
                ].map((m) => (
                  <div key={m.name} className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">{m.name}</span>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-200 financial-value">{m.val}</span>
                      <span className={`text-xs ml-2 ${m.change.startsWith("+") ? "text-gain" : "text-loss"}`}>{m.change}</span>
                    </div>
                  </div>
                ))}
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
