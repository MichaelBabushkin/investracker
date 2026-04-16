"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, DollarSign, Calendar, Percent, Zap, Info } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatFull(value: number): string {
  return "$" + Math.round(value).toLocaleString();
}

// ── Animated number ───────────────────────────────────────────────────────────

function useAnimatedNumber(target: number, duration = 600) {
  const [display, setDisplay] = useState(target);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(target);

  useEffect(() => {
    const from = fromRef.current;
    const diff = target - from;
    if (Math.abs(diff) < 1) { setDisplay(target); return; }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplay(from + diff * ease);
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
      else { fromRef.current = target; setDisplay(target); }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return display;
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DataPoint {
  year: number;
  contributions: number;
  gains: number;
  total: number;
  inflation?: number;
}

const RETURN_PRESETS = [
  { label: "Conservative", value: 5, color: "text-blue-400", desc: "Bonds / low-risk" },
  { label: "Moderate", value: 8, color: "text-brand-400", desc: "Balanced portfolio" },
  { label: "Aggressive", value: 12, color: "text-orange-400", desc: "Growth / equities" },
  { label: "S&P 500 avg", value: 10.5, color: "text-purple-400", desc: "Historical average" },
];

const SCENARIOS = [
  { label: "☕ Coffee money", desc: "$5/day", initial: 0, monthly: 150 },
  { label: "💼 Side hustle", desc: "$500/mo", initial: 5000, monthly: 500 },
  { label: "🚀 Serious investor", desc: "$2k/mo", initial: 20000, monthly: 2000 },
];

// ── Custom tooltip ─────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.find((p: any) => p.dataKey === "total")?.value ?? 0;
  const contrib = payload.find((p: any) => p.dataKey === "contributions")?.value ?? 0;
  const gains = total - contrib;
  return (
    <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-gray-400 mb-2 font-medium">Year {label}</p>
      <p className="text-brand-400 font-semibold">Total: {formatFull(total)}</p>
      <p className="text-gray-300">Invested: {formatFull(contrib)}</p>
      <p className="text-gain">Gains: {formatFull(gains)}</p>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ToolsPage() {
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [annualReturn, setAnnualReturn] = useState(8);
  const [years, setYears] = useState(20);
  const [inflation, setInflation] = useState(false);
  const [customReturn, setCustomReturn] = useState(false);

  // ── Compute chart data ──────────────────────────────────────────────────────

  const data: DataPoint[] = useMemo(() => {
    const monthlyRate = annualReturn / 100 / 12;
    const inflationRate = 0.025 / 12; // 2.5% annual
    const points: DataPoint[] = [];

    for (let y = 0; y <= years; y++) {
      const months = y * 12;
      // FV of lump sum
      const fvInitial = initial * Math.pow(1 + monthlyRate, months);
      // FV of annuity
      const fvMonthly =
        monthlyRate === 0
          ? monthly * months
          : monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);

      const total = fvInitial + fvMonthly;
      const contributions = initial + monthly * months;
      const gains = total - contributions;

      let inflationAdjusted: number | undefined;
      if (inflation) {
        const inflFactor = Math.pow(1 + inflationRate, months);
        inflationAdjusted = total / inflFactor;
      }

      points.push({
        year: y,
        contributions: Math.round(contributions),
        gains: Math.round(Math.max(gains, 0)),
        total: Math.round(total),
        ...(inflation ? { inflation: Math.round(inflationAdjusted!) } : {}),
      });
    }
    return points;
  }, [initial, monthly, annualReturn, years, inflation]);

  const finalTotal = data[data.length - 1]?.total ?? 0;
  const finalContributions = data[data.length - 1]?.contributions ?? 0;
  const finalGains = finalTotal - finalContributions;
  const gainPct = finalContributions > 0 ? (finalGains / finalContributions) * 100 : 0;
  const inflationAdjusted = data[data.length - 1]?.inflation;

  const animatedTotal = useAnimatedNumber(finalTotal);
  const animatedGains = useAnimatedNumber(finalGains);
  const animatedContrib = useAnimatedNumber(finalContributions);

  const activePreset = RETURN_PRESETS.find((p) => p.value === annualReturn);

  const inputClass =
    "w-full bg-surface-dark border border-white/10 rounded-lg px-3.5 py-2.5 text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-400/40 transition-colors";

  return (
    <div className="min-h-screen bg-surface-dark px-4 py-6 lg:px-8 lg:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-gray-100">Tools</h1>
        <p className="text-sm text-gray-500 mt-1">Powerful calculators to plan your financial future</p>
      </div>

      {/* Calculator card */}
      <div className="bg-surface-dark-secondary border border-white/5 rounded-2xl overflow-hidden">
        {/* Card header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <div className="w-9 h-9 rounded-xl bg-brand-400/10 flex items-center justify-center">
            <TrendingUp size={18} className="text-brand-400" />
          </div>
          <div>
            <h2 className="text-base font-heading font-semibold text-gray-100">Investment Calculator</h2>
            <p className="text-xs text-gray-500">See how your money grows over time</p>
          </div>
        </div>

        <div className="p-6 grid lg:grid-cols-[1fr_1.6fr] gap-8">
          {/* ── Left: inputs ── */}
          <div className="space-y-6">

            {/* Quick scenarios */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick scenarios</p>
              <div className="grid grid-cols-3 gap-2">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => { setInitial(s.initial); setMonthly(s.monthly); }}
                    className="flex flex-col items-center text-center px-2 py-3 rounded-xl border border-white/8 hover:border-brand-400/40 hover:bg-brand-400/5 transition-all group"
                  >
                    <span className="text-xs font-semibold text-gray-200 group-hover:text-brand-400 transition-colors leading-tight">{s.label}</span>
                    <span className="text-[10px] text-gray-600 mt-0.5">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              {/* Initial investment */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                    <DollarSign size={14} className="text-gray-500" /> Starting amount
                  </label>
                  <span className="text-sm font-semibold text-brand-400 tabular-nums">{formatFull(initial)}</span>
                </div>
                <input
                  type="range" min={0} max={500000} step={1000}
                  value={initial}
                  onChange={(e) => setInitial(Number(e.target.value))}
                  className="w-full accent-[#4ADE80] h-1.5 rounded-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  <span>$0</span><span>$500K</span>
                </div>
              </div>

              {/* Monthly contribution */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                    <Calendar size={14} className="text-gray-500" /> Monthly contribution
                  </label>
                  <span className="text-sm font-semibold text-brand-400 tabular-nums">{formatFull(monthly)}/mo</span>
                </div>
                <input
                  type="range" min={0} max={10000} step={50}
                  value={monthly}
                  onChange={(e) => setMonthly(Number(e.target.value))}
                  className="w-full accent-[#4ADE80] h-1.5 rounded-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  <span>$0</span><span>$10K</span>
                </div>
              </div>

              {/* Time horizon */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                    <Calendar size={14} className="text-gray-500" /> Time horizon
                  </label>
                  <span className="text-sm font-semibold text-brand-400 tabular-nums">{years} years</span>
                </div>
                <input
                  type="range" min={1} max={50} step={1}
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full accent-[#4ADE80] h-1.5 rounded-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  <span>1 yr</span><span>50 yrs</span>
                </div>
              </div>

              {/* Annual return presets */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                    <Percent size={14} className="text-gray-500" /> Annual return
                  </label>
                  <span className="text-sm font-semibold text-brand-400 tabular-nums">{annualReturn}%</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-3">
                  {RETURN_PRESETS.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => { setAnnualReturn(p.value); setCustomReturn(false); }}
                      className={`flex flex-col px-3 py-2 rounded-lg border text-left transition-all ${
                        annualReturn === p.value && !customReturn
                          ? "border-brand-400/50 bg-brand-400/8"
                          : "border-white/8 hover:border-white/20 hover:bg-white/3"
                      }`}
                    >
                      <span className={`text-xs font-semibold ${annualReturn === p.value && !customReturn ? "text-brand-400" : "text-gray-300"}`}>
                        {p.value}% — {p.label}
                      </span>
                      <span className="text-[10px] text-gray-600">{p.desc}</span>
                    </button>
                  ))}
                </div>
                {/* Custom rate slider */}
                <input
                  type="range" min={1} max={30} step={0.5}
                  value={annualReturn}
                  onChange={(e) => { setAnnualReturn(Number(e.target.value)); setCustomReturn(true); }}
                  className="w-full accent-[#4ADE80] h-1.5 rounded-full cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                  <span>1%</span><span>30%</span>
                </div>
              </div>

              {/* Inflation toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-dark border border-white/5">
                <div>
                  <p className="text-sm font-medium text-gray-300">Adjust for inflation</p>
                  <p className="text-[11px] text-gray-600">Assumes 2.5% annual inflation</p>
                </div>
                <button
                  onClick={() => setInflation(!inflation)}
                  className={`relative w-10 h-5.5 rounded-full transition-colors ${inflation ? "bg-brand-400" : "bg-white/10"}`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${inflation ? "translate-x-5" : "translate-x-0.5"}`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: results ── */}
          <div className="flex flex-col gap-6">
            {/* Hero number */}
            <div className="relative rounded-2xl bg-gradient-to-br from-brand-400/10 via-brand-400/5 to-transparent border border-brand-400/20 p-6 overflow-hidden">
              <div className="absolute inset-0 dot-grid opacity-10" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <Zap size={14} className="text-brand-400" />
                  <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">Portfolio value in {years} years</span>
                </div>
                <p className="text-4xl lg:text-5xl font-heading font-bold text-gray-100 tabular-nums mt-2">
                  {formatFull(animatedTotal)}
                </p>
                {inflation && inflationAdjusted && (
                  <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                    <Info size={12} />
                    {formatFull(inflationAdjusted)} in today&apos;s money
                  </p>
                )}
              </div>
            </div>

            {/* Three metric cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-surface-dark rounded-xl p-3 border border-white/5 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Invested</p>
                <p className="text-sm font-semibold text-gray-300 tabular-nums">{formatCurrency(animatedContrib)}</p>
              </div>
              <div className="bg-surface-dark rounded-xl p-3 border border-white/5 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Gains</p>
                <p className="text-sm font-semibold text-gain tabular-nums">{formatCurrency(animatedGains)}</p>
              </div>
              <div className="bg-surface-dark rounded-xl p-3 border border-white/5 text-center">
                <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Return</p>
                <p className="text-sm font-semibold text-gain tabular-nums">+{gainPct.toFixed(0)}%</p>
              </div>
            </div>

            {/* Stacked bar: contributions vs gains */}
            <div className="space-y-2">
              <div className="flex justify-between text-[11px] text-gray-600">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-400/40 inline-block" />Contributions</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-400 inline-block" />Gains</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden bg-surface-dark flex">
                {finalTotal > 0 && (
                  <>
                    <div
                      className="h-full bg-brand-400/30 transition-all duration-700"
                      style={{ width: `${(finalContributions / finalTotal) * 100}%` }}
                    />
                    <div
                      className="h-full bg-brand-400 transition-all duration-700"
                      style={{ width: `${(finalGains / finalTotal) * 100}%` }}
                    />
                  </>
                )}
              </div>
              <div className="flex justify-between text-[11px] text-gray-500 tabular-nums">
                <span>{((finalContributions / finalTotal) * 100).toFixed(0)}% of total</span>
                <span>{((finalGains / finalTotal) * 100).toFixed(0)}% of total</span>
              </div>
            </div>

            {/* Chart */}
            <div className="h-52 lg:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradContrib" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#4ADE80" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradGains" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#4ADE80" stopOpacity={0.05} />
                    </linearGradient>
                    {inflation && (
                      <linearGradient id="gradInflation" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
                      </linearGradient>
                    )}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `Yr ${v}`}
                    interval={Math.ceil(years / 5)}
                  />
                  <YAxis
                    tick={{ fill: "#6B7280", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatCurrency}
                    width={52}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="contributions"
                    stackId="1"
                    stroke="#4ADE80"
                    strokeOpacity={0.4}
                    strokeWidth={1.5}
                    fill="url(#gradContrib)"
                    name="Contributions"
                    isAnimationActive={true}
                    animationDuration={600}
                  />
                  <Area
                    type="monotone"
                    dataKey="gains"
                    stackId="1"
                    stroke="#4ADE80"
                    strokeWidth={2}
                    fill="url(#gradGains)"
                    name="Gains"
                    isAnimationActive={true}
                    animationDuration={600}
                  />
                  {inflation && (
                    <Area
                      type="monotone"
                      dataKey="inflation"
                      stroke="#F59E0B"
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      fill="url(#gradInflation)"
                      name="Inflation-adjusted"
                      isAnimationActive={true}
                      animationDuration={600}
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Insight callout */}
            <div className="rounded-xl bg-surface-dark border border-white/5 p-4 text-sm">
              <span className="text-gray-500">At </span>
              <span className="text-brand-400 font-semibold">{annualReturn}%</span>
              <span className="text-gray-500"> annual return, every </span>
              <span className="text-gray-200 font-semibold">$1,000</span>
              <span className="text-gray-500"> invested today becomes </span>
              <span className="text-brand-400 font-semibold">
                {formatFull(1000 * Math.pow(1 + annualReturn / 100, years))}
              </span>
              <span className="text-gray-500"> in {years} years. </span>
              {gainPct > 100 && (
                <span className="text-gray-500">
                  Your money <span className="text-gain font-semibold">more than doubles</span> your contributions.
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* More tools coming soon */}
      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { title: "Retirement Planner", desc: "Calculate when you can retire based on your savings rate and target nest egg.", soon: true },
          { title: "Dividend Reinvestment", desc: "Model the power of DRIP — see how reinvested dividends accelerate growth.", soon: true },
          { title: "Risk / Reward Analyzer", desc: "Compare risk-adjusted returns across different asset allocations.", soon: true },
        ].map((t) => (
          <div key={t.title} className="relative bg-surface-dark-secondary border border-white/5 rounded-2xl p-5 opacity-60">
            <div className="absolute top-3 right-3 text-[10px] font-semibold text-gray-600 bg-white/5 px-2 py-0.5 rounded-full">
              Coming soon
            </div>
            <h3 className="text-sm font-semibold text-gray-300 mb-1">{t.title}</h3>
            <p className="text-xs text-gray-600">{t.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
