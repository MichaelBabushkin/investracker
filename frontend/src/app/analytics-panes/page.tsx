"use client";

// DIRECTION 1b — "Panes": a workspace, not a document. Each pane owns one
// question, has a titled header, and scrolls internally. Hierarchy = pane area;
// each pane tints exactly one figure (its hero). Temporary comparison route.

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnalyticsTransaction } from "@/services/api";
import PortfolioHistoryChart from "@/components/PortfolioHistoryChart";
import MonthlyReturnsStrip from "@/components/MonthlyReturnsStrip";
import DividendIncomeChart from "@/components/DividendIncomeChart";
import StockDrilldownModal from "@/components/StockDrilldownModal";
import VersionSwitch from "@/components/analytics/VersionSwitch";
import {
  useAnalyticsData, useOverview, buildArguments, PRESETS, MARKETS,
  fmtILS, signedILS, fmtPct, fmtDate, Tone,
} from "@/components/analytics/shared";

const TONE: Record<Tone, string> = { ink: "text-figure", gain: "text-gain", loss: "text-loss", warn: "text-warn" };

// ── Pane ──
function Pane({
  title, count, focusHint, children, className, bodyClass,
}: {
  title: string; count?: string; focusHint?: boolean;
  children: React.ReactNode; className?: string; bodyClass?: string;
}) {
  return (
    <div className={`flex flex-col min-h-0 bg-surface-dark-secondary border rounded-md overflow-hidden ${focusHint ? "border-brand-400/40" : "border-rule-section"} ${className ?? ""}`}>
      <div className="h-7 shrink-0 flex items-center justify-between px-3 border-b border-rule-row">
        <span className="tape-label">{title}</span>
        {count && <span className="text-[10px] text-label tabular-nums">{count}</span>}
      </div>
      <div className={`flex-1 min-h-0 overflow-auto p-3 ${bodyClass ?? ""}`}>{children}</div>
    </div>
  );
}

// A 2-column row inside a pane: label left, figure(s) right.
function Row({ label, value, sub, tone = "ink" }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; tone?: Tone }) {
  return (
    <div className="flex items-baseline justify-between gap-3 h-7 border-b border-rule-row last:border-0">
      <span className="text-[12px] text-label truncate">{label}</span>
      <span className="flex items-baseline gap-1.5 shrink-0">
        <span className={`text-[13px] font-medium tabular-nums ${TONE[tone]}`}>{value}</span>
        {sub && <span className="text-[10px] text-label tabular-nums">{sub}</span>}
      </span>
    </div>
  );
}

function Hero({ value, tone, sub }: { value: string; tone: Tone; sub?: string }) {
  return (
    <div className="mb-2">
      <div className={`text-[28px] leading-none font-bold tabular-nums ${TONE[tone]}`}>{value}</div>
      {sub && <div className="text-[11px] text-label mt-1">{sub}</div>}
    </div>
  );
}

const TYPE_TONE: Record<string, string> = { BUY: "text-gain", SELL: "text-loss" };

function TxPane({ transactions, onStockClick }: { transactions: AnalyticsTransaction[]; onStockClick?: (s: string, m: "israeli" | "world") => void }) {
  const [typeFilter, setTypeFilter] = useState("all");
  const types = Array.from(new Set(transactions.map((t) => t.type)));
  const filtered = transactions.filter((t) => typeFilter === "all" || t.type === typeFilter);
  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={() => setTypeFilter("all")} className={`text-[11px] ${typeFilter === "all" ? "text-brand-400" : "text-label hover:text-figure"}`}>All</button>
        {types.map((tp) => (
          <button key={tp} onClick={() => setTypeFilter(tp)} className={`text-[11px] ${typeFilter === tp ? "text-brand-400" : "text-label hover:text-figure"}`}>{tp}</button>
        ))}
        <span className="ml-auto text-[10px] text-label tabular-nums">1–{filtered.length} of {transactions.length}</span>
      </div>
      <div className="overflow-auto min-h-0">
        <table className="min-w-full">
          <thead className="sticky top-0 bg-surface-dark-secondary">
            <tr className="border-b border-rule-section">
              {["Date", "Instrument", "Type", "Qty", "Price", "Value ILS"].map((h, i) => (
                <th key={h} className={`tape-label py-1 pr-3 ${i >= 3 ? "text-right" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((tx, i) => (
              <tr key={i} className="border-b border-rule-row h-6 hover:bg-white/[0.02]">
                <td className="pr-3 text-[12px] text-label tabular-nums whitespace-nowrap">{fmtDate(tx.date)}</td>
                <td className="pr-3 whitespace-nowrap">
                  <button onClick={() => onStockClick?.(tx.symbol, tx.market)} className="text-[12px] font-medium text-figure hover:text-brand-400">{tx.symbol}</button>
                  {tx.company_name && tx.company_name !== tx.symbol && <span className="text-[10px] text-label ms-1.5" dir="auto">{tx.company_name}</span>}
                </td>
                <td className={`pr-3 text-[12px] font-semibold ${TYPE_TONE[tx.type] ?? "text-label"}`}>{tx.type}</td>
                <td className="pr-3 text-right text-[12px] text-figure tabular-nums">{tx.quantity ? tx.quantity.toLocaleString() : "—"}</td>
                <td className="pr-3 text-right text-[12px] text-figure tabular-nums">{tx.price ? `${tx.currency === "ILS" ? "₪" : "$"}${tx.price.toFixed(2)}` : "—"}</td>
                <td className="pr-0 text-right text-[12px] text-figure tabular-nums">{tx.total_value_ils ? fmtILS(tx.total_value_ils) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function AnalyticsPanesPage() {
  const {
    preset, setPreset, market, setMarket, showCustom, setShowCustom,
    benchmarks, toggleBenchmark,
    data, historyPoints, historyLoading,
    refreshing, handleManualRefresh, updatedAgo, lastUpdated,
    activeDates, periodLabel,
  } = useAnalyticsData();
  const { overview } = useOverview(lastUpdated);
  const [drilldown, setDrilldown] = useState<{ symbol: string; market: "israeli" | "world" } | null>(null);

  const pv = data?.portfolio_values;
  const returnPositive = pv?.change_ils != null ? pv.change_ils >= 0 : undefined;
  const args = overview ? buildArguments(overview) : null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface-dark px-3 sm:px-4 lg:px-5 py-3 flex flex-col gap-2">
        {/* Chrome */}
        <div className="shrink-0 flex items-center gap-4 flex-wrap pb-2 border-b border-rule-section">
          <div className="flex items-center gap-3">
            <h1 className="text-[18px] font-heading font-bold text-figure leading-none">Analytics</h1>
            <VersionSwitch />
          </div>
          <div className="flex items-center gap-3">
            {MARKETS.map((m) => (
              <button key={m.id} onClick={() => setMarket(m.id)} className={`text-[12px] font-medium ${market === m.id ? "text-brand-400" : "text-label hover:text-figure"}`}>{m.label}</button>
            ))}
          </div>
          <span className="text-rule-section">|</span>
          <div className="flex items-center gap-3 flex-wrap">
            {PRESETS.filter((p) => p.id !== "custom").map((p) => (
              <button key={p.id} onClick={() => { setPreset(p.id); setShowCustom(false); }} className={`text-[12px] font-medium tabular-nums ${preset === p.id ? "text-brand-400" : "text-label hover:text-figure"}`}>{p.label}</button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 text-[11px] text-label">
            <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gain opacity-60" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gain" /></span>
            <span>{periodLabel}{updatedAgo ? ` · ${updatedAgo}` : ""}</span>
            <button onClick={handleManualRefresh} disabled={refreshing} className="p-0.5 text-label hover:text-figure disabled:opacity-40"><RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /></button>
          </div>
        </div>

        {/* Workspace grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 auto-rows-min">
          {/* Row 1 */}
          <Pane title="Period" count={periodLabel} className="lg:col-span-4 h-[248px]">
            <Hero value={pv ? signedILS(pv.change_ils) : "—"} tone={returnPositive === false ? "loss" : "gain"} sub={pv ? `portfolio return ${fmtPct(pv.return_pct, 3)}` : undefined} />
            <Row label="Start value" value={fmtILS(pv?.start.total_ils)} />
            <Row label="End value" value={fmtILS(pv?.end.total_ils)} />
            <Row label="Realized P&L" value={data ? signedILS(data.realized_pl.total_ils) : "—"} />
            <Row label="Net dividends" value={data ? fmtILS(data.dividends.total_net_ils) : "—"} />
            <Row label="Commissions" value={data ? fmtILS(-data.commissions.total_ils) : "—"} />
          </Pane>

          <Pane title="Market split · by value" className="lg:col-span-4 h-[248px]">
            {pv ? (
              <>
                <Row label="Israeli" value={fmtILS(pv.end.israeli_ils, true)} sub={pv.end.total_ils ? `${((pv.end.israeli_ils / pv.end.total_ils) * 100).toFixed(1)}%` : undefined} />
                <Row label="World" value={fmtILS(pv.end.world_ils, true)} sub={pv.end.total_ils ? `${((pv.end.world_ils / pv.end.total_ils) * 100).toFixed(1)}%` : undefined} />
                {data && market === "all" && <>
                  <Row label="Realized · IL" value={signedILS(data.realized_pl.israeli_ils)} tone={data.realized_pl.israeli_ils >= 0 ? "gain" : "loss"} />
                  <Row label="Realized · World" value={signedILS(data.realized_pl.world_ils)} tone={data.realized_pl.world_ils >= 0 ? "gain" : "loss"} />
                  <Row label="Dividends · IL" value={fmtILS(data.dividends.israeli_net_ils)} />
                  <Row label="Dividends · World" value={fmtILS(data.dividends.world_net_ils)} />
                </>}
              </>
            ) : <div className="text-[12px] text-label">No data</div>}
          </Pane>

          <Pane title="Activity · this period" className="lg:col-span-4 h-[248px]">
            {data?.stats ? (
              <>
                <Row label="Trades" value={data.stats.total_trades} sub={`${data.stats.buys}B · ${data.stats.sells}S`} />
                <Row label="Buy volume" value={fmtILS(data.stats.buy_volume_ils, true)} />
                <Row label="Sell volume" value={fmtILS(data.stats.sell_volume_ils, true)} />
                <Row label="Dividend events" value={data.stats.dividend_events} />
                <Row label="Tax withheld" value={fmtILS(data.stats.total_tax_ils, true)} />
                <Row label="Fees" value={fmtILS(data.stats.total_fees_ils, true)} />
              </>
            ) : <div className="text-[12px] text-label">No data</div>}
          </Pane>

          {/* Row 2 — all-time, four arguments in one pane */}
          <Pane title="All-time · 17 measures" count={overview ? `since ${overview.inception?.slice(0, 7)} · ${overview.days_active}d` : undefined} className="lg:col-span-12 h-[300px]">
            {args ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                {args.map((a) => (
                  <div key={a.key}>
                    <div className="tape-label mb-1">{a.title}</div>
                    <div className={`text-[22px] leading-none font-bold tabular-nums mb-2 ${TONE[a.heroTone]}`}>{a.hero}</div>
                    {a.rows.map((r) => <Row key={r.label} label={r.label} value={r.value} sub={r.sub} tone={r.tone} />)}
                  </div>
                ))}
              </div>
            ) : <div className="text-[12px] text-label">Loading…</div>}
          </Pane>

          {/* Row 3 */}
          <Pane
            title="Portfolio value · ILS"
            className="lg:col-span-8 h-[320px]"
            count={undefined}
          >
            <div className="flex items-center gap-3 mb-2">
              {[{ id: "ta125", label: "TA-125", color: "#F59E0B" }, { id: "sp500", label: "S&P 500", color: "#818CF8" }].map((b) => (
                <button key={b.id} onClick={() => toggleBenchmark(b.id)} className="flex items-center gap-1.5 text-[10px] font-medium" style={{ color: benchmarks.includes(b.id) ? b.color : "var(--fg-label)" }}>
                  <span className="inline-block w-3 border-t" style={{ borderColor: b.color, borderStyle: benchmarks.includes(b.id) ? "solid" : "dashed" }} />{b.label}
                </button>
              ))}
            </div>
            {historyLoading ? <div className="animate-pulse bg-white/[0.03] rounded h-[230px]" />
              : historyPoints && historyPoints.length > 0 ? <PortfolioHistoryChart points={historyPoints} startValue={pv?.start.total_ils} />
              : <div className="flex items-center justify-center h-[230px] text-[12px] text-label">No price data</div>}
          </Pane>

          <Pane title="Best & worst trade" className="lg:col-span-4 h-[320px]">
            {data && (data.top_trades.length > 0 || data.worst_trades.length > 0) ? (
              <div className="flex flex-col gap-3">
                <div>
                  <div className="tape-label mb-1">Best</div>
                  {data.top_trades.filter((t) => t.realized_pl > 0).slice(0, 4).map((t, i) => (
                    <button key={i} onClick={() => setDrilldown({ symbol: t.symbol, market: t.market })} className="w-full">
                      <Row label={<span><span className="text-figure font-medium">{t.symbol}</span> <span className="text-[10px]">{t.quantity.toLocaleString()} sh</span></span>} value={signedILS(t.realized_pl)} tone="gain" />
                    </button>
                  ))}
                </div>
                <div>
                  <div className="tape-label mb-1">Worst</div>
                  {data.worst_trades.slice(0, 4).map((t, i) => (
                    <button key={i} onClick={() => setDrilldown({ symbol: t.symbol, market: t.market })} className="w-full">
                      <Row label={<span><span className="text-figure font-medium">{t.symbol}</span> <span className="text-[10px]">{t.quantity.toLocaleString()} sh</span></span>} value={signedILS(t.realized_pl)} tone="loss" />
                    </button>
                  ))}
                </div>
              </div>
            ) : <div className="text-[12px] text-label">No closed trades</div>}
          </Pane>

          {/* Row 4 */}
          <Pane title="Monthly returns" className="lg:col-span-6 h-[220px]">
            {historyPoints && historyPoints.length > 0 && data ? <MonthlyReturnsStrip points={historyPoints} transactions={data.transactions} /> : <div className="text-[12px] text-label">No data</div>}
          </Pane>
          <Pane title="Dividend income · net" className="lg:col-span-6 h-[220px]">
            <DividendIncomeChart start={activeDates.start} end={activeDates.end} market={market} />
          </Pane>

          {/* Row 5 — transactions */}
          <Pane title="Transactions" count={data ? `${data.transactions.length} in period` : undefined} className="lg:col-span-12 h-[360px]" bodyClass="!p-2">
            {data ? <TxPane transactions={data.transactions} onStockClick={(s, m) => setDrilldown({ symbol: s, market: m })} /> : <div className="text-[12px] text-label">Loading…</div>}
          </Pane>
        </div>

        {drilldown && (
          <StockDrilldownModal symbol={drilldown.symbol} market={drilldown.market} start={activeDates.start} end={activeDates.end} onClose={() => setDrilldown(null)} />
        )}
      </div>
    </ProtectedRoute>
  );
}
