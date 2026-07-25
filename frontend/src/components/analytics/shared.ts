"use client";

// Shared analytics plumbing: data hook, formatters, presets. Three presentation
// variants (Tape / Panes / Broadsheet) render this identical data so they can be
// compared fairly on the same numbers.

import { useState, useEffect, useCallback, useRef } from "react";
import { portfolioAPI, PortfolioAnalytics, HistoryPoint, AnalyticsMarket } from "@/services/api";

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
