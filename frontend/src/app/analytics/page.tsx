"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { portfolioAPI, PortfolioAnalytics, AnalyticsTransaction, HistoryPoint, AnalyticsMarket } from "@/services/api";
import PortfolioHistoryChart from "@/components/PortfolioHistoryChart";
import MonthlyReturnsStrip from "@/components/MonthlyReturnsStrip";
import DividendIncomeChart from "@/components/DividendIncomeChart";
import StockDrilldownModal from "@/components/StockDrilldownModal";
import AllTimeOverview from "@/components/AllTimeOverview";
import { TapeSection, StatRow, Fig, Sub } from "@/components/tape/Tape";

// ── Date helpers ──────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  // Use local date parts to avoid UTC timezone shift for Israeli users (UTC+3)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Preset = "1d" | "5d" | "1m" | "6m" | "ytd" | "1y" | "5y" | "all" | "custom";

const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: "1d", label: "1D" },
  { id: "5d", label: "5D" },
  { id: "1m", label: "1M" },
  { id: "6m", label: "6M" },
  { id: "ytd", label: "YTD" },
  { id: "1y", label: "1Y" },
  { id: "5y", label: "5Y" },
  { id: "all", label: "All" },
  { id: "custom", label: "Custom" },
];

function presetDates(preset: Preset): { start: string; end: string } {
  const today = new Date();
  const end = toISODate(today);
  switch (preset) {
    case "1d":
      return { start: end, end };
    case "5d": {
      const s = new Date(today); s.setDate(s.getDate() - 7);   // ~5 trading days
      return { start: toISODate(s), end };
    }
    case "1m": {
      const s = new Date(today); s.setMonth(s.getMonth() - 1);
      return { start: toISODate(s), end };
    }
    case "6m": {
      const s = new Date(today); s.setMonth(s.getMonth() - 6);
      return { start: toISODate(s), end };
    }
    case "ytd":
      return { start: `${today.getFullYear()}-01-01`, end };
    case "1y": {
      const s = new Date(today); s.setFullYear(s.getFullYear() - 1);
      return { start: toISODate(s), end };
    }
    case "5y": {
      const s = new Date(today); s.setFullYear(s.getFullYear() - 5);
      return { start: toISODate(s), end };
    }
    case "all":
      // backend clamps to the first transaction date
      return { start: "2000-01-01", end };
    default:
      return { start: `${today.getFullYear()}-01-01`, end };
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtILS(v: number | null | undefined, short = false, decimals = 2): string {
  if (v == null) return "—";
  const abs = Math.abs(v);
  if (short && abs >= 1_000_000) return `₪${(v / 1_000_000).toFixed(decimals)}M`;
  if (short && abs >= 1_000) return `₪${(v / 1_000).toFixed(decimals)}K`;
  return `₪${v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

function signedILS(v: number | null | undefined, short = false, decimals = 2): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${fmtILS(v, short, decimals)}`;
}

function fmtPct(v: number | null | undefined, decimals = 2): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(decimals)}%`;
}

function fmtDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Transactions table ──────────────────────────────────────────────────────────

// BUY/SELL are the one sanctioned in-table use of colour; everything else is ink.
const TYPE_TONE: Record<string, string> = {
  BUY: "text-gain",
  SELL: "text-loss",
};

const PAGE_SIZE = 20;

function TxTable({
  transactions,
  onStockClick,
}: {
  transactions: AnalyticsTransaction[];
  onStockClick?: (symbol: string, market: "israeli" | "world") => void;
}) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [marketFilter, setMarketFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [showAll, setShowAll] = useState(false);

  const types = Array.from(new Set(transactions.map((t) => t.type)));
  const filtered = transactions.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (marketFilter !== "all" && t.market !== marketFilter) return false;
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = showAll ? filtered : filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  // Reset to first page when filters change the row set
  useEffect(() => { setPage(0); }, [typeFilter, marketFilter, transactions]);

  if (transactions.length === 0) {
    return <div className="h-8 flex items-center text-[13px] text-label border-b border-rule-row">No transactions in this period.</div>;
  }

  const filterBtn = (active: boolean) =>
    `text-[11px] font-medium transition-colors ${active ? "text-brand-400" : "text-label hover:text-figure"}`;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {["all", "israeli", "world"].map((m) => (
            <button key={m} onClick={() => setMarketFilter(m)} className={filterBtn(marketFilter === m)}>
              {m === "all" ? "All markets" : m === "israeli" ? "Israeli" : "World"}
            </button>
          ))}
        </div>
        <span className="text-rule-section">|</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setTypeFilter("all")} className={filterBtn(typeFilter === "all")}>All types</button>
          {types.map((tp) => (
            <button key={tp} onClick={() => setTypeFilter(tp)} className={filterBtn(typeFilter === tp)}>{tp}</button>
          ))}
        </div>
        <span className="ml-auto text-[11px] text-label tabular-nums">
          {showAll ? `1–${filtered.length}` : `${filtered.length ? safePage * PAGE_SIZE + 1 : 0}–${Math.min((safePage + 1) * PAGE_SIZE, filtered.length)}`} of {filtered.length}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b-2 border-rule-section">
              {["Date", "Instrument", "Type", "Quantity", "Price", "Value", "Value ILS", "Realized P&L", "Market"].map((h, i) => (
                <th
                  key={h}
                  className={`tape-label py-1.5 pr-4 ${i >= 3 && i <= 7 ? "text-right" : "text-left"}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((tx, i) => (
              <tr key={i} className="border-b border-rule-row hover:bg-white/[0.02] transition-colors h-7">
                <td className="pr-4 text-[13px] text-label whitespace-nowrap tabular-nums">{fmtDate(tx.date)}</td>
                <td className="pr-4 whitespace-nowrap">
                  <button onClick={() => onStockClick?.(tx.symbol, tx.market)} className="text-left group" title="View stock details">
                    <span className="text-[13px] font-medium text-figure group-hover:text-brand-400 transition-colors">{tx.symbol}</span>
                    {tx.company_name && tx.company_name !== tx.symbol && (
                      <span className="text-[11px] text-label ms-2 truncate max-w-[160px] inline-block align-bottom" dir="auto">{tx.company_name}</span>
                    )}
                  </button>
                </td>
                <td className={`pr-4 text-[13px] font-semibold ${TYPE_TONE[tx.type] ?? "text-label"}`}>{tx.type}</td>
                <td className="pr-4 text-right text-[13px] text-figure tabular-nums">{tx.quantity ? tx.quantity.toLocaleString() : "—"}</td>
                <td className="pr-4 text-right text-[13px] text-figure tabular-nums">{tx.price ? `${tx.currency === "ILS" ? "₪" : "$"}${tx.price.toFixed(2)}` : "—"}</td>
                <td className="pr-4 text-right text-[13px] text-label tabular-nums">
                  {tx.total_value_ils && tx.currency !== "ILS" && tx.price != null && tx.quantity != null
                    ? `$${(tx.price * tx.quantity).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : ""}
                </td>
                <td className="pr-4 text-right text-[13px] text-figure tabular-nums">{tx.total_value_ils ? fmtILS(tx.total_value_ils) : "—"}</td>
                <td className="pr-4 text-right text-[13px] tabular-nums">
                  {tx.realized_pl
                    ? <span className={tx.realized_pl >= 0 ? "text-gain" : "text-loss"}>{signedILS(tx.realized_pl)}</span>
                    : <span className="text-label">—</span>}
                </td>
                <td className="text-[11px] text-label">{tx.market === "israeli" ? "IL" : "World"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center gap-4 text-[11px]">
          <button onClick={() => setShowAll((v) => !v)} className="text-label hover:text-figure transition-colors">
            {showAll ? "Paginate" : `Show all ${filtered.length}`}
          </button>
          {!showAll && (
            <div className="ml-auto flex items-center gap-3">
              <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0}
                className="text-label hover:text-figure disabled:opacity-30 disabled:cursor-not-allowed transition-colors">‹ Prev</button>
              <span className="text-label tabular-nums">{safePage + 1} / {pageCount}</span>
              <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={safePage >= pageCount - 1}
                className="text-label hover:text-figure disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Next ›</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Market breakdown column ─────────────────────────────────────────────────────

function BreakdownColumn({ title, rows }: { title: string; rows: Array<{ label: string; value: string; tone?: "gain" | "loss" | "warn" }> }) {
  return (
    <div>
      <div className="tape-label mb-1.5">{title}</div>
      {rows.map((r) => (
        <StatRow key={r.label} label={r.label}>
          <Fig tone={r.tone ?? "ink"}>{r.value}</Fig>
        </StatRow>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const MARKETS: Array<{ id: AnalyticsMarket; label: string }> = [
  { id: "all", label: "All" },
  { id: "israeli", label: "Israeli" },
  { id: "world", label: "World" },
];

export default function AnalyticsPage() {
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
  const [benchmarks, setBenchmarks] = useState<string[]>([]);   // 'ta125' | 'sp500'
  const [drilldown, setDrilldown] = useState<{ symbol: string; market: "israeli" | "world" } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [, forceTick] = useState(0);   // re-render for the "Xm ago" label

  const activeDates = preset === "custom"
    ? { start: customStart, end: customEnd }
    : presetDates(preset);

  // Current selection, readable from the polling loop without stale closures
  const selectionRef = useRef({ start: "", end: "", market, benchmarks });
  selectionRef.current = { ...activeDates, market, benchmarks };

  const fetchAnalytics = useCallback(async (start: string, end: string, mk: AnalyticsMarket, silent = false) => {
    if (!start || !end || start > end) return;
    if (!silent) {
      setLoading(true);
      setError(null);
    }
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
    if (!silent) {
      setHistoryLoading(true);
      setHistoryPoints(null);
    }
    try {
      const result = await portfolioAPI.getHistory(start, end, mk, bms.join(","));
      setHistoryPoints(result.points);
    } catch {
      if (!silent) setHistoryPoints([]);
    } finally {
      if (!silent) setHistoryLoading(false);
    }
  }, []);

  // Fetch both when preset, market, or benchmarks change
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
    fetchAnalytics(start, end, mk, true);       // silent: no skeleton flash
    fetchHistory(start, end, mk, bms, true);
  }, [fetchAnalytics, fetchHistory]);

  // ── Live updates: poll price freshness every 60s; when the backend price
  // task has written new prices, refetch — but only if the selected period
  // includes today (historical periods never change)
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
        if (known && s.last_updated && s.last_updated !== known && includesToday) {
          refetchCurrent();
        }
        known = s.last_updated;
      } catch { /* transient — try again next tick */ }
      forceTick((t) => t + 1);            // refresh the "Xm ago" label
      if (!cancelled) timer = setTimeout(tick, 60_000);
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [refetchCurrent]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    try {
      const r = await portfolioAPI.refresh();    // triggers backend price fetch (60s cooldown)
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

  const pv = data?.portfolio_values;
  const returnPositive = pv?.change_ils != null ? pv.change_ils >= 0 : undefined;

  const periodLabel = data
    ? `${fmtDate(data.period_start)} – ${fmtDate(data.period_end)}`
    : activeDates.start && activeDates.end
      ? `${fmtDate(activeDates.start)} – ${fmtDate(activeDates.end)}`
      : "";
  const tradingDays = historyPoints?.length;

  const divGross = data ? data.dividends.israeli_gross_ils + data.dividends.world_gross_ils : 0;
  const divTax = data ? data.dividends.israeli_tax_ils + data.dividends.world_tax_ils : 0;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface-dark px-4 sm:px-6 lg:px-10 py-6">
        {/* ── Chrome: title, live status, controls ── */}
        <div className="pb-3 border-b-2 border-rule-section flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-baseline gap-3">
              <h1 className="text-[22px] font-heading font-bold text-figure leading-none">Analytics</h1>
              {periodLabel && <span className="text-[13px] text-label tabular-nums">{periodLabel}</span>}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-label">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gain opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gain" />
              </span>
              <span>Live{updatedAgo ? ` · ${updatedAgo}` : ""}</span>
              <button onClick={handleManualRefresh} disabled={refreshing} title="Refresh prices now"
                className="p-0.5 rounded text-label hover:text-figure transition-colors disabled:opacity-40">
                <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-5 flex-wrap">
            {/* Market */}
            <div className="flex items-center gap-3">
              {MARKETS.map((m) => (
                <button key={m.id} onClick={() => setMarket(m.id)}
                  className={`text-[12px] font-medium transition-colors ${market === m.id ? "text-brand-400" : "text-label hover:text-figure"}`}>
                  {m.label}
                </button>
              ))}
            </div>
            <span className="text-rule-section">|</span>
            {/* Presets */}
            <div className="flex items-center gap-3 flex-wrap">
              {PRESETS.map((p) => (
                <button key={p.id} onClick={() => { setPreset(p.id); setShowCustom(p.id === "custom"); }}
                  className={`text-[12px] font-medium tabular-nums transition-colors ${preset === p.id ? "text-brand-400" : "text-label hover:text-figure"}`}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {showCustom && preset === "custom" && (
            <div className="flex items-center gap-2 flex-wrap">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)}
                className="px-2 py-1 bg-surface-dark-secondary border border-rule-section rounded text-[12px] text-figure focus:outline-none focus:border-brand-400/50" />
              <span className="text-label text-[12px]">to</span>
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2 py-1 bg-surface-dark-secondary border border-rule-section rounded text-[12px] text-figure focus:outline-none focus:border-brand-400/50" />
              <button onClick={handleCustomApply} disabled={!customStart || !customEnd || customStart > customEnd}
                className="text-[12px] font-medium text-brand-400 hover:text-brand-300 disabled:opacity-40 transition-colors">Apply</button>
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 h-8 flex items-center text-[13px] text-loss border-b border-rule-row">{error}</div>
        )}

        <div className="mt-5 flex flex-col gap-6">
          {/* ── All-time overview (four arguments) ── */}
          <AllTimeOverview refreshKey={lastUpdated} />

          {/* ── Selected period ── */}
          <TapeSection label="Selected period" meta={tradingDays != null ? `${periodLabel} · ${tradingDays} trading days` : periodLabel}>
            {loading ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8">
                {[...Array(6)].map((_, i) => <div key={i} className="animate-pulse bg-white/[0.03] rounded h-8 my-0.5" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8">
                <StatRow label="Start value"><Fig>{fmtILS(pv?.start.total_ils)}</Fig></StatRow>
                <StatRow label="End value"><Fig>{fmtILS(pv?.end.total_ils)}</Fig></StatRow>
                <StatRow label="Portfolio return">
                  <Fig tone={returnPositive === false ? "loss" : returnPositive === true ? "gain" : "ink"}>
                    {pv ? signedILS(pv.change_ils) : "—"}
                  </Fig>
                  {pv && <Sub>{fmtPct(pv.return_pct, 3)}</Sub>}
                </StatRow>
                <StatRow label="Realized P&L">
                  <Fig>{data ? signedILS(data.realized_pl.total_ils) : "—"}</Fig>
                  {data && market === "all" && <Sub>IL {signedILS(data.realized_pl.israeli_ils, false, 0)} · W {signedILS(data.realized_pl.world_ils, false, 0)}</Sub>}
                </StatRow>
                <StatRow label="Net dividends">
                  <Fig>{data ? fmtILS(data.dividends.total_net_ils) : "—"}</Fig>
                  {data && <Sub>gross ₪{divGross.toFixed(0)} · tax ₪{divTax.toFixed(0)}</Sub>}
                </StatRow>
                <StatRow label="Commissions">
                  <Fig>{data ? fmtILS(-data.commissions.total_ils) : "—"}</Fig>
                  {data && market === "all" && <Sub>IL ₪{data.commissions.israeli_ils.toFixed(0)} · W ₪{data.commissions.world_ils.toFixed(0)}</Sub>}
                </StatRow>
              </div>
            )}
          </TapeSection>

          {/* ── Portfolio value over time ── */}
          <TapeSection
            label="Portfolio value · ILS · benchmarks normalised to start"
            meta={
              <span className="flex items-center gap-3">
                {[
                  { id: "ta125", label: "TA-125", color: "#F59E0B" },
                  { id: "sp500", label: "S&P 500", color: "#818CF8" },
                ].map((b) => (
                  <button key={b.id} onClick={() => toggleBenchmark(b.id)}
                    className="flex items-center gap-1.5 text-[11px] font-medium transition-opacity"
                    style={{ color: benchmarks.includes(b.id) ? b.color : "var(--fg-label)", opacity: benchmarks.includes(b.id) ? 1 : 0.7 }}>
                    <span className="inline-block w-3 border-t" style={{ borderColor: b.color, borderStyle: benchmarks.includes(b.id) ? "solid" : "dashed" }} />
                    {b.label}
                  </button>
                ))}
              </span>
            }
          >
            {historyLoading ? (
              <div className="animate-pulse bg-white/[0.03] rounded h-[280px]" />
            ) : historyPoints && historyPoints.length > 0 ? (
              <PortfolioHistoryChart points={historyPoints} startValue={data?.portfolio_values?.start.total_ils} />
            ) : historyPoints !== null ? (
              <div className="flex items-center justify-center h-[280px] text-label text-[13px]">No price data available for this period</div>
            ) : null}
          </TapeSection>

          {/* ── Returns & income ── */}
          {((historyPoints && historyPoints.length > 0 && data) || true) && (
            <TapeSection label="Returns & income">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <div className="tape-label mb-2">Monthly returns · flow-adjusted</div>
                  {historyPoints && historyPoints.length > 0 && data
                    ? <MonthlyReturnsStrip points={historyPoints} transactions={data.transactions} />
                    : <div className="h-[120px] flex items-center text-[13px] text-label">No data for this period</div>}
                </div>
                <div>
                  <div className="tape-label mb-2">Dividend income · net of tax</div>
                  <DividendIncomeChart start={activeDates.start} end={activeDates.end} market={market} />
                </div>
              </div>
            </TapeSection>
          )}

          {/* ── Market breakdown ── */}
          {data && market === "all" && (
            <TapeSection label="Market breakdown">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <BreakdownColumn title="Israeli" rows={[
                  { label: "Realized P&L", value: signedILS(data.realized_pl.israeli_ils), tone: data.realized_pl.israeli_ils >= 0 ? "gain" : "loss" },
                  { label: "Dividends · net", value: fmtILS(data.dividends.israeli_net_ils) },
                  { label: "Commissions", value: fmtILS(-data.commissions.israeli_ils) },
                  { label: "Transactions", value: String(data.transactions.filter(t => t.market === "israeli").length) },
                ]} />
                <BreakdownColumn title="World" rows={[
                  { label: "Realized P&L", value: signedILS(data.realized_pl.world_ils), tone: data.realized_pl.world_ils >= 0 ? "gain" : "loss" },
                  { label: "Dividends · net", value: fmtILS(data.dividends.world_net_ils) },
                  { label: "Commissions", value: fmtILS(-data.commissions.world_ils) },
                  { label: "Transactions", value: String(data.transactions.filter(t => t.market === "world").length) },
                ]} />
              </div>
            </TapeSection>
          )}

          {/* ── Period activity ── */}
          {data?.stats && (
            <TapeSection label="Period activity">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8">
                <StatRow label="Trades">
                  <Fig>{data.stats.total_trades}</Fig>
                  <Sub>{data.stats.buys} buy · {data.stats.sells} sell</Sub>
                </StatRow>
                <StatRow label="Buy volume"><Fig>{fmtILS(data.stats.buy_volume_ils, true)}</Fig></StatRow>
                <StatRow label="Sell volume"><Fig>{fmtILS(data.stats.sell_volume_ils, true)}</Fig></StatRow>
                <StatRow label="Dividend events"><Fig>{data.stats.dividend_events}</Fig></StatRow>
                <StatRow label="Tax withheld"><Fig>{fmtILS(data.stats.total_tax_ils, true)}</Fig></StatRow>
                <StatRow label="Fees"><Fig>{fmtILS(data.stats.total_fees_ils, true)}</Fig></StatRow>
              </div>
            </TapeSection>
          )}

          {/* ── Best & worst trade ── */}
          {data && (data.top_trades.length > 0 || data.worst_trades.length > 0) && (
            <TapeSection label="Best & worst trades">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <div className="tape-label mb-1.5">Best</div>
                  {data.top_trades.filter((t) => t.realized_pl > 0).length === 0 ? (
                    <div className="h-8 flex items-center text-[13px] text-label border-b border-rule-row">No profitable closed trades in this period.</div>
                  ) : data.top_trades.filter((t) => t.realized_pl > 0).map((t, i) => (
                    <StatRow key={i} label={
                      <span className="flex items-baseline gap-2">
                        <span className="text-figure font-medium">{t.symbol}</span>
                        <span className="text-[11px] text-label">
                          {t.purchase_date && t.purchase_date !== t.date ? `${fmtDate(t.purchase_date)} → ${fmtDate(t.date)}` : fmtDate(t.date)} · {t.quantity.toLocaleString()} sh
                        </span>
                      </span>
                    } onClick={() => setDrilldown({ symbol: t.symbol, market: t.market })}>
                      <Fig tone="gain">{signedILS(t.realized_pl)}</Fig>
                    </StatRow>
                  ))}
                </div>
                <div>
                  <div className="tape-label mb-1.5">Worst</div>
                  {data.worst_trades.length === 0 ? (
                    <div className="h-8 flex items-center text-[13px] text-label border-b border-rule-row">No losing closed trades in this period.</div>
                  ) : data.worst_trades.map((t, i) => (
                    <StatRow key={i} label={
                      <span className="flex items-baseline gap-2">
                        <span className="text-figure font-medium">{t.symbol}</span>
                        <span className="text-[11px] text-label">
                          {t.purchase_date && t.purchase_date !== t.date ? `${fmtDate(t.purchase_date)} → ${fmtDate(t.date)}` : fmtDate(t.date)} · {t.quantity.toLocaleString()} sh
                        </span>
                      </span>
                    } onClick={() => setDrilldown({ symbol: t.symbol, market: t.market })}>
                      <Fig tone="loss">{signedILS(t.realized_pl)}</Fig>
                    </StatRow>
                  ))}
                </div>
              </div>
            </TapeSection>
          )}

          {/* ── Transactions ── */}
          <TapeSection label="Transactions" meta={data ? `${data.transactions.length} in period` : undefined}>
            {loading ? (
              <div className="flex flex-col">
                {[...Array(6)].map((_, i) => <div key={i} className="animate-pulse bg-white/[0.03] rounded h-7 my-0.5" />)}
              </div>
            ) : data ? (
              <TxTable transactions={data.transactions} onStockClick={(symbol, mk) => setDrilldown({ symbol, market: mk })} />
            ) : null}
          </TapeSection>
        </div>

        {/* ── Stock drill-down modal ── */}
        {drilldown && (
          <StockDrilldownModal
            symbol={drilldown.symbol}
            market={drilldown.market}
            start={activeDates.start}
            end={activeDates.end}
            onClose={() => setDrilldown(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
