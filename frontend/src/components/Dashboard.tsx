"use client";

import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/store";
import Link from "next/link";
import { Upload, Briefcase, BarChart3, ChevronRight, X, ClipboardCheck, CalendarClock } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer, YAxis } from "recharts";
import { portfolioAPI, Cockpit, CockpitMover } from "@/services/api";
import ReportUploader from "./ReportUploader";
import StockLink from "@/components/StockLink";
import NewsFeed from "@/components/telegram/NewsFeed";
import { TapeSection } from "@/components/tape/Tape";

/* ── Formatters ── */
function fmtILS(v: number, opts?: { sign?: boolean; short?: boolean; decimals?: number }): string {
  const sign = opts?.sign && v > 0 ? "+" : v < 0 ? "-" : "";
  const abs = Math.abs(v);
  const d = opts?.decimals ?? 0;
  if (opts?.short && abs >= 1_000_000) return `${sign}₪${(abs / 1_000_000).toFixed(2)}M`;
  if (opts?.short && abs >= 1_000) return `${sign}₪${(abs / 1_000).toFixed(1)}K`;
  return `${sign}₪${abs.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d })}`;
}

/* ── Mover row: logo + name link, day % and ₪, right-aligned ── */
const MoverRow: React.FC<{ m: CockpitMover }> = ({ m }) => {
  const up = m.day_change_pct >= 0;
  return (
    <div className="flex items-center justify-between gap-4 h-8 border-b border-rule-row">
      <StockLink symbol={m.symbol} market={m.market} name={m.name} showName size="sm" className="min-w-0" />
      <span className="flex items-baseline gap-3 shrink-0 tabular-nums">
        <span className={`text-[13px] font-semibold ${up ? "text-gain" : "text-loss"}`}>
          {up ? "+" : ""}{m.day_change_pct.toFixed(2)}%
        </span>
        <span className="text-[11px] text-label w-[70px] text-right">{fmtILS(m.day_change_ils, { sign: true, short: true })}</span>
      </span>
    </div>
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
  const moverCount = data ? data.top_movers.gainers.length + data.top_movers.losers.length : 0;

  const today = new Date().toLocaleDateString("en-US", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });
  const actionCls = "inline-flex items-center gap-1.5 text-[12px] font-medium text-label hover:text-brand-400 transition-colors";

  return (
    <div className="min-h-screen bg-surface-dark">
      <div className="px-4 sm:px-6 lg:px-10 py-6">
        {/* Chrome: greeting + date + quick actions */}
        <div className="pb-3 border-b-2 border-rule-section flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[22px] font-heading font-bold text-figure leading-none">
              {user?.first_name ? `Hello, ${user.first_name}` : "Home"}
            </h1>
            <span className="text-[13px] text-label tabular-nums">{today}</span>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={() => setShowUploader(true)} className={actionCls}><Upload size={13} /> Upload statement</button>
            <Link href="/portfolio" className={actionCls}><Briefcase size={13} /> Portfolio</Link>
            <Link href="/analytics" className={actionCls}><BarChart3 size={13} /> Analytics</Link>
          </div>
        </div>

        {/* ── Hero: net worth + today + split + sparkline ── */}
        {loading ? (
          <div className="mt-5 animate-pulse bg-white/[0.03] rounded h-28" />
        ) : data ? (
          <div className="mt-5 flex flex-col lg:flex-row lg:items-end gap-6">
            <div className="lg:w-96 shrink-0">
              <div className="tape-label mb-1.5">Net worth · Israeli + World · ILS</div>
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="tape-fig text-[44px] leading-none font-bold text-figure">
                  ₪{data.net_worth_ils.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </span>
                <span className={`text-[15px] font-semibold tabular-nums ${up ? "text-gain" : "text-loss"}`}>
                  {fmtILS(data.today_change_ils, { sign: true })}
                  <span className="ml-1.5">{up ? "+" : ""}{data.today_change_pct.toFixed(2)}%</span>
                  <span className="text-[11px] text-label font-normal ml-1.5">today</span>
                </span>
              </div>
              <div className="mt-2.5 flex items-center gap-4 text-[12px] text-label tabular-nums">
                <span>Israeli <span className="text-figure">{fmtILS(data.israeli_ils, { short: true })}</span></span>
                <span>World <span className="text-figure">{fmtILS(data.world_ils, { short: true })}</span> <span className="text-label">(${(data.world_usd / 1000).toFixed(1)}K)</span></span>
              </div>
              <div className="mt-1 text-[11px] text-label tabular-nums">
                30-day range {fmtILS(data.range_30d.low, { short: true })} – {fmtILS(data.range_30d.high, { short: true })}
              </div>
            </div>

            {data.sparkline.length > 1 && (
              <div className="flex-1 h-20 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.sparkline} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={sparkColor} stopOpacity={0.18} />
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
        ) : (
          <div className="mt-5 text-[13px] text-label">Couldn&apos;t load your portfolio. Try refreshing.</div>
        )}

        {/* ── Movers + Needs attention ── */}
        {!loading && data && (
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10">
            {/* Movers */}
            <TapeSection label="Today's movers · held positions" meta={moverCount > 0 ? `${moverCount} shown` : undefined} first>
              {moverCount === 0 ? (
                <div className="h-8 flex items-center text-[13px] text-label border-b border-rule-row">No holdings moved today.</div>
              ) : (
                <>
                  {data.top_movers.gainers.map((m) => <MoverRow key={m.symbol} m={m} />)}
                  {data.top_movers.losers.map((m) => <MoverRow key={m.symbol} m={m} />)}
                </>
              )}
            </TapeSection>

            {/* Needs attention */}
            <TapeSection label="Needs attention" first>
              {!hasAttention ? (
                <div className="h-8 flex items-center text-[13px] text-label border-b border-rule-row">You&apos;re all caught up.</div>
              ) : (
                <div className="flex flex-col">
                  {data.pending.total > 0 && (
                    <Link href="/portfolio" className="flex items-center justify-between gap-3 h-9 border-b border-rule-row group hover:bg-white/[0.02] transition-colors">
                      <span className="flex items-center gap-2 min-w-0">
                        <ClipboardCheck size={14} className="text-warn shrink-0" />
                        <span className="text-[13px] text-figure">{data.pending.total} transaction{data.pending.total > 1 ? "s" : ""} to review</span>
                        <span className="text-[11px] text-label truncate">
                          {[data.pending.israeli > 0 && `${data.pending.israeli} IL`, data.pending.world > 0 && `${data.pending.world} World`].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      <ChevronRight size={14} className="text-label group-hover:text-figure shrink-0" />
                    </Link>
                  )}
                  {data.upcoming_earnings.map((e) => (
                    <Link key={e.symbol} href={`/stock/${e.symbol}`} className="flex items-center justify-between gap-3 h-9 border-b border-rule-row group hover:bg-white/[0.02] transition-colors">
                      <span className="flex items-center gap-2 min-w-0">
                        <CalendarClock size={14} className="text-info shrink-0" />
                        <span className="text-[13px] text-figure group-hover:text-brand-400 transition-colors">{e.symbol}</span>
                        <span className="text-[11px] text-label">earnings</span>
                      </span>
                      <span className="text-[12px] text-label tabular-nums shrink-0">in {e.days_until}d</span>
                    </Link>
                  ))}
                </div>
              )}
            </TapeSection>
          </div>
        )}

        {/* ── Market news ── */}
        {!loading && data && (
          <div className="mt-8">
            <NewsFeed layout="compact" title="Market news" seeAllHref="/news" pageSize={6} />
          </div>
        )}
      </div>

      {/* Upload modal */}
      {showUploader && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowUploader(false)}>
          <div className="bg-surface-dark-secondary border border-rule-section rounded-lg w-full max-w-6xl max-h-[82vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5">
              <h2 className="text-base font-heading font-semibold text-figure">Upload broker report</h2>
              <button onClick={() => setShowUploader(false)} className="p-1.5 rounded text-label hover:text-figure hover:bg-white/5 transition-colors">
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
