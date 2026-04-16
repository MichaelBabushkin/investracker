"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  TrendingUp, DollarSign, Calendar, Percent, Zap, Info,
  Target, RefreshCw, Scale, Coffee, Briefcase, Rocket,
} from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────

function fmt(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function fmtFull(v: number): string {
  return "$" + Math.round(v).toLocaleString();
}

// ── Animated number ───────────────────────────────────────────────────────

function useAnimatedNumber(target: number, ms = 600) {
  const [val, setVal] = useState(target);
  const raf = useRef<number | null>(null);
  const t0 = useRef<number | null>(null);
  const from = useRef(target);

  useEffect(() => {
    const diff = target - from.current;
    if (Math.abs(diff) < 1) { setVal(target); return; }
    if (raf.current) cancelAnimationFrame(raf.current);
    t0.current = null;
    const tick = (ts: number) => {
      if (!t0.current) t0.current = ts;
      const p = Math.min((ts - t0.current) / ms, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setVal(from.current + diff * e);
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else { from.current = target; setVal(target); }
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, ms]);

  return val;
}

// ── Shared UI ─────────────────────────────────────────────────────────────

const SliderField: React.FC<{
  label: string; icon: React.ReactNode; value: number;
  min: number; max: number; step: number;
  onChange: (v: number) => void; display: string; minLabel: string; maxLabel: string;
}> = ({ label, icon, value, min, max, step, onChange, display, minLabel, maxLabel }) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">{icon}{label}</label>
      <span className="text-sm font-semibold text-brand-400 tabular-nums">{display}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full accent-[#4ADE80] h-1.5 rounded-full cursor-pointer" />
    <div className="flex justify-between text-[10px] text-gray-600 mt-1">
      <span>{minLabel}</span><span>{maxLabel}</span>
    </div>
  </div>
);

const ToolMetric: React.FC<{ label: string; value: string; color?: string }> = ({
  label, value, color = "text-gray-300"
}) => (
  <div className="bg-surface-dark rounded-xl p-3 border border-white/5 text-center">
    <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">{label}</p>
    <p className={`text-sm font-semibold tabular-nums ${color}`}>{value}</p>
  </div>
);

const HeroCard: React.FC<{ label: string; value: string; sub?: string }> = ({ label, value, sub }) => (
  <div className="relative rounded-2xl bg-gradient-to-br from-brand-400/10 via-brand-400/5 to-transparent border border-brand-400/20 p-6 overflow-hidden">
    <div className="absolute inset-0 dot-grid opacity-10" />
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        <Zap size={14} className="text-brand-400" />
        <span className="text-xs font-semibold text-brand-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-4xl lg:text-5xl font-heading font-bold text-gray-100 tabular-nums mt-2">{value}</p>
      {sub && <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5"><Info size={12} />{sub}</p>}
    </div>
  </div>
);

const ToolCard: React.FC<{
  icon: React.ElementType; title: string; desc: string; children: React.ReactNode;
}> = ({ icon: Icon, title, desc, children }) => (
  <div className="bg-surface-dark-secondary border border-white/5 rounded-2xl overflow-hidden">
    <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
      <div className="w-9 h-9 rounded-xl bg-brand-400/10 flex items-center justify-center">
        <Icon size={18} className="text-brand-400" />
      </div>
      <div>
        <h2 className="text-base font-heading font-semibold text-gray-100">{title}</h2>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
    <div className="p-6">{children}</div>
  </div>
);

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-3 shadow-2xl text-xs">
      <p className="text-gray-400 mb-1.5 font-medium">Year {label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmtFull(p.value)}
        </p>
      ))}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════
// CALCULATOR 1: Investment / Compound Calculator
// ══════════════════════════════════════════════════════════════════════════

const RETURN_PRESETS = [
  { label: "Conservative", value: 5, desc: "Bonds / low-risk" },
  { label: "Moderate", value: 8, desc: "Balanced portfolio" },
  { label: "Aggressive", value: 12, desc: "Growth / equities" },
  { label: "S&P 500 avg", value: 10.5, desc: "Historical average" },
];

const SCENARIOS = [
  { label: "Coffee money", desc: "$5/day", initial: 0, monthly: 150, icon: Coffee },
  { label: "Side hustle", desc: "$500/mo", initial: 5000, monthly: 500, icon: Briefcase },
  { label: "Serious investor", desc: "$2k/mo", initial: 20000, monthly: 2000, icon: Rocket },
];

function CompoundCalculator() {
  const [initial, setInitial] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [annualReturn, setAnnualReturn] = useState(8);
  const [years, setYears] = useState(20);
  const [inflation, setInflation] = useState(false);
  const [customReturn, setCustomReturn] = useState(false);

  const data = useMemo(() => {
    const r = annualReturn / 100 / 12;
    const ir = 0.025 / 12;
    return Array.from({ length: years + 1 }, (_, y) => {
      const n = y * 12;
      const fvI = initial * Math.pow(1 + r, n);
      const fvM = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r);
      const total = fvI + fvM;
      const contributions = initial + monthly * n;
      return {
        year: y,
        contributions: Math.round(contributions),
        gains: Math.round(Math.max(total - contributions, 0)),
        total: Math.round(total),
        ...(inflation ? { inflation: Math.round(total / Math.pow(1 + ir, n)) } : {}),
      };
    });
  }, [initial, monthly, annualReturn, years, inflation]);

  const last = data[data.length - 1] ?? { total: 0, contributions: 0, gains: 0 };
  const gains = last.total - last.contributions;
  const gainPct = last.contributions > 0 ? (gains / last.contributions) * 100 : 0;
  const inflAdj = (data[data.length - 1] as any)?.inflation;

  const animTotal = useAnimatedNumber(last.total);
  const animGains = useAnimatedNumber(gains);
  const animContrib = useAnimatedNumber(last.contributions);

  return (
    <ToolCard icon={TrendingUp} title="Investment Calculator" desc="See how your money grows through compound interest">
      <div className="grid lg:grid-cols-[1fr_1.6fr] gap-8">
        {/* Left: inputs */}
        <div className="space-y-6">
          {/* Quick scenarios */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick scenarios</p>
            <div className="grid grid-cols-3 gap-2">
              {SCENARIOS.map(({ label, desc, initial: si, monthly: sm, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => { setInitial(si); setMonthly(sm); }}
                  className="flex flex-col items-center text-center px-2 py-4 lg:py-3 rounded-xl border border-white/8 hover:border-brand-400/40 hover:bg-brand-400/5 transition-all group"
                >
                  <Icon size={22} className="mb-2 lg:mb-1.5 text-gray-500 group-hover:text-brand-400 transition-colors" />
                  <span className="text-xs lg:text-[11px] font-semibold text-gray-200 group-hover:text-brand-400 transition-colors leading-tight">{label}</span>
                  <span className="text-[10px] text-gray-600 mt-0.5">{desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <SliderField label="Starting amount" icon={<DollarSign size={14} className="text-gray-500" />}
              value={initial} min={0} max={500000} step={1000} onChange={setInitial}
              display={fmtFull(initial)} minLabel="$0" maxLabel="$500K" />
            <SliderField label="Monthly contribution" icon={<Calendar size={14} className="text-gray-500" />}
              value={monthly} min={0} max={10000} step={50} onChange={setMonthly}
              display={`${fmtFull(monthly)}/mo`} minLabel="$0" maxLabel="$10K" />
            <SliderField label="Time horizon" icon={<Calendar size={14} className="text-gray-500" />}
              value={years} min={1} max={50} step={1} onChange={setYears}
              display={`${years} years`} minLabel="1 yr" maxLabel="50 yrs" />

            {/* Return presets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                  <Percent size={14} className="text-gray-500" /> Annual return
                </label>
                <span className="text-sm font-semibold text-brand-400 tabular-nums">{annualReturn}%</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {RETURN_PRESETS.map((p) => (
                  <button key={p.value}
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
              <input type="range" min={1} max={30} step={0.5} value={annualReturn}
                onChange={(e) => { setAnnualReturn(Number(e.target.value)); setCustomReturn(true); }}
                className="w-full accent-[#4ADE80] h-1.5 rounded-full cursor-pointer" />
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
                className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${inflation ? "bg-brand-400" : "bg-white/10"}`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${inflation ? "translate-x-5" : "translate-x-1"}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: results */}
        <div className="flex flex-col gap-6">
          <HeroCard
            label={`Portfolio value in ${years} years`}
            value={fmtFull(animTotal)}
            sub={inflation && inflAdj ? `${fmtFull(inflAdj)} in today's money` : undefined}
          />

          <div className="grid grid-cols-3 gap-3">
            <ToolMetric label="Invested" value={fmt(animContrib)} />
            <ToolMetric label="Gains" value={fmt(animGains)} color="text-gain" />
            <ToolMetric label="Return" value={`+${gainPct.toFixed(0)}%`} color="text-gain" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-[11px] text-gray-600">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-400/40 inline-block" />Contributions</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand-400 inline-block" />Gains</span>
            </div>
            <div className="h-3 rounded-full overflow-hidden bg-surface-dark flex">
              {last.total > 0 && (
                <>
                  <div className="h-full bg-brand-400/30 transition-all duration-700" style={{ width: `${(last.contributions / last.total) * 100}%` }} />
                  <div className="h-full bg-brand-400 transition-all duration-700" style={{ width: `${(gains / last.total) * 100}%` }} />
                </>
              )}
            </div>
            <div className="flex justify-between text-[11px] text-gray-500 tabular-nums">
              <span>{last.total > 0 ? ((last.contributions / last.total) * 100).toFixed(0) : 0}% of total</span>
              <span>{last.total > 0 ? ((gains / last.total) * 100).toFixed(0) : 0}% of total</span>
            </div>
          </div>

          <div className="h-52 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gcC" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4ADE80" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gcG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#4ADE80" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="year" tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `Yr ${v}`} interval={Math.ceil(years / 5)} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmt} width={52} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="contributions" stackId="1" stroke="#4ADE80" strokeOpacity={0.4} strokeWidth={1.5} fill="url(#gcC)" name="Contributions" animationDuration={600} />
                <Area type="monotone" dataKey="gains" stackId="1" stroke="#4ADE80" strokeWidth={2} fill="url(#gcG)" name="Gains" animationDuration={600} />
                {inflation && (
                  <Area type="monotone" dataKey="inflation" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="4 3" fill="none" name="Inflation-adj" animationDuration={600} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl bg-surface-dark border border-white/5 p-4 text-sm">
            <span className="text-gray-500">At <span className="text-brand-400 font-semibold">{annualReturn}%</span> annual return, every <span className="text-gray-200 font-semibold">$1,000</span> invested today becomes </span>
            <span className="text-brand-400 font-semibold">{fmtFull(1000 * Math.pow(1 + annualReturn / 100, years))}</span>
            <span className="text-gray-500"> in {years} years.</span>
            {gainPct > 100 && (
              <span className="text-gray-500"> Your money <span className="text-gain font-semibold">more than doubles</span> your contributions.</span>
            )}
          </div>
        </div>
      </div>
    </ToolCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CALCULATOR 2: Retirement Planner
// ══════════════════════════════════════════════════════════════════════════

const RETIREMENT_RETURN_PRESETS = [
  { label: "Balanced", value: 7 },
  { label: "Growth", value: 10 },
  { label: "Aggressive", value: 12 },
];

function RetirementCalculator() {
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(65);
  const [currentSavings, setCurrentSavings] = useState(25000);
  const [monthly, setMonthly] = useState(1000);
  const [returnRate, setReturnRate] = useState(8);
  const [targetMonthlyIncome, setTargetMonthlyIncome] = useState(5000);

  const yearsLeft = Math.max(retirementAge - currentAge, 1);
  const r = returnRate / 100 / 12;
  const n = yearsLeft * 12;

  const fvSavings = currentSavings * Math.pow(1 + r, n);
  const fvMonthly = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r);
  const projected = Math.round(fvSavings + fvMonthly);

  // 4% rule: need 25x annual spending
  const targetNestEgg = targetMonthlyIncome * 12 * 25;
  const onTrack = projected >= targetNestEgg;
  const progressPct = Math.min((projected / targetNestEgg) * 100, 100);

  // Monthly needed to reach target (PMT formula)
  const gap = targetNestEgg - fvSavings;
  const monthlyNeeded = gap <= 0
    ? 0
    : r === 0
    ? gap / n
    : gap * r / (Math.pow(1 + r, n) - 1);

  const chartData = useMemo(() => {
    const localR = returnRate / 100 / 12;
    return Array.from({ length: yearsLeft + 1 }, (_, y) => {
      const months = y * 12;
      const fvS = currentSavings * Math.pow(1 + localR, months);
      const fvM = localR === 0 ? monthly * months : monthly * ((Math.pow(1 + localR, months) - 1) / localR);
      return {
        age: currentAge + y,
        projected: Math.round(fvS + fvM),
        target: Math.round(targetNestEgg),
      };
    });
  }, [currentAge, currentSavings, monthly, returnRate, yearsLeft, targetNestEgg]);

  const animProjected = useAnimatedNumber(projected);

  return (
    <ToolCard icon={Target} title="Retirement Planner" desc="See if you're on track to retire on your terms">
      <div className="grid lg:grid-cols-[1fr_1.6fr] gap-8">
        {/* Inputs */}
        <div className="space-y-5">
          <SliderField label="Current age" icon={<Calendar size={14} className="text-gray-500" />}
            value={currentAge} min={18} max={70} step={1} onChange={setCurrentAge}
            display={`${currentAge} yrs`} minLabel="18" maxLabel="70" />
          <SliderField label="Target retirement age" icon={<Calendar size={14} className="text-gray-500" />}
            value={retirementAge} min={Math.max(currentAge + 1, 40)} max={80} step={1} onChange={setRetirementAge}
            display={`${retirementAge} yrs`} minLabel="40" maxLabel="80" />
          <SliderField label="Current savings" icon={<DollarSign size={14} className="text-gray-500" />}
            value={currentSavings} min={0} max={1000000} step={5000} onChange={setCurrentSavings}
            display={fmtFull(currentSavings)} minLabel="$0" maxLabel="$1M" />
          <SliderField label="Monthly contribution" icon={<DollarSign size={14} className="text-gray-500" />}
            value={monthly} min={0} max={10000} step={100} onChange={setMonthly}
            display={`${fmtFull(monthly)}/mo`} minLabel="$0" maxLabel="$10K" />
          <SliderField label="Desired monthly income" icon={<DollarSign size={14} className="text-gray-500" />}
            value={targetMonthlyIncome} min={1000} max={20000} step={500} onChange={setTargetMonthlyIncome}
            display={`${fmtFull(targetMonthlyIncome)}/mo`} minLabel="$1K" maxLabel="$20K" />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                <Percent size={14} className="text-gray-500" /> Expected return
              </label>
              <span className="text-sm font-semibold text-brand-400">{returnRate}%</span>
            </div>
            <div className="flex gap-2 mb-3">
              {RETIREMENT_RETURN_PRESETS.map((p) => (
                <button key={p.value} onClick={() => setReturnRate(p.value)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    returnRate === p.value ? "border-brand-400/50 bg-brand-400/8 text-brand-400" : "border-white/8 text-gray-400 hover:border-white/20"
                  }`}>{p.label} {p.value}%</button>
              ))}
            </div>
            <input type="range" min={3} max={15} step={0.5} value={returnRate}
              onChange={(e) => setReturnRate(Number(e.target.value))}
              className="w-full accent-[#4ADE80] h-1.5 rounded-full cursor-pointer" />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>3%</span><span>15%</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col gap-5">
          <HeroCard
            label={`Projected nest egg at age ${retirementAge}`}
            value={fmtFull(animProjected)}
            sub={`Target: ${fmtFull(targetNestEgg)} (4% withdrawal rule)`}
          />

          {/* On-track meter */}
          <div className="rounded-xl bg-surface-dark border border-white/5 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-300">Goal progress</span>
              <span className={`text-sm font-semibold ${onTrack ? "text-gain" : "text-warn"}`}>
                {onTrack ? "✓ On track" : `${progressPct.toFixed(0)}% of goal`}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-surface-dark-tertiary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${onTrack ? "bg-gain" : "bg-warn"}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <ToolMetric label="Years left" value={`${yearsLeft} yrs`} />
            <ToolMetric
              label={onTrack ? "Surplus" : "Shortfall"}
              value={fmt(Math.abs(projected - targetNestEgg))}
              color={onTrack ? "text-gain" : "text-loss"}
            />
            <ToolMetric
              label="Monthly needed"
              value={fmt(Math.round(monthlyNeeded))}
              color={monthly >= monthlyNeeded ? "text-gain" : "text-warn"}
            />
          </div>

          <div className="h-52 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="age" tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `Age ${v}`} interval={Math.ceil(yearsLeft / 5)} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmt} width={52} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="projected" stroke="#4ADE80" strokeWidth={2} dot={false} name="Projected" animationDuration={600} />
                <Line type="monotone" dataKey="target" stroke="#F59E0B" strokeWidth={1.5} strokeDasharray="5 3" dot={false} name="Target" animationDuration={600} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl bg-surface-dark border border-white/5 p-4 text-sm">
            {onTrack ? (
              <span className="text-gray-500">
                You&apos;re <span className="text-gain font-semibold">ahead of target</span> — your nest egg covers{" "}
                <span className="text-gain font-semibold">
                  {Math.round(projected / (targetMonthlyIncome * 12))} years
                </span>{" "}
                of your desired income using the 4% rule.
              </span>
            ) : (
              <span className="text-gray-500">
                To hit your goal, you need{" "}
                <span className="text-warn font-semibold">{fmtFull(Math.round(monthlyNeeded))}/mo</span> total.
                {monthly < monthlyNeeded && (
                  <> Increase contributions by{" "}
                    <span className="text-warn font-semibold">{fmtFull(Math.round(monthlyNeeded - monthly))}/mo</span> — or consider a higher-return strategy.
                  </>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </ToolCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CALCULATOR 3: DRIP Calculator
// ══════════════════════════════════════════════════════════════════════════

const YIELD_PRESETS = [
  { label: "REITs avg", value: 4 },
  { label: "Div ETF", value: 6 },
  { label: "High yield", value: 8 },
];

function DRIPCalculator() {
  const [investment, setInvestment] = useState(10000);
  const [dividendYield, setDividendYield] = useState(4);
  const [priceGrowth, setPriceGrowth] = useState(5);
  const [years, setYears] = useState(20);

  const chartData = useMemo(() => {
    const points = [];
    let noDrip = investment;
    let drip = investment;
    let totalReinvested = 0;
    let totalCashDivs = 0;

    for (let y = 0; y <= years; y++) {
      points.push({
        year: y,
        withDRIP: Math.round(drip),
        withoutDRIP: Math.round(noDrip),
        cashDividends: Math.round(totalCashDivs),
      });

      if (y < years) {
        const noDripDiv = noDrip * (dividendYield / 100);
        const dripDiv = drip * (dividendYield / 100);
        noDrip = noDrip * (1 + priceGrowth / 100);
        drip = (drip + dripDiv) * (1 + priceGrowth / 100);
        totalReinvested += dripDiv;
        totalCashDivs += noDripDiv;
      }
    }
    return { points, totalReinvested, totalCashDivs };
  }, [investment, dividendYield, priceGrowth, years]);

  const { points, totalReinvested, totalCashDivs } = chartData;
  const last = points[points.length - 1];
  const dripBonus = (last?.withDRIP ?? 0) - (last?.withoutDRIP ?? 0);
  const dripBonusPct = (last?.withoutDRIP ?? 0) > 0
    ? (dripBonus / (last?.withoutDRIP ?? 1)) * 100
    : 0;

  const animDRIP = useAnimatedNumber(last?.withDRIP ?? 0);
  const animNoDRIP = useAnimatedNumber(last?.withoutDRIP ?? 0);

  return (
    <ToolCard icon={RefreshCw} title="DRIP Calculator" desc="See how reinvesting dividends turbocharges long-term growth">
      <div className="grid lg:grid-cols-[1fr_1.6fr] gap-8">
        {/* Inputs */}
        <div className="space-y-5">
          <SliderField label="Initial investment" icon={<DollarSign size={14} className="text-gray-500" />}
            value={investment} min={1000} max={500000} step={1000} onChange={setInvestment}
            display={fmtFull(investment)} minLabel="$1K" maxLabel="$500K" />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                <Percent size={14} className="text-gray-500" /> Dividend yield
              </label>
              <span className="text-sm font-semibold text-brand-400">{dividendYield}%</span>
            </div>
            <div className="flex gap-2 mb-3">
              {YIELD_PRESETS.map((p) => (
                <button key={p.value} onClick={() => setDividendYield(p.value)}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                    dividendYield === p.value ? "border-brand-400/50 bg-brand-400/8 text-brand-400" : "border-white/8 text-gray-400 hover:border-white/20"
                  }`}>{p.label} {p.value}%</button>
              ))}
            </div>
            <input type="range" min={0.5} max={15} step={0.5} value={dividendYield}
              onChange={(e) => setDividendYield(Number(e.target.value))}
              className="w-full accent-[#4ADE80] h-1.5 rounded-full cursor-pointer" />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>0.5%</span><span>15%</span>
            </div>
          </div>

          <SliderField label="Annual price growth" icon={<TrendingUp size={14} className="text-gray-500" />}
            value={priceGrowth} min={0} max={20} step={0.5} onChange={setPriceGrowth}
            display={`${priceGrowth}%`} minLabel="0%" maxLabel="20%" />
          <SliderField label="Time horizon" icon={<Calendar size={14} className="text-gray-500" />}
            value={years} min={1} max={40} step={1} onChange={setYears}
            display={`${years} years`} minLabel="1 yr" maxLabel="40 yrs" />

          <div className="rounded-xl bg-surface-dark border border-white/5 p-4 space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">How DRIP works</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              Instead of receiving dividends as cash, they automatically buy more shares — which then earn their own dividends. A compounding snowball effect.
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative rounded-2xl bg-gradient-to-br from-brand-400/10 via-brand-400/5 to-transparent border border-brand-400/20 p-4 overflow-hidden">
              <div className="absolute inset-0 dot-grid opacity-10" />
              <div className="relative">
                <p className="text-[10px] font-semibold text-brand-400 uppercase tracking-wider mb-1">With DRIP</p>
                <p className="text-2xl font-heading font-bold text-gray-100 tabular-nums">{fmt(animDRIP)}</p>
              </div>
            </div>
            <div className="rounded-2xl bg-surface-dark border border-white/8 p-4">
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Without DRIP</p>
              <p className="text-2xl font-heading font-bold text-gray-300 tabular-nums">{fmt(animNoDRIP)}</p>
              <p className="text-[10px] text-gray-600 mt-1">+{fmt(Math.round(totalCashDivs))} cash divs</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <ToolMetric label="DRIP bonus" value={fmt(dripBonus)} color="text-gain" />
            <ToolMetric label="Extra return" value={`+${dripBonusPct.toFixed(0)}%`} color="text-gain" />
            <ToolMetric label="Divs reinvested" value={fmt(Math.round(totalReinvested))} />
          </div>

          <div className="h-52 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="year" tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `Yr ${v}`} interval={Math.ceil(years / 5)} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmt} width={52} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="withDRIP" stroke="#4ADE80" strokeWidth={2.5} dot={false} name="With DRIP" animationDuration={600} />
                <Line type="monotone" dataKey="withoutDRIP" stroke="#6B7280" strokeWidth={1.5} strokeDasharray="4 3" dot={false} name="Without DRIP" animationDuration={600} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl bg-surface-dark border border-white/5 p-4 text-sm">
            <span className="text-gray-500">Reinvesting your <span className="text-brand-400 font-semibold">{dividendYield}%</span> dividend yield generates an extra </span>
            <span className="text-gain font-semibold">{fmt(dripBonus)}</span>
            <span className="text-gray-500"> over {years} years — a </span>
            <span className="text-gain font-semibold">{dripBonusPct.toFixed(0)}% bonus</span>
            <span className="text-gray-500"> vs. taking dividends as cash. Without DRIP you&apos;d collect <span className="text-gray-300 font-semibold">{fmt(Math.round(totalCashDivs))}</span> in dividends instead.</span>
          </div>
        </div>
      </div>
    </ToolCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// CALCULATOR 4: Risk / Reward Analyzer
// ══════════════════════════════════════════════════════════════════════════

const STOCK_RETURN = 0.105;
const BOND_RETURN = 0.040;
const STOCK_SIGMA = 0.150;
const BOND_SIGMA = 0.060;
const CORR = -0.1;

function calcPortfolio(stockFrac: number) {
  const b = 1 - stockFrac;
  const mu = stockFrac * STOCK_RETURN + b * BOND_RETURN;
  const sigma = Math.sqrt(
    Math.pow(stockFrac * STOCK_SIGMA, 2) +
    Math.pow(b * BOND_SIGMA, 2) +
    2 * CORR * stockFrac * STOCK_SIGMA * b * BOND_SIGMA
  );
  const sharpe = sigma > 0 ? (mu - BOND_RETURN) / sigma : 0;
  return { mu, sigma, sharpe };
}

const ALLOC_PRESETS = [
  { label: "All Stocks", key: "allStocks", stocks: 1.0, color: "#4ADE80" },
  { label: "80 / 20", key: "mix8020", stocks: 0.8, color: "#60A5FA" },
  { label: "60 / 40", key: "mix6040", stocks: 0.6, color: "#F59E0B" },
  { label: "All Bonds", key: "allBonds", stocks: 0.0, color: "#9CA3AF" },
] as const;

function RiskRewardAnalyzer() {
  const [stockPct, setStockPct] = useState(70);
  const [investment, setInvestment] = useState(50000);
  const [years, setYears] = useState(20);

  const metrics = calcPortfolio(stockPct / 100);
  const riskLabel = metrics.sigma < 0.08 ? "Low" : metrics.sigma < 0.13 ? "Moderate" : "High";
  const riskColor = metrics.sigma < 0.08 ? "text-gain" : metrics.sigma < 0.13 ? "text-warn" : "text-loss";

  const chartData = useMemo(() => {
    return Array.from({ length: years + 1 }, (_, y) => {
      const row: Record<string, number> = { year: y };
      ALLOC_PRESETS.forEach(({ key, stocks }) => {
        const { mu } = calcPortfolio(stocks);
        row[key] = Math.round(investment * Math.pow(1 + mu, y));
      });
      row["custom"] = Math.round(investment * Math.pow(1 + metrics.mu, y));
      return row;
    });
  }, [investment, years, metrics.mu]);

  const projected = Math.round(investment * Math.pow(1 + metrics.mu, years));
  const animValue = useAnimatedNumber(projected);

  // Whether custom allocation matches a preset
  const matchesPreset = ALLOC_PRESETS.some(p => Math.round(p.stocks * 100) === stockPct);

  return (
    <ToolCard icon={Scale} title="Risk / Reward Analyzer" desc="Find your optimal allocation between stocks and bonds">
      <div className="grid lg:grid-cols-[1fr_1.6fr] gap-8">
        {/* Inputs */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">Stock allocation</label>
              <span className="text-sm font-semibold text-brand-400">{stockPct}% stocks · {100 - stockPct}% bonds</span>
            </div>
            <input type="range" min={0} max={100} step={5} value={stockPct}
              onChange={(e) => setStockPct(Number(e.target.value))}
              className="w-full accent-[#4ADE80] h-1.5 rounded-full cursor-pointer" />
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span>100% Bonds</span><span>100% Stocks</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {ALLOC_PRESETS.map(({ label, stocks, key }) => (
              <button key={key} onClick={() => setStockPct(Math.round(stocks * 100))}
                className={`py-2 px-3 rounded-lg border text-xs font-medium text-left transition-all ${
                  stockPct === Math.round(stocks * 100)
                    ? "border-brand-400/50 bg-brand-400/8 text-brand-400"
                    : "border-white/8 text-gray-400 hover:border-white/20"
                }`}>{label}</button>
            ))}
          </div>

          <SliderField label="Initial investment" icon={<DollarSign size={14} className="text-gray-500" />}
            value={investment} min={1000} max={500000} step={5000} onChange={setInvestment}
            display={fmtFull(investment)} minLabel="$1K" maxLabel="$500K" />
          <SliderField label="Time horizon" icon={<Calendar size={14} className="text-gray-500" />}
            value={years} min={1} max={40} step={1} onChange={setYears}
            display={`${years} years`} minLabel="1 yr" maxLabel="40 yrs" />

          {/* Portfolio metrics panel */}
          <div className="rounded-xl bg-surface-dark border border-white/5 p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Portfolio metrics</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[10px] text-gray-600 mb-0.5">Exp. return</p>
                <p className="text-sm font-semibold text-brand-400">{(metrics.mu * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 mb-0.5">Volatility (σ)</p>
                <p className={`text-sm font-semibold ${riskColor}`}>{(metrics.sigma * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-600 mb-0.5">Sharpe</p>
                <p className="text-sm font-semibold text-gray-300">{metrics.sharpe.toFixed(2)}</p>
              </div>
            </div>
            <div>
              <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
                <div
                  className="h-full bg-gradient-to-r from-gain via-warn to-loss transition-all duration-500"
                  style={{ width: `${stockPct}%` }}
                />
              </div>
              <p className={`text-xs text-center font-medium mt-1.5 ${riskColor}`}>Risk: {riskLabel}</p>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="flex flex-col gap-5">
          <HeroCard
            label={`Expected value in ${years} years`}
            value={fmtFull(animValue)}
            sub={`At ${(metrics.mu * 100).toFixed(1)}% expected annual return`}
          />

          <div className="grid grid-cols-3 gap-3">
            <ToolMetric label="Stocks" value={`${stockPct}%`} color="text-brand-400" />
            <ToolMetric label="Bonds" value={`${100 - stockPct}%`} color="text-info" />
            <ToolMetric label="Sharpe ratio" value={metrics.sharpe.toFixed(2)} color={metrics.sharpe >= 0.4 ? "text-gain" : "text-warn"} />
          </div>

          <div className="h-52 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="year" tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} axisLine={false}
                  tickFormatter={(v) => `Yr ${v}`} interval={Math.ceil(years / 5)} />
                <YAxis tick={{ fill: "#6B7280", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={fmt} width={52} />
                <Tooltip content={<ChartTooltip />} />
                {ALLOC_PRESETS.map(({ key, label, color }) => (
                  <Line key={key} type="monotone" dataKey={key} stroke={color} strokeWidth={1.5}
                    strokeDasharray="4 2" dot={false} name={label} animationDuration={600} />
                ))}
                {!matchesPreset && (
                  <Line type="monotone" dataKey="custom" stroke="#FFFFFF" strokeWidth={2.5}
                    dot={false} name="Your Portfolio" animationDuration={600} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded-xl bg-surface-dark border border-white/5 p-4 text-sm">
            <span className="text-gray-500">
              A <span className="text-brand-400 font-semibold">{stockPct}/{100 - stockPct}</span> stocks/bonds split targets{" "}
              <span className="text-brand-400 font-semibold">{(metrics.mu * 100).toFixed(1)}% annual return</span> with{" "}
              <span className={`${riskColor} font-semibold`}>{riskLabel.toLowerCase()} volatility</span> (σ = {(metrics.sigma * 100).toFixed(1)}%).{" "}
            </span>
            {metrics.sharpe >= 0.40 ? (
              <span className="text-gray-500">
                A Sharpe of <span className="text-gain font-semibold">{metrics.sharpe.toFixed(2)}</span> means solid risk-adjusted returns — you&apos;re getting paid well for the risk you take.
              </span>
            ) : (
              <span className="text-gray-500">
                A Sharpe of <span className="text-warn font-semibold">{metrics.sharpe.toFixed(2)}</span> is low — consider shifting more to stocks for better risk-adjusted returns.
              </span>
            )}
          </div>
        </div>
      </div>
    </ToolCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// MAIN PAGE — Tab switcher
// ══════════════════════════════════════════════════════════════════════════

type ToolId = "compound" | "retirement" | "drip" | "risk";

const TOOLS: Array<{ id: ToolId; name: string; icon: React.ElementType; shortName: string }> = [
  { id: "compound", name: "Investment Calculator", shortName: "Invest", icon: TrendingUp },
  { id: "retirement", name: "Retirement Planner", shortName: "Retire", icon: Target },
  { id: "drip", name: "DRIP Calculator", shortName: "DRIP", icon: RefreshCw },
  { id: "risk", name: "Risk / Reward", shortName: "Risk", icon: Scale },
];

export default function ToolsPage() {
  const [activeTool, setActiveTool] = useState<ToolId>("compound");

  return (
    <div className="min-h-screen bg-surface-dark px-4 py-6 lg:px-8 lg:py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-gray-100">Tools</h1>
        <p className="text-sm text-gray-500 mt-1">Powerful calculators to plan your financial future</p>
      </div>

      {/* Tool tab switcher — scrollable on mobile */}
      <div className="flex gap-2 mb-6 overflow-x-auto scrollbar-hide pb-0.5">
        {TOOLS.map(({ id, name, shortName, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTool(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all whitespace-nowrap flex-shrink-0 text-sm font-medium ${
              activeTool === id
                ? "bg-brand-400/10 border-brand-400/30 text-brand-400"
                : "border-white/8 text-gray-400 hover:border-white/20 hover:text-gray-200 bg-surface-dark-secondary"
            }`}
          >
            <Icon size={16} />
            <span className="hidden sm:inline">{name}</span>
            <span className="sm:hidden">{shortName}</span>
          </button>
        ))}
      </div>

      {/* Active calculator */}
      {activeTool === "compound" && <CompoundCalculator />}
      {activeTool === "retirement" && <RetirementCalculator />}
      {activeTool === "drip" && <DRIPCalculator />}
      {activeTool === "risk" && <RiskRewardAnalyzer />}
    </div>
  );
}
