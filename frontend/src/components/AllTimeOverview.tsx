"use client";

import { useEffect, useState } from "react";
import { portfolioAPI, PortfolioOverview } from "@/services/api";
import { TapeSection, TapeColumn, StatRow, Fig, Sub } from "@/components/tape/Tape";

function fmtILS(v: number | null | undefined, short = true): string {
  if (v == null) return "—";
  const abs = Math.abs(v);
  if (short && abs >= 1_000_000) return `₪${(v / 1_000_000).toFixed(2)}M`;
  if (short && abs >= 1_000) return `₪${(v / 1_000).toFixed(1)}K`;
  return `₪${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function signedILS(v: number | null | undefined, short = true): string {
  if (v == null) return "—";
  return `${v >= 0 ? "+" : ""}${fmtILS(v, short)}`;
}

function fmtMonth(m: string | undefined): string {
  if (!m) return "—";
  const [y, mo] = m.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(mo, 10) - 1]} ${y}`;
}

function fmtShortDate(s: string | null): string {
  if (!s) return "";
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "2-digit" });
}

export default function AllTimeOverview({ refreshKey }: { refreshKey?: string | null }) {
  const [data, setData] = useState<PortfolioOverview | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    portfolioAPI
      .getOverview()
      .then((r) => !cancelled && setData(r))
      .catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (failed) return null;

  const since = data
    ? new Date(data.inception + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : "";
  const meta = data ? `since ${since} · ${data.days_active.toLocaleString()} days · 17 measures` : undefined;

  if (!data) {
    return (
      <TapeSection label="All-time" meta="loading…" first>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="animate-pulse bg-white/5 rounded h-6 w-24" />
              {[...Array(5)].map((_, j) => (
                <div key={j} className="animate-pulse bg-white/[0.03] rounded h-6" />
              ))}
            </div>
          ))}
        </div>
      </TapeSection>
    );
  }

  const o = data;
  const plPos = o.total_pl.ils >= 0;
  const winPos = (o.win_rate.rate_pct ?? 0) >= 50;
  const topHeavy = (o.concentration.top_pct ?? 0) > 15;

  return (
    <TapeSection label="All-time" meta={meta} first>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-6">
        {/* 1 · GROWTH — how much you made */}
        <TapeColumn
          label="Growth"
          hero={o.total_pl.pct != null ? `${plPos ? "+" : ""}${o.total_pl.pct.toFixed(2)}%` : "—"}
          heroTone={plPos ? "gain" : "loss"}
          heroSub={`${signedILS(o.total_pl.ils)} incl. dividends`}
        >
          <StatRow label="Net invested"><Fig>{fmtILS(o.invested.net_invested_ils)}</Fig></StatRow>
          <StatRow label="Current value"><Fig>{fmtILS(o.invested.current_value_ils)}</Fig></StatRow>
          <StatRow label="IRR · money-weighted">
            <Fig>{o.annualized_irr_pct != null ? `${o.annualized_irr_pct >= 0 ? "+" : ""}${o.annualized_irr_pct.toFixed(2)}%/yr` : "—"}</Fig>
          </StatRow>
          <StatRow label="Best month">
            <Fig>{o.best_month ? `+${o.best_month.return_pct.toFixed(1)}%` : "—"}</Fig>
            {o.best_month && <Sub>{fmtMonth(o.best_month.month)}</Sub>}
          </StatRow>
          <StatRow label="Dividends all-time">
            <Fig>{fmtILS(o.dividends.all_time_ils)}</Fig>
            {o.dividends.ttm_yield_pct != null && <Sub>{o.dividends.ttm_yield_pct}%</Sub>}
          </StatRow>
        </TapeColumn>

        {/* 2 · RISK — how much risk you took */}
        <TapeColumn
          label="Risk"
          hero={`${o.max_drawdown.pct.toFixed(1)}%`}
          heroTone="loss"
          heroSub={o.max_drawdown.peak_date
            ? `max drawdown · ${fmtShortDate(o.max_drawdown.peak_date)} → ${fmtShortDate(o.max_drawdown.trough_date)}`
            : "max drawdown"}
        >
          <StatRow label="Worst month">
            <Fig>{o.worst_month ? `${o.worst_month.return_pct.toFixed(1)}%` : "—"}</Fig>
            {o.worst_month && <Sub>{fmtMonth(o.worst_month.month)}</Sub>}
          </StatRow>
          <StatRow label="Volatility">
            <Fig>{o.volatility_annual_pct != null ? `${o.volatility_annual_pct.toFixed(1)}%/yr` : "—"}</Fig>
          </StatRow>
          <StatRow label="Beta · vs S&P · TA-125">
            <Fig>{o.beta.sp500 != null ? o.beta.sp500.toFixed(2) : "—"}</Fig>
            {o.beta.ta125 != null && <Sub>· {o.beta.ta125.toFixed(2)}</Sub>}
          </StatRow>
          <StatRow label="Concentration · top holding">
            <Fig tone={topHeavy ? "warn" : "ink"}>{o.concentration.top_symbol ? `${o.concentration.top_pct}%` : "—"}</Fig>
            {o.concentration.top_symbol && <Sub>{o.concentration.top_symbol}</Sub>}
          </StatRow>
          <StatRow label="Exposure · World · Israeli">
            <Fig>{o.exposure.world_pct != null ? `${o.exposure.world_pct}%` : "—"}</Fig>
            {o.exposure.israeli_pct != null && <Sub>· {o.exposure.israeli_pct}%</Sub>}
          </StatRow>
        </TapeColumn>

        {/* 3 · DISCIPLINE — how often you were right */}
        <TapeColumn
          label="Discipline"
          hero={o.win_rate.rate_pct != null ? `${o.win_rate.rate_pct.toFixed(1)}%` : "—"}
          heroTone={winPos ? "gain" : "loss"}
          heroSub={`win rate · ${o.win_rate.wins}W / ${o.win_rate.losses}L`}
        >
          <StatRow label="Profit factor"><Fig>{o.win_rate.profit_factor ?? "—"}</Fig></StatRow>
          <StatRow label="Avg hold · winners">
            <Fig>{o.holding_period.avg_days_winners != null ? `${Math.round(o.holding_period.avg_days_winners)}d` : "—"}</Fig>
          </StatRow>
          <StatRow label="Avg hold · losers">
            <Fig>{o.holding_period.avg_days_losers != null ? `${Math.round(o.holding_period.avg_days_losers)}d` : "—"}</Fig>
          </StatRow>
          <StatRow label="Turnover">
            <Fig>{o.turnover_annual_pct != null ? `${o.turnover_annual_pct.toFixed(0)}%/yr` : "—"}</Fig>
          </StatRow>
          <StatRow label="Best · worst stock">
            <Fig>{o.best_stock ? o.best_stock.symbol : "—"}</Fig>
            {o.worst_stock && <Sub>· {o.worst_stock.symbol}</Sub>}
          </StatRow>
        </TapeColumn>

        {/* 4 · COST — what it cost you */}
        <TapeColumn
          label="Cost"
          hero={fmtILS(o.costs.fees_ils + o.costs.taxes_ils)}
          heroTone="warn"
          heroSub={o.costs.pct_of_profit != null ? `${o.costs.pct_of_profit.toFixed(1)}% of profit` : "fees + tax"}
        >
          <StatRow label="Commissions"><Fig>{fmtILS(o.costs.fees_ils)}</Fig></StatRow>
          <StatRow label="Capital-gains tax"><Fig>{fmtILS(o.costs.taxes_ils)}</Fig></StatRow>
          <StatRow label="Bought · all-time"><Fig>{fmtILS(o.invested.total_buys_ils)}</Fig></StatRow>
          <StatRow label="Sold · all-time"><Fig>{fmtILS(o.invested.total_sells_ils)}</Fig></StatRow>
          <StatRow label="Days active"><Fig>{o.days_active.toLocaleString()}</Fig></StatRow>
        </TapeColumn>
      </div>
    </TapeSection>
  );
}
