"use client";

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Upload,
  Briefcase,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  CalendarClock,
  ClipboardCheck,
  ChevronRight,
  X,
} from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { portfolioAPI, Cockpit, CockpitMover } from "@/services/api";
import ReportUploader from "./ReportUploader";

/* ── Formatters ── */
function fmtILS(v: number, opts?: { sign?: boolean; short?: boolean }): string {
  const sign = opts?.sign && v > 0 ? "+" : v < 0 ? "-" : "";
  const abs = Math.abs(v);
  if (opts?.short && abs >= 1_000_000) return `${sign}₪${(abs / 1_000_000).toFixed(2)}M`;
  if (opts?.short && abs >= 1_000) return `${sign}₪${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₪${abs.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function stockHref(m: CockpitMover): string {
  return m.market === "israeli" ? `/stock/il/${m.symbol}` : `/stock/${m.symbol}`;
}

/* ── Mover row ── */
const MoverRow: React.FC<{ m: CockpitMover }> = ({ m }) => {
  const up = m.day_change_pct >= 0;
  return (
    <Link
      href={stockHref(m)}
      className="flex items-center justify-between py-2.5 px-1 -mx-1 rounded-lg hover:bg-white/[0.03] transition-colors group"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${up ? "bg-gain/10" : "bg-loss/10"}`}>
          {up ? <ArrowUpRight size={15} className="text-gain" /> : <ArrowDownRight size={15} className="text-loss" />}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-medium text-gray-200 group-hover:text-brand-400 transition-colors">{m.symbol}</div>
          <div className="text-[11px] text-gray-500 truncate max-w-[130px]">{m.name}</div>
        </div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-semibold tabular-nums ${up ? "text-gain" : "text-loss"}`}>
          {up ? "+" : ""}{m.day_change_pct.toFixed(2)}%
        </div>
        <div className="text-[11px] text-gray-500 tabular-nums">{fmtILS(m.day_change_ils, { sign: true, short: true })}</div>
      </div>
    </Link>
  );
};

export default function Dashboard() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [data, setData] = useState<Cockpit | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploader, setShowUploader] = useState(false);

  useEffect(() => {
    let cancelled = false;
    portfolioAPI
      .getCockpit()
      .then((r) => !cancelled && setData(r))
      .catch(() => { /* leave null → empty state */ })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const up = (data?.today_change_ils ?? 0) >= 0;
  const sparkColor = up ? "#4ADE80" : "#F43F5E";
  const hasAttention = !!data && (data.pending.total > 0 || data.upcoming_earnings.length > 0);

  const actionCls = "flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-dark-secondary border border-white/5 hover:border-brand-400/30 text-gray-400 hover:text-brand-400 transition-colors text-xs font-medium";

  return (
    <div className="min-h-screen bg-surface-dark">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Header: greeting + quick actions inline */}
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <h1 className="text-lg font-heading font-bold text-gray-100">
            Welcome back, {user?.first_name || "Investor"}
          </h1>
          <div className="flex gap-2">
            <button onClick={() => setShowUploader(true)} className={actionCls}><Upload size={14} /> Upload</button>
            <Link href="/portfolio" className={actionCls}><Briefcase size={14} /> Portfolio</Link>
            <Link href="/analytics" className={actionCls}><BarChart3 size={14} /> Analytics</Link>
          </div>
        </div>

        {/* ── Hero: net worth + today + sparkline (full width) ── */}
        {loading ? (
          <div className="animate-pulse bg-surface-dark-secondary border border-white/5 rounded-xl h-28 mb-4" />
        ) : (
          <div className="bg-surface-dark-secondary border border-white/5 rounded-xl px-5 py-4 mb-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="md:w-72 flex-shrink-0">
                <div className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Net Worth · Israeli + World</div>
                <div className="text-3xl font-bold text-gray-100 tabular-nums leading-tight">
                  ₪{(data?.net_worth_ils ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <span className={`inline-flex items-center gap-1 text-sm font-semibold ${up ? "text-gain" : "text-loss"}`}>
                  {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {fmtILS(data?.today_change_ils ?? 0, { sign: true })}
                  <span className="font-medium">({(data?.today_change_pct ?? 0) >= 0 ? "+" : ""}{(data?.today_change_pct ?? 0).toFixed(2)}%)</span>
                  <span className="text-xs text-gray-600 font-normal ml-1">today</span>
                </span>
              </div>
              {/* Sparkline fills the remaining width */}
              {data && data.sparkline.length > 1 && (
                <div className="flex-1 h-16 min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.sparkline} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={sparkColor} stopOpacity={0.22} />
                          <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <YAxis hide domain={["dataMin", "dataMax"]} />
                      <Area type="monotone" dataKey="value" stroke={sparkColor} strokeWidth={2} fill="url(#sparkFill)" dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Dense grid: attention | gainers | losers ── */}
        {!loading && data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Needs attention */}
            <div className="bg-surface-dark-secondary border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <ClipboardCheck size={14} className="text-warn" />
                <span className="text-sm font-semibold text-gray-200">Needs attention</span>
              </div>
              {!hasAttention ? (
                <p className="text-xs text-gray-600 py-2">You&apos;re all caught up ✓</p>
              ) : (
                <div className="space-y-2">
                  {data.pending.total > 0 && (
                    <Link href="/portfolio" className="flex items-center gap-2.5 rounded-lg hover:bg-white/[0.03] px-1 -mx-1 py-1 transition-colors group">
                      <span className="w-7 h-7 rounded-lg bg-warn/15 flex items-center justify-center flex-shrink-0">
                        <ClipboardCheck size={14} className="text-warn" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-200">{data.pending.total} transaction{data.pending.total > 1 ? "s" : ""} to review</div>
                        <div className="text-[11px] text-gray-500">
                          {data.pending.israeli > 0 && `${data.pending.israeli} Israeli`}
                          {data.pending.israeli > 0 && data.pending.world > 0 && " · "}
                          {data.pending.world > 0 && `${data.pending.world} World`}
                        </div>
                      </div>
                      <ChevronRight size={15} className="text-gray-600 group-hover:text-gray-400" />
                    </Link>
                  )}
                  {data.upcoming_earnings.length > 0 && (
                    <div className="flex items-start gap-2.5 px-1 py-1">
                      <span className="w-7 h-7 rounded-lg bg-info/15 flex items-center justify-center flex-shrink-0">
                        <CalendarClock size={14} className="text-info" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-[11px] text-gray-500 mb-1">Upcoming earnings</div>
                        <div className="flex flex-wrap gap-1">
                          {data.upcoming_earnings.slice(0, 6).map((e) => (
                            <Link key={e.symbol} href={`/stock/${e.symbol}`} className="text-[11px] px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-300 hover:text-info transition-colors">
                              {e.symbol} <span className="text-gray-500">{e.days_until}d</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Gainers */}
            <div className="bg-surface-dark-secondary border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={14} className="text-gain" />
                <span className="text-sm font-semibold text-gray-200">Today&apos;s gainers</span>
              </div>
              {data.top_movers.gainers.length > 0
                ? data.top_movers.gainers.map((m) => <MoverRow key={m.symbol} m={m} />)
                : <p className="text-xs text-gray-600 py-2">No gainers today</p>}
            </div>

            {/* Losers */}
            <div className="bg-surface-dark-secondary border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown size={14} className="text-loss" />
                <span className="text-sm font-semibold text-gray-200">Today&apos;s losers</span>
              </div>
              {data.top_movers.losers.length > 0
                ? data.top_movers.losers.map((m) => <MoverRow key={m.symbol} m={m} />)
                : <p className="text-xs text-gray-600 py-2">No losers today</p>}
            </div>
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUploader && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowUploader(false)}
        >
          <div className="bg-surface-dark-secondary border border-white/10 rounded-2xl w-full max-w-6xl max-h-[82vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="text-base font-heading font-semibold text-gray-100">Upload broker report</h2>
              <button onClick={() => setShowUploader(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors">
                <X size={18} />
              </button>
            </div>
            <ReportUploader onUploadComplete={() => setShowUploader(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
