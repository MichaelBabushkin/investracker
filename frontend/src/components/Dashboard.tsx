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

  return (
    <div className="min-h-screen bg-surface-dark">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Greeting */}
        <h1 className="text-xl lg:text-2xl font-heading font-bold text-gray-100 mb-6">
          Welcome back, {user?.first_name || "Investor"}
        </h1>

        {/* ── Hero: net worth + today + sparkline ── */}
        {loading ? (
          <div className="animate-pulse bg-surface-dark-secondary border border-white/5 rounded-2xl h-40 mb-6" />
        ) : (
          <div className="bg-surface-dark-secondary border border-white/5 rounded-2xl p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Net Worth</div>
                <div className="text-4xl font-bold text-gray-100 tabular-nums">
                  ₪{(data?.net_worth_ils ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 text-sm font-semibold ${up ? "text-gain" : "text-loss"}`}>
                    {up ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                    {fmtILS(data?.today_change_ils ?? 0, { sign: true })}
                    <span className="font-medium">
                      ({(data?.today_change_pct ?? 0) >= 0 ? "+" : ""}{(data?.today_change_pct ?? 0).toFixed(2)}%)
                    </span>
                  </span>
                  <span className="text-xs text-gray-600">today</span>
                </div>
                <div className="text-[11px] text-gray-600 mt-1">Israeli + World, in ILS</div>
              </div>

              {/* Sparkline */}
              {data && data.sparkline.length > 1 && (
                <div className="w-full md:w-72 h-20">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.sparkline} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                      <defs>
                        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={sparkColor} stopOpacity={0.25} />
                          <stop offset="100%" stopColor={sparkColor} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <YAxis hide domain={["dataMin", "dataMax"]} />
                      <Area type="monotone" dataKey="value" stroke={sparkColor} strokeWidth={2} fill="url(#sparkFill)" dot={false} isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="text-[11px] text-gray-600 text-right -mt-1">last 30 days</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Needs your attention ── */}
        {hasAttention && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {data!.pending.total > 0 && (
              <Link
                href="/portfolio"
                className="flex items-center gap-3 p-4 rounded-xl bg-warn/[0.06] border border-warn/20 hover:border-warn/40 transition-colors"
              >
                <span className="w-10 h-10 rounded-lg bg-warn/15 flex items-center justify-center flex-shrink-0">
                  <ClipboardCheck size={18} className="text-warn" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-100">
                    {data!.pending.total} transaction{data!.pending.total > 1 ? "s" : ""} to review
                  </div>
                  <div className="text-xs text-gray-500">
                    {data!.pending.israeli > 0 && `${data!.pending.israeli} Israeli`}
                    {data!.pending.israeli > 0 && data!.pending.world > 0 && " · "}
                    {data!.pending.world > 0 && `${data!.pending.world} World`}
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-600" />
              </Link>
            )}

            {data!.upcoming_earnings.length > 0 && (
              <div className="p-4 rounded-xl bg-info/[0.05] border border-info/15">
                <div className="flex items-center gap-2 mb-2">
                  <CalendarClock size={15} className="text-info" />
                  <span className="text-sm font-semibold text-gray-200">Upcoming earnings</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data!.upcoming_earnings.slice(0, 5).map((e) => (
                    <Link
                      key={e.symbol}
                      href={`/stock/${e.symbol}`}
                      className="text-xs px-2 py-1 rounded-md bg-white/[0.04] text-gray-300 hover:text-info transition-colors"
                    >
                      <span className="font-medium">{e.symbol}</span>
                      <span className="text-gray-500 ml-1">in {e.days_until}d</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Top movers ── */}
        {!loading && data && (data.top_movers.gainers.length > 0 || data.top_movers.losers.length > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-surface-dark-secondary border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingUp size={14} className="text-gain" />
                <span className="text-sm font-semibold text-gray-200">Today's gainers</span>
              </div>
              {data.top_movers.gainers.length > 0
                ? data.top_movers.gainers.map((m) => <MoverRow key={m.symbol} m={m} />)
                : <p className="text-xs text-gray-600 py-3">No gainers today</p>}
            </div>
            <div className="bg-surface-dark-secondary border border-white/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <TrendingDown size={14} className="text-loss" />
                <span className="text-sm font-semibold text-gray-200">Today's losers</span>
              </div>
              {data.top_movers.losers.length > 0
                ? data.top_movers.losers.map((m) => <MoverRow key={m.symbol} m={m} />)
                : <p className="text-xs text-gray-600 py-3">No losers today</p>}
            </div>
          </div>
        )}

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setShowUploader(true)}
            className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-surface-dark-secondary border border-white/5 hover:border-brand-400/30 text-gray-300 hover:text-brand-400 transition-colors text-sm font-medium"
          >
            <Upload size={16} /> Upload report
          </button>
          <Link
            href="/portfolio"
            className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-surface-dark-secondary border border-white/5 hover:border-brand-400/30 text-gray-300 hover:text-brand-400 transition-colors text-sm font-medium"
          >
            <Briefcase size={16} /> Portfolio
          </Link>
          <Link
            href="/analytics"
            className="flex items-center justify-center gap-2 p-3.5 rounded-xl bg-surface-dark-secondary border border-white/5 hover:border-brand-400/30 text-gray-300 hover:text-brand-400 transition-colors text-sm font-medium"
          >
            <BarChart3 size={16} /> Analytics
          </Link>
        </div>
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
