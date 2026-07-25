"use client";

// Shared analytics plumbing: data hook, formatters, presets. Three presentation
// variants (Tape / Panes / Broadsheet) render this identical data so they can be
// compared fairly on the same numbers.

import { useState, useEffect, useCallback, useRef } from "react";
import { portfolioAPI, PortfolioAnalytics, HistoryPoint, AnalyticsMarket, PortfolioOverview } from "@/services/api";

// ── Dates ──
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export type Preset = "1d" | "5d" | "1m" | "6m" | "ytd" | "1y" | "5y" | "all" | "custom";

export const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: "1d", label: "1D" }, { id: "5d", label: "5D" }, { id: "1m", label: "1M" },
  { id: "6m", label: "6M" }, { id: "ytd", label: "YTD" }, { id: "1y", label: "1Y" },
  { id: "5y", label: "5Y" }, { id: "all", label: "All" }, { id: "custom", label: "Custom" },
];

export const MARKETS: Array<{ id: AnalyticsMarket; label: string }> = [
  { id: "all", label: "All" }, { id: "israeli", label: "Israeli" }, { id: "world", label: "World" },
];

export function presetDates(preset: Preset): { start: string; end: string } {
  const today = new Date();
  const end = toISODate(today);
  switch (preset) {
    case "1d": return { start: end, end };
    case "5d": { const s = new Date(today); s.setDate(s.getDate() - 7); return { start: toISODate(s), end }; }
    case "1m": { const s = new Date(today); s.setMonth(s.getMonth() - 1); return { start: toISODate(s), end }; }
    case "6m": { const s = new Date(today); s.setMonth(s.getMonth() - 6); return { start: toISODate(s), end }; }
    case "ytd": return { start: `${today.getFullYear()}-01-01`, end };
    case "1y": { const s = new Date(today); s.setFullYear(s.getFullYear() - 1); return { start: toISODate(s), end }; }
    case "5y": { const s = new Date(today); s.setFullYear(s.getFullYear() - 5); return { start: toISODate(s), end }; }
    case "all": return { start: "2000-01-01", end };
    default: return { start: `${today.getFullYear()}-01-01`, end };
  }
}

// ── Formatters ──
export function fmtILS(v: number | null | undefined, short = false, decimals = 2): string {
  if (v == null) return "—";
  const abs = Math.abs(v);
  if (short && abs >= 1_000_000) return `₪${(v / 1_000_000).toFixed(decimals)}M`;
  if (short && abs >= 1_000) return `₪${(v / 1_000).toFixed(decimals)}K`;
  return `₪${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}
export function signedILS(v: number | null | undefined, short = false, decimals = 2): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${fmtILS(v, short, decimals)}`;
}
export function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(decimals)}%`;
}
export function fmtDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}
export function fmtMonth(m: string | undefined): string {
  if (!m) return "—";
  const [y, mo] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(mo, 10) - 1]} ${y}`;
}
export function fmtShortDate(s: string | null): string {
  if (!s) return "";
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "2-digit" });
}

// ── All-time overview (17 measures) — shared by Panes + Broadsheet variants ──
export function useOverview(refreshKey?: string | null) {
  const [overview, setOverview] = useState<PortfolioOverview | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    portfolioAPI.getOverview()
      .then((r) => !cancelled && setOverview(r))
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [refreshKey]);
  return { overview, failed };
}

export type Tone = "ink" | "gain" | "loss" | "warn";
export interface Measure { label: string; value: string; sub?: string; tone?: Tone; }
export interface Argument { key: string; title: string; hero: string; heroTone: Tone; heroSub: string; sentence: string; rows: Measure[]; }

function ils0(v: number | null | undefined) { return fmtILS(v, true); }

/** Groups the 17 all-time measures into four arguments, with an editorial sentence each. */
export function buildArguments(o: PortfolioOverview): Argument[] {
  const plPos = o.total_pl.ils >= 0;
  const winPos = (o.win_rate.rate_pct ?? 0) >= 50;
  const topHeavy = (o.concentration.top_pct ?? 0) > 15;
  const irr = o.annualized_irr_pct;
  return [
    {
      key: "growth",
      title: "Growth",
      hero: o.total_pl.pct != null ? `${plPos ? "+" : ""}${o.total_pl.pct.toFixed(2)}%` : "—",
      heroTone: plPos ? "gain" : "loss",
      heroSub: `${plPos ? "+" : ""}${ils0(o.total_pl.ils)} incl. dividends`,
      sentence: `Up ${ils0(o.total_pl.ils)} including dividends${irr != null ? ` — an annualised ${irr.toFixed(2)}% on the money you actually had at work` : ""}.`,
      rows: [
        { label: "Net invested", value: fmtILS(o.invested.net_invested_ils, true) },
        { label: "Current value", value: fmtILS(o.invested.current_value_ils, true) },
        { label: "IRR · money-weighted", value: irr != null ? `${irr >= 0 ? "+" : ""}${irr.toFixed(2)}%/yr` : "—" },
        { label: "Best month", value: o.best_month ? `+${o.best_month.return_pct.toFixed(1)}%` : "—", sub: fmtMonth(o.best_month?.month) },
        { label: "Dividends all-time", value: fmtILS(o.dividends.all_time_ils, true), sub: o.dividends.ttm_yield_pct != null ? `${o.dividends.ttm_yield_pct}% yield` : undefined },
      ],
    },
    {
      key: "risk",
      title: "Risk",
      hero: `${o.max_drawdown.pct.toFixed(1)}%`,
      heroTone: "loss",
      heroSub: "max drawdown",
      sentence: `Your worst peak-to-trough fall was ${o.max_drawdown.pct.toFixed(1)}%${o.volatility_annual_pct != null ? `; volatility runs about ${o.volatility_annual_pct.toFixed(1)}% a year` : ""}.`,
      rows: [
        { label: "Worst month", value: o.worst_month ? `${o.worst_month.return_pct.toFixed(1)}%` : "—", sub: fmtMonth(o.worst_month?.month) },
        { label: "Volatility", value: o.volatility_annual_pct != null ? `${o.volatility_annual_pct.toFixed(1)}%/yr` : "—" },
        { label: "Beta · S&P · TA-125", value: o.beta.sp500 != null ? o.beta.sp500.toFixed(2) : "—", sub: o.beta.ta125 != null ? `${o.beta.ta125.toFixed(2)} vs TA-125` : undefined },
        { label: "Concentration · top", value: o.concentration.top_symbol ? `${o.concentration.top_pct}%` : "—", sub: o.concentration.top_symbol ?? undefined, tone: topHeavy ? "warn" : "ink" },
        { label: "Exposure · World · IL", value: o.exposure.world_pct != null ? `${o.exposure.world_pct}%` : "—", sub: o.exposure.israeli_pct != null ? `${o.exposure.israeli_pct}% Israeli` : undefined },
      ],
    },
    {
      key: "discipline",
      title: "Discipline",
      hero: o.win_rate.rate_pct != null ? `${o.win_rate.rate_pct.toFixed(1)}%` : "—",
      heroTone: winPos ? "gain" : "loss",
      heroSub: `${o.win_rate.wins}W / ${o.win_rate.losses}L`,
      sentence: `${o.win_rate.wins} winning closes against ${o.win_rate.losses} losing ones${o.holding_period.avg_days_winners != null && o.holding_period.avg_days_losers != null ? `, holding winners ${Math.round(o.holding_period.avg_days_losers - o.holding_period.avg_days_winners)} days less than losers` : ""}.`,
      rows: [
        { label: "Profit factor", value: `${o.win_rate.profit_factor ?? "—"}` },
        { label: "Avg hold · winners", value: o.holding_period.avg_days_winners != null ? `${Math.round(o.holding_period.avg_days_winners)}d` : "—" },
        { label: "Avg hold · losers", value: o.holding_period.avg_days_losers != null ? `${Math.round(o.holding_period.avg_days_losers)}d` : "—" },
        { label: "Turnover", value: o.turnover_annual_pct != null ? `${o.turnover_annual_pct.toFixed(0)}%/yr` : "—" },
        { label: "Best · worst stock", value: o.best_stock ? o.best_stock.symbol : "—", sub: o.worst_stock ? o.worst_stock.symbol : undefined },
      ],
    },
    {
      key: "cost",
      title: "Cost",
      hero: fmtILS(o.costs.fees_ils + o.costs.taxes_ils, true),
      heroTone: "warn",
      heroSub: o.costs.pct_of_profit != null ? `${o.costs.pct_of_profit.toFixed(1)}% of profit` : "fees + tax",
      sentence: `Fees and tax have taken ${o.costs.pct_of_profit != null ? `${o.costs.pct_of_profit.toFixed(1)}% of your profit` : `${fmtILS(o.costs.fees_ils + o.costs.taxes_ils, true)}`}.`,
      rows: [
        { label: "Commissions", value: fmtILS(o.costs.fees_ils, true) },
        { label: "Capital-gains tax", value: fmtILS(o.costs.taxes_ils, true) },
        { label: "Bought · all-time", value: fmtILS(o.invested.total_buys_ils, true) },
        { label: "Sold · all-time", value: fmtILS(o.invested.total_sells_ils, true) },
        { label: "Days active", value: o.days_active.toLocaleString() },
      ],
    },
  ];
}

// ── Data hook — all state, fetching, live polling, derived values ──
export function useAnalyticsData() {
  const [preset, setPreset] = useState<Preset>("1m");
  const [market, setMarket] = useState<AnalyticsMarket>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PortfolioAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [benchmarks, setBenchmarks] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [, forceTick] = useState(0);

  const activeDates = preset === "custom" ? { start: customStart, end: customEnd } : presetDates(preset);

  const selectionRef = useRef({ start: "", end: "", market, benchmarks });
  selectionRef.current = { ...activeDates, market, benchmarks };

  const fetchAnalytics = useCallback(async (start: string, end: string, mk: AnalyticsMarket, silent = false) => {
    if (!start || !end || start > end) return;
    if (!silent) { setLoading(true); setError(null); }
    try {
      const result = await portfolioAPI.getAnalytics(start, end, mk);
      setData(result);
    } catch (err: any) {
      if (!silent) setError(err?.response?.data?.detail ?? "Failed to load analytics");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (start: string, end: string, mk: AnalyticsMarket, bms: string[], silent = false) => {
    if (!start || !end || start > end) return;
    if (!silent) { setHistoryLoading(true); setHistoryPoints(null); }
    try {
      const result = await portfolioAPI.getHistory(start, end, mk, bms.join(","));
      setHistoryPoints(result.points);
    } catch {
      if (!silent) setHistoryPoints([]);
    } finally {
      if (!silent) setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (preset !== "custom") {
      const { start, end } = presetDates(preset);
      fetchAnalytics(start, end, market);
      fetchHistory(start, end, market, benchmarks);
    } else if (customStart && customEnd && customStart <= customEnd) {
      fetchAnalytics(customStart, customEnd, market);
      fetchHistory(customStart, customEnd, market, benchmarks);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, market, benchmarks, fetchAnalytics, fetchHistory]);

  const handleCustomApply = () => {
    if (customStart && customEnd && customStart <= customEnd) {
      fetchAnalytics(customStart, customEnd, market);
      fetchHistory(customStart, customEnd, market, benchmarks);
    }
  };

  const toggleBenchmark = (id: string) =>
    setBenchmarks((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));

  const refetchCurrent = useCallback(() => {
    const { start, end, market: mk, benchmarks: bms } = selectionRef.current;
    fetchAnalytics(start, end, mk, true);
    fetchHistory(start, end, mk, bms, true);
  }, [fetchAnalytics, fetchHistory]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let known: string | null = null;
    const tick = async () => {
      try {
        const s = await portfolioAPI.getStatus();
        if (cancelled) return;
        setLastUpdated(s.last_updated);
        const includesToday = selectionRef.current.end >= toISODate(new Date());
        if (known && s.last_updated && s.last_updated !== known && includesToday) refetchCurrent();
        known = s.last_updated;
      } catch { /* transient */ }
      forceTick((t) => t + 1);
      if (!cancelled) timer = setTimeout(tick, 60_000);
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [refetchCurrent]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const r = await portfolioAPI.refresh();
      if (r.last_updated) setLastUpdated(r.last_updated);
      refetchCurrent();
    } catch { /* keep last data */ } finally {
      setRefreshing(false);
    }
  };

  const updatedAgo = (() => {
    if (!lastUpdated) return null;
    const mins = Math.max(0, Math.round((Date.now() - new Date(lastUpdated).getTime()) / 60000));
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
  })();

  const periodLabel = data
    ? `${fmtDate(data.period_start)} – ${fmtDate(data.period_end)}`
    : activeDates.start && activeDates.end ? `${fmtDate(activeDates.start)} – ${fmtDate(activeDates.end)}` : "";

  return {
    // selection
    preset, setPreset, market, setMarket,
    customStart, setCustomStart, customEnd, setCustomEnd, showCustom, setShowCustom, handleCustomApply,
    benchmarks, toggleBenchmark,
    // data
    loading, data, error, historyPoints, historyLoading,
    // live
    refreshing, handleManualRefresh, updatedAgo, lastUpdated,
    // derived
    activeDates, periodLabel,
  };
}
