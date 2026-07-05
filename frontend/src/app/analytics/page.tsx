"use client";

import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, BarChart3, DollarSign, Landmark, Globe2, Calendar, ChevronDown } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { portfolioAPI, PortfolioAnalytics, AnalyticsTransaction, HistoryPoint } from "@/services/api";
import PortfolioHistoryChart from "@/components/PortfolioHistoryChart";

// ── Date helpers ──────────────────────────────────────────────────────────────

function toISODate(d: Date): string {
  // Use local date parts to avoid UTC timezone shift for Israeli users (UTC+3)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

type Preset = "this_month" | "last_month" | "3m" | "6m" | "12m" | "ytd" | "custom";

const PRESETS: Array<{ id: Preset; label: string }> = [
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "3m", label: "3 months" },
  { id: "6m", label: "6 months" },
  { id: "12m", label: "12 months" },
  { id: "ytd", label: "YTD" },
  { id: "custom", label: "Custom" },
];

function presetDates(preset: Preset): { start: string; end: string } {
  const today = new Date();
  switch (preset) {
    case "this_month":
      return { start: toISODate(startOfMonth(today)), end: toISODate(today) };
    case "last_month": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      return { start: toISODate(first), end: toISODate(endOfMonth(first)) };
    }
    case "3m": {
      const s = new Date(today); s.setMonth(s.getMonth() - 3);
      return { start: toISODate(s), end: toISODate(today) };
    }
    case "6m": {
      const s = new Date(today); s.setMonth(s.getMonth() - 6);
      return { start: toISODate(s), end: toISODate(today) };
    }
    case "12m": {
      const s = new Date(today); s.setFullYear(s.getFullYear() - 1);
      return { start: toISODate(s), end: toISODate(today) };
    }
    case "ytd":
      return { start: `${today.getFullYear()}-01-01`, end: toISODate(today) };
    default:
      return { start: toISODate(startOfMonth(today)), end: toISODate(today) };
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtILS(v: number | null | undefined, short = false): string {
  if (v == null) return "—";
  const abs = Math.abs(v);
  if (short && abs >= 1_000_000) return `₪${(v / 1_000_000).toFixed(2)}M`;
  if (short && abs >= 1_000) return `₪${(v / 1_000).toFixed(1)}K`;
  return `₪${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function fmtDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-white/8 rounded-lg ${className}`} />;
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  positive,
  loading,
  unavailable,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  positive?: boolean;
  loading?: boolean;
  unavailable?: boolean;
}) {
  const valueColor =
    positive === true ? "text-gain" :
    positive === false ? "text-loss" :
    "text-gray-100";

  return (
    <div className="bg-surface-dark-secondary border border-white/5 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        <Icon size={15} className="text-gray-600" />
      </div>
      {loading ? (
        <>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </>
      ) : unavailable ? (
        <div className="text-sm text-gray-600 italic">Unavailable — price data missing</div>
      ) : (
        <>
          <div className={`text-2xl font-bold tabular-nums ${valueColor}`}>{value}</div>
          {sub && <div className={`text-sm ${positive === true ? "text-gain/80" : positive === false ? "text-loss/80" : "text-gray-500"}`}>{sub}</div>}
        </>
      )}
    </div>
  );
}

const TYPE_STYLES: Record<string, string> = {
  BUY: "bg-gain/10 text-gain",
  SELL: "bg-loss/10 text-loss",
  DIVIDEND: "bg-info/10 text-info",
  DEPOSIT: "bg-warn/10 text-warn",
  WITHDRAWAL: "bg-warn/10 text-warn",
  CURRENCY_CONVERSION: "bg-purple-500/10 text-purple-400",
  CAPITAL_GAINS_TAX: "bg-gray-500/10 text-gray-400",
};

function TxTable({ transactions }: { transactions: AnalyticsTransaction[] }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [marketFilter, setMarketFilter] = useState<string>("all");

  const types = Array.from(new Set(transactions.map((t) => t.type)));
  const filtered = transactions.filter((t) => {
    if (typeFilter !== "all" && t.type !== typeFilter) return false;
    if (marketFilter !== "all" && t.market !== marketFilter) return false;
    return true;
  });

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-600">
        <BarChart3 size={32} className="mb-3 opacity-40" />
        <p className="text-sm">No transactions in this period</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-500">Filter:</span>
        <div className="flex gap-1">
          {["all", "israeli", "world"].map((m) => (
            <button
              key={m}
              onClick={() => setMarketFilter(m)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                marketFilter === m
                  ? "bg-brand-400/10 text-brand-400"
                  : "text-gray-500 hover:text-gray-300 bg-white/[0.02]"
              }`}
            >
              {m === "all" ? "All markets" : m === "israeli" ? "🇮🇱 Israeli" : "🌍 World"}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setTypeFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              typeFilter === "all" ? "bg-brand-400/10 text-brand-400" : "text-gray-500 hover:text-gray-300 bg-white/[0.02]"
            }`}
          >
            All types
          </button>
          {types.map((tp) => (
            <button
              key={tp}
              onClick={() => setTypeFilter(tp)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === tp ? "bg-brand-400/10 text-brand-400" : "text-gray-500 hover:text-gray-300 bg-white/[0.02]"
              }`}
            >
              {tp}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-gray-600">{filtered.length} rows</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-white/5">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.01]">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Stock</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Price</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Value (₪)</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wide">Realized P&L</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Market</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((tx, i) => (
              <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(tx.date)}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${TYPE_STYLES[tx.type] ?? "bg-white/5 text-gray-400"}`}>
                    {tx.type}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-200 whitespace-nowrap">
                  <div>{tx.symbol}</div>
                  {tx.company_name && tx.company_name !== tx.symbol && (
                    <div className="text-xs text-gray-500 truncate max-w-[140px]">{tx.company_name}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-400">
                  {tx.quantity ? tx.quantity.toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-400">
                  {tx.price ? `${tx.currency} ${tx.price.toFixed(2)}` : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-gray-200">
                  {tx.total_value_ils ? fmtILS(tx.total_value_ils) : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {tx.realized_pl ? (
                    <span className={tx.realized_pl >= 0 ? "text-gain" : "text-loss"}>
                      {fmtILS(tx.realized_pl)}
                    </span>
                  ) : (
                    <span className="text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    tx.market === "israeli"
                      ? "bg-brand-400/10 text-brand-400"
                      : "bg-info/10 text-info"
                  }`}>
                    {tx.market === "israeli" ? "IL" : "World"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [preset, setPreset] = useState<Preset>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<PortfolioAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [historyPoints, setHistoryPoints] = useState<HistoryPoint[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const activeDates = preset === "custom"
    ? { start: customStart, end: customEnd }
    : presetDates(preset);

  const fetchAnalytics = useCallback(async (start: string, end: string) => {
    if (!start || !end || start > end) return;
    setLoading(true);
    setError(null);
    try {
      const result = await portfolioAPI.getAnalytics(start, end);
      setData(result);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchHistory = useCallback(async (start: string, end: string) => {
    if (!start || !end || start > end) return;
    setHistoryLoading(true);
    setHistoryPoints(null);
    try {
      const result = await portfolioAPI.getHistory(start, end);
      setHistoryPoints(result.points);
    } catch {
      setHistoryPoints([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Fetch both when preset changes
  useEffect(() => {
    if (preset !== "custom") {
      const { start, end } = presetDates(preset);
      fetchAnalytics(start, end);
      fetchHistory(start, end);
    }
  }, [preset, fetchAnalytics, fetchHistory]);

  const handleCustomApply = () => {
    if (customStart && customEnd && customStart <= customEnd) {
      fetchAnalytics(customStart, customEnd);
      fetchHistory(customStart, customEnd);
    }
  };

  const pv = data?.portfolio_values;
  const returnPositive = pv?.change_ils != null ? pv.change_ils >= 0 : undefined;
  const plPositive = data ? data.realized_pl.total_ils >= 0 : undefined;
  const divPositive = data ? data.dividends.total_net_ils >= 0 : undefined;

  const periodLabel = data
    ? `${fmtDate(data.period_start)} – ${fmtDate(data.period_end)}`
    : activeDates.start && activeDates.end
      ? `${fmtDate(activeDates.start)} – ${fmtDate(activeDates.end)}`
      : "";

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface-dark px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-heading font-bold text-gray-100">Analytics</h1>
            {periodLabel && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1.5">
                <Calendar size={12} />
                {periodLabel}
              </p>
            )}
          </div>

          {/* Period selector */}
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPreset(p.id);
                  setShowCustom(p.id === "custom");
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  preset === p.id
                    ? "bg-brand-400/10 text-brand-400 border border-brand-400/30"
                    : "bg-surface-dark-secondary text-gray-400 border border-white/5 hover:text-gray-200"
                }`}
              >
                {p.id === "custom" && preset === "custom" ? (
                  <span className="flex items-center gap-1">{p.label} <ChevronDown size={10} /></span>
                ) : p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom date range row */}
        {showCustom && preset === "custom" && (
          <div className="flex items-center gap-2 mb-6 p-4 bg-surface-dark-secondary border border-white/8 rounded-xl">
            <label className="text-xs text-gray-500">From</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-3 py-1.5 bg-surface-dark-tertiary border border-white/10 rounded-lg text-sm text-gray-200 focus:ring-1 focus:ring-brand-400/40 focus:outline-none"
            />
            <label className="text-xs text-gray-500">to</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-3 py-1.5 bg-surface-dark-tertiary border border-white/10 rounded-lg text-sm text-gray-200 focus:ring-1 focus:ring-brand-400/40 focus:outline-none"
            />
            <button
              onClick={handleCustomApply}
              disabled={!customStart || !customEnd || customStart > customEnd}
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-brand-400/10 border border-brand-400/30 text-brand-400 hover:bg-brand-400/20 transition-all disabled:opacity-40"
            >
              Apply
            </button>
          </div>
        )}

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-loss/5 border border-loss/20 text-sm text-loss">{error}</div>
        )}

        {/* ── Portfolio value cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <MetricCard
            label="Start Value"
            value={fmtILS(pv?.start.total_ils)}
            sub={pv ? `Israeli ₪${(pv.start.israeli_ils / 1000).toFixed(0)}K · World ₪${(pv.start.world_ils / 1000).toFixed(0)}K` : undefined}
            icon={Landmark}
            loading={loading}
            unavailable={!loading && data !== null && pv === null}
          />
          <MetricCard
            label="End Value"
            value={fmtILS(pv?.end.total_ils)}
            sub={pv ? `Israeli ₪${(pv.end.israeli_ils / 1000).toFixed(0)}K · World ₪${(pv.end.world_ils / 1000).toFixed(0)}K` : undefined}
            icon={Landmark}
            loading={loading}
            unavailable={!loading && data !== null && pv === null}
          />
          <MetricCard
            label="Portfolio Return"
            value={pv ? `${fmtILS(pv.change_ils, true)} (${fmtPct(pv.return_pct)})` : "—"}
            icon={returnPositive === false ? TrendingDown : TrendingUp}
            positive={returnPositive}
            loading={loading}
            unavailable={!loading && data !== null && pv === null}
          />
        </div>

        {/* ── Income / P&L cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <MetricCard
            label="Realized P&L"
            value={data ? fmtILS(data.realized_pl.total_ils) : "—"}
            sub={data
              ? `Israeli ₪${data.realized_pl.israeli_ils.toFixed(0)} · World ₪${data.realized_pl.world_ils.toFixed(0)}`
              : undefined}
            icon={data && data.realized_pl.total_ils >= 0 ? TrendingUp : TrendingDown}
            positive={plPositive}
            loading={loading}
          />
          <MetricCard
            label="Net Dividends"
            value={data ? fmtILS(data.dividends.total_net_ils) : "—"}
            sub={data
              ? `Gross ₪${data.dividends.israeli_gross_ils + data.dividends.world_gross_ils > 0
                  ? (data.dividends.israeli_gross_ils + data.dividends.world_gross_ils).toFixed(0)
                  : "0"} · Tax ₪${(data.dividends.israeli_tax_ils + data.dividends.world_tax_ils).toFixed(0)}`
              : undefined}
            icon={DollarSign}
            positive={divPositive}
            loading={loading}
          />
          <MetricCard
            label="Commissions Paid"
            value={data ? fmtILS(-data.commissions.total_ils) : "—"}
            sub={data
              ? `Israeli ₪${data.commissions.israeli_ils.toFixed(0)} · World ₪${data.commissions.world_ils.toFixed(0)}`
              : undefined}
            icon={BarChart3}
            positive={false}
            loading={loading}
          />
        </div>

        {/* ── Portfolio history chart ── */}
        <div className="bg-surface-dark-secondary border border-white/5 rounded-xl p-5 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-heading font-semibold text-gray-100">Portfolio Value Over Time</h2>
            {historyPoints && historyPoints.length > 0 && (
              <span className="text-xs text-gray-500">{historyPoints.length} trading days</span>
            )}
          </div>
          {historyLoading ? (
            <div className="flex flex-col gap-2">
              <div className="animate-pulse bg-white/5 rounded-lg h-[280px]" />
            </div>
          ) : historyPoints && historyPoints.length > 0 ? (
            <PortfolioHistoryChart
              points={historyPoints}
              startValue={data?.portfolio_values?.start.total_ils}
            />
          ) : historyPoints !== null ? (
            <div className="flex items-center justify-center h-[280px] text-gray-600 text-sm">
              No price data available for this period
            </div>
          ) : null}
        </div>

        {/* ── Market breakdown ── */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-surface-dark-secondary border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Landmark size={14} className="text-brand-400" />
                <span className="text-sm font-semibold text-gray-200">Israeli Stocks</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Realized P&L", value: fmtILS(data.realized_pl.israeli_ils), pos: data.realized_pl.israeli_ils >= 0 },
                  { label: "Dividends (net)", value: fmtILS(data.dividends.israeli_net_ils), pos: true },
                  { label: "Commissions", value: fmtILS(-data.commissions.israeli_ils), pos: false },
                  { label: "Transactions", value: String(data.transactions.filter(t => t.market === "israeli").length), pos: undefined },
                ].map(({ label, value, pos }) => (
                  <div key={label}>
                    <div className="text-xs text-gray-500 mb-1">{label}</div>
                    <div className={`text-sm font-semibold tabular-nums ${pos === true ? "text-gain" : pos === false ? "text-loss" : "text-gray-200"}`}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-surface-dark-secondary border border-white/5 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Globe2 size={14} className="text-info" />
                <span className="text-sm font-semibold text-gray-200">World Stocks</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Realized P&L", value: fmtILS(data.realized_pl.world_ils), pos: data.realized_pl.world_ils >= 0 },
                  { label: "Dividends (net)", value: fmtILS(data.dividends.world_net_ils), pos: true },
                  { label: "Commissions", value: fmtILS(-data.commissions.world_ils), pos: false },
                  { label: "Transactions", value: String(data.transactions.filter(t => t.market === "world").length), pos: undefined },
                ].map(({ label, value, pos }) => (
                  <div key={label}>
                    <div className="text-xs text-gray-500 mb-1">{label}</div>
                    <div className={`text-sm font-semibold tabular-nums ${pos === true ? "text-gain" : pos === false ? "text-loss" : "text-gray-200"}`}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Transactions table ── */}
        <div className="bg-surface-dark-secondary border border-white/5 rounded-xl p-5">
          <h2 className="text-base font-heading font-semibold text-gray-100 mb-4">
            Transactions in period
            {data && <span className="ml-2 text-xs font-normal text-gray-500">({data.transactions.length} total)</span>}
          </h2>
          {loading ? (
            <div className="flex flex-col gap-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : data ? (
            <TxTable transactions={data.transactions} />
          ) : null}
        </div>
      </div>
    </ProtectedRoute>
  );
}
