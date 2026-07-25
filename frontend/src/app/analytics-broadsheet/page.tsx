"use client";

// DIRECTION 1c — "Broadsheet": single-column editorial ledger. The 17 values
// become four arguments (growth / risk / discipline / cost), each a verdict
// figure introduced by a plain-English sentence. Density = meaning per glance,
// not quantity on screen. Rendered as dark paper. Temporary comparison route.

import React, { useState } from "react";
import { RefreshCw } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AnalyticsTransaction } from "@/services/api";
import PortfolioHistoryChart from "@/components/PortfolioHistoryChart";
import StockDrilldownModal from "@/components/StockDrilldownModal";
import VersionSwitch from "@/components/analytics/VersionSwitch";
import {
  useAnalyticsData, useOverview, buildArguments, PRESETS, MARKETS,
  fmtILS, signedILS, fmtPct, fmtDate, fmtMonth, Tone, Measure,
} from "@/components/analytics/shared";

const TONE: Record<Tone, string> = { ink: "text-figure", gain: "text-gain", loss: "text-loss", warn: "text-warn" };

function LedgerRow({ m }: { m: Measure }) {
  return (
    <div className="flex items-baseline justify-between gap-4 h-8 border-b border-rule-row">
      <span className="text-[13px] text-label">{m.label}</span>
      <span className="flex items-baseline gap-2">
        <span className={`text-[14px] font-medium tabular-nums ${TONE[m.tone ?? "ink"]}`}>{m.value}</span>
        {m.sub && <span className="text-[11px] text-label tabular-nums">{m.sub}</span>}
      </span>
    </div>
  );
}

function Argument({ eyebrow, verdict, verdictTone, sentence, rows }: {
  eyebrow: string; verdict: string; verdictTone: Tone; sentence: string; rows: Measure[];
}) {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-x-12 gap-y-4 items-start">
      <div>
        <div className="tape-label mb-2">{eyebrow}</div>
        <div className={`text-[56px] leading-[0.95] font-bold tabular-nums ${TONE[verdictTone]}`}>{verdict}</div>
        <p className="mt-3 text-[15px] leading-relaxed text-gray-300 max-w-[46ch]">{sentence}</p>
      </div>
      <div className="lg:pt-6">
        {rows.map((r) => <LedgerRow key={r.label} m={r} />)}
      </div>
    </section>
  );
}

export default function AnalyticsBroadsheetPage() {
  const {
    preset, setPreset, market, setMarket, showCustom, setShowCustom,
    benchmarks, toggleBenchmark,
    data, historyPoints, historyLoading,
    refreshing, handleManualRefresh, updatedAgo, lastUpdated,
    activeDates, periodLabel,
  } = useAnalyticsData();
  const { overview } = useOverview(lastUpdated);
  const [drilldown, setDrilldown] = useState<{ symbol: string; market: "israeli" | "world" } | null>(null);
  const [txLimit, setTxLimit] = useState(12);

  const pv = data?.portfolio_values;
  const args = overview ? buildArguments(overview) : null;
  const since = overview ? new Date(overview.inception + "T00:00:00").toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";

  // Group period transactions by day for the ledger.
  const grouped: Array<{ date: string; rows: AnalyticsTransaction[] }> = [];
  if (data) {
    const byDay = new Map<string, AnalyticsTransaction[]>();
    for (const t of data.transactions) {
      if (!byDay.has(t.date)) byDay.set(t.date, []);
      byDay.get(t.date)!.push(t);
    }
    byDay.forEach((rows, date) => grouped.push({ date, rows }));
  }
  const shownGroups: typeof grouped = [];
  let shown = 0;
  for (const g of grouped) {
    if (shown >= txLimit) break;
    shownGroups.push(g);
    shown += g.rows.length;
  }

  const periodRose = pv?.change_ils != null ? pv.change_ils >= 0 : true;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface-dark px-4 sm:px-6 py-6">
        <div className="max-w-[1080px] mx-auto flex flex-col gap-12">
          {/* Masthead */}
          <header className="flex flex-col gap-3 pb-4 border-b-[3px] border-figure/25">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <h1 className="text-[26px] font-heading font-bold text-figure leading-none">Analytics</h1>
                <VersionSwitch />
              </div>
              <div className="flex items-center gap-2 text-[11px] text-label">
                <span className="relative flex h-1.5 w-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gain opacity-60" /><span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gain" /></span>
                <span>Prices {updatedAgo ?? "—"}</span>
                <button onClick={handleManualRefresh} disabled={refreshing} className="p-0.5 text-label hover:text-figure disabled:opacity-40"><RefreshCw size={12} className={refreshing ? "animate-spin" : ""} /></button>
              </div>
            </div>
            <div className="flex items-center gap-5 flex-wrap text-[12px]">
              <div className="flex items-center gap-3">
                {MARKETS.map((m) => (
                  <button key={m.id} onClick={() => setMarket(m.id)} className={`font-medium ${market === m.id ? "text-figure underline underline-offset-4" : "text-label hover:text-figure"}`}>{m.label} markets</button>
                ))}
              </div>
              <span className="text-rule-section">·</span>
              <div className="flex items-center gap-3 flex-wrap">
                {PRESETS.filter((p) => p.id !== "custom").map((p) => (
                  <button key={p.id} onClick={() => { setPreset(p.id); setShowCustom(false); }} className={`font-medium tabular-nums ${preset === p.id ? "text-figure underline underline-offset-4" : "text-label hover:text-figure"}`}>{p.label}</button>
                ))}
              </div>
            </div>
          </header>

          {/* Lede */}
          {overview && (
            <p className="text-[19px] leading-relaxed text-gray-200 max-w-[62ch]">
              Since inception in {since}, you have put{" "}
              <span className="text-figure font-semibold tabular-nums">{fmtILS(overview.invested.net_invested_ils, true)}</span>{" "}
              of your own money in, and it is worth{" "}
              <span className="text-figure font-semibold tabular-nums">{fmtILS(overview.invested.current_value_ils, true)}</span>.
              Four things explain the difference: how much you made, how much risk you took to make it, how often you were right, and what it cost you.
            </p>
          )}

          {/* Four arguments */}
          {args && args.map((a, i) => (
            <div key={a.key} className={i === 0 ? "" : "pt-12 border-t border-rule-section"}>
              <Argument eyebrow={`${i + 1} · ${a.title}`} verdict={a.hero} verdictTone={a.heroTone} sentence={a.sentence} rows={a.rows} />
            </div>
          ))}

          {/* This period */}
          <section className="pt-12 border-t-[3px] border-figure/25">
            <div className="tape-label mb-2">This period · {periodLabel}</div>
            {pv && (
              <p className="text-[17px] leading-relaxed text-gray-200 max-w-[62ch] mb-5">
                Your portfolio {periodRose ? "rose" : "fell"}{" "}
                <span className={`font-semibold tabular-nums ${periodRose ? "text-gain" : "text-loss"}`}>{signedILS(pv.change_ils)}</span>,
                or <span className={`font-semibold tabular-nums ${periodRose ? "text-gain" : "text-loss"}`}>{fmtPct(pv.return_pct, 3)}</span>
                {data && data.realized_pl.total_ils !== 0 && <>, with realised {data.realized_pl.total_ils >= 0 ? "profit" : "loss"} of <span className="text-figure font-semibold tabular-nums">{signedILS(data.realized_pl.total_ils)}</span></>}.
              </p>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12">
              <div>
                <LedgerRow m={{ label: "Start value", value: fmtILS(pv?.start.total_ils) }} />
                <LedgerRow m={{ label: "End value", value: fmtILS(pv?.end.total_ils) }} />
                <LedgerRow m={{ label: "Realised P&L", value: data ? signedILS(data.realized_pl.total_ils) : "—" }} />
              </div>
              <div>
                <LedgerRow m={{ label: "Net dividends", value: data ? fmtILS(data.dividends.total_net_ils) : "—" }} />
                <LedgerRow m={{ label: "Commissions", value: data ? fmtILS(-data.commissions.total_ils) : "—" }} />
                <LedgerRow m={{ label: "Trades", value: data?.stats ? `${data.stats.total_trades}` : "—", sub: data?.stats ? `${data.stats.buys}B · ${data.stats.sells}S` : undefined }} />
              </div>
            </div>

            {/* Chart as illustration */}
            <div className="mt-8">
              <div className="flex items-center gap-4 mb-3">
                <span className="tape-label">Portfolio value · benchmarks</span>
                {[{ id: "ta125", label: "TA-125", color: "#F59E0B" }, { id: "sp500", label: "S&P 500", color: "#818CF8" }].map((b) => (
                  <button key={b.id} onClick={() => toggleBenchmark(b.id)} className="flex items-center gap-1.5 text-[11px] font-medium" style={{ color: benchmarks.includes(b.id) ? b.color : "var(--fg-label)" }}>
                    <span className="inline-block w-3 border-t" style={{ borderColor: b.color, borderStyle: benchmarks.includes(b.id) ? "solid" : "dashed" }} />{b.label}
                  </button>
                ))}
              </div>
              {historyLoading ? <div className="animate-pulse bg-white/[0.03] rounded h-[280px]" />
                : historyPoints && historyPoints.length > 0 ? <PortfolioHistoryChart points={historyPoints} startValue={pv?.start.total_ils} />
                : <div className="flex items-center justify-center h-[280px] text-[13px] text-label">No price data for this period</div>}
            </div>
          </section>

          {/* Transactions — grouped by day */}
          <section className="pt-12 border-t border-rule-section pb-16">
            <div className="tape-label mb-1">Transactions</div>
            <p className="text-[13px] text-label mb-4">{data ? `${data.transactions.length} in this period. Grouped by day; ILS is the reporting column.` : ""}</p>
            {shownGroups.map((g) => (
              <div key={g.date} className="mb-4">
                <div className="text-[12px] font-semibold text-figure mb-1">{fmtDate(g.date)}</div>
                {g.rows.map((t, i) => (
                  <button key={i} onClick={() => setDrilldown({ symbol: t.symbol, market: t.market })} className="w-full flex items-baseline justify-between gap-4 h-8 border-b border-rule-row text-left hover:bg-white/[0.02]">
                    <span className="flex items-baseline gap-3 min-w-0">
                      <span className="text-[13px] font-medium text-figure">{t.symbol}</span>
                      {t.company_name && t.company_name !== t.symbol && <span className="text-[11px] text-label truncate" dir="auto">{t.company_name}</span>}
                      <span className={`text-[12px] font-semibold ${t.type === "BUY" ? "text-gain" : t.type === "SELL" ? "text-loss" : "text-label"}`}>{t.type}</span>
                    </span>
                    <span className="flex items-baseline gap-3 shrink-0">
                      <span className="text-[12px] text-label tabular-nums">{t.quantity ? t.quantity.toLocaleString() : ""} {t.price ? `@ ${t.currency === "ILS" ? "₪" : "$"}${t.price.toFixed(2)}` : ""}</span>
                      <span className="text-[13px] text-figure tabular-nums w-[110px] text-right">{t.total_value_ils ? fmtILS(t.total_value_ils) : "—"}</span>
                    </span>
                  </button>
                ))}
              </div>
            ))}
            {data && shown < data.transactions.length && (
              <button onClick={() => setTxLimit((n) => n + 24)} className="mt-2 text-[13px] text-brand-400 hover:text-brand-300">Show more ({data.transactions.length - shown} remaining)</button>
            )}
          </section>
        </div>

        {drilldown && (
          <StockDrilldownModal symbol={drilldown.symbol} market={drilldown.market} start={activeDates.start} end={activeDates.end} onClose={() => setDrilldown(null)} />
        )}
      </div>
    </ProtectedRoute>
  );
}
