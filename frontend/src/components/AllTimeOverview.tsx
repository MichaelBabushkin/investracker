"use client";

import { useEffect, useState } from "react";
import { Award, TrendingDown as TrendingDownIcon } from "lucide-react";
import { portfolioAPI, PortfolioOverview } from "@/services/api";

function fmtILS(v: number | null | undefined, short = true): string {
  if (v == null) return "—";
  const abs = Math.abs(v);
  if (short && abs >= 1_000_000) return `₪${(v / 1_000_000).toFixed(2)}M`;
  if (short && abs >= 1_000) return `₪${(v / 1_000).toFixed(1)}K`;
  return `₪${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
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

interface Tile {
  label: string;
  value: string;
  sub?: string;
  tone?: "gain" | "loss" | "neutral" | "warn";
}

function buildTiles(o: PortfolioOverview): Tile[] {
  const plPos = o.total_pl.ils >= 0;
  const topHeavy = (o.concentration.top_pct ?? 0) > 15;
  return [
    {
      label: "Net Invested",
      value: fmtILS(o.invested.net_invested_ils),
      sub: `${fmtILS(o.invested.total_buys_ils)} bought · ${fmtILS(o.invested.total_sells_ils)} sold`,
    },
    {
      label: "Current Value",
      value: fmtILS(o.invested.current_value_ils),
      sub: `${o.days_active.toLocaleString()} days active`,
    },
    {
      label: "Total P&L",
      value: `${plPos ? "+" : ""}${fmtILS(o.total_pl.ils)}${o.total_pl.pct != null ? ` (${plPos ? "+" : ""}${o.total_pl.pct.toFixed(2)}%)` : ""}`,
      sub: "incl. dividends",
      tone: plPos ? "gain" : "loss",
    },
    {
      label: "Annualized Return",
      value: o.annualized_irr_pct != null ? `${o.annualized_irr_pct >= 0 ? "+" : ""}${o.annualized_irr_pct.toFixed(2)}%/yr` : "—",
      sub: "money-weighted (IRR)",
      tone: (o.annualized_irr_pct ?? 0) >= 0 ? "gain" : "loss",
    },
    {
      label: "Best Month",
      value: o.best_month ? `+${o.best_month.return_pct.toFixed(1)}%` : "—",
      sub: fmtMonth(o.best_month?.month),
      tone: "gain",
    },
    {
      label: "Worst Month",
      value: o.worst_month ? `${o.worst_month.return_pct.toFixed(1)}%` : "—",
      sub: fmtMonth(o.worst_month?.month),
      tone: "loss",
    },
    {
      label: "Win Rate",
      value: o.win_rate.rate_pct != null ? `${o.win_rate.rate_pct.toFixed(1)}%` : "—",
      sub: `${o.win_rate.wins}W / ${o.win_rate.losses}L · PF ${o.win_rate.profit_factor ?? "—"}`,
      tone: (o.win_rate.rate_pct ?? 0) >= 50 ? "gain" : "loss",
    },
    {
      label: "Avg Holding Period",
      value: o.holding_period.avg_days_winners != null ? `${Math.round(o.holding_period.avg_days_winners)}d wins` : "—",
      sub: o.holding_period.avg_days_losers != null ? `${Math.round(o.holding_period.avg_days_losers)}d losses` : undefined,
    },
    {
      label: "Best Stock",
      value: o.best_stock ? o.best_stock.symbol : "—",
      sub: o.best_stock ? `+${fmtILS(o.best_stock.pl_ils)} total` : undefined,
      tone: "gain",
    },
    {
      label: "Worst Stock",
      value: o.worst_stock ? o.worst_stock.symbol : "—",
      sub: o.worst_stock ? `${fmtILS(o.worst_stock.pl_ils)} total` : undefined,
      tone: "loss",
    },
    {
      label: "Turnover",
      value: o.turnover_annual_pct != null ? `${o.turnover_annual_pct.toFixed(0)}%/yr` : "—",
      sub: "traded vs avg value",
    },
    {
      label: "Max Drawdown",
      value: `${o.max_drawdown.pct.toFixed(1)}%`,
      sub: o.max_drawdown.peak_date
        ? `${fmtShortDate(o.max_drawdown.peak_date)} → ${fmtShortDate(o.max_drawdown.trough_date)}`
        : undefined,
      tone: "loss",
    },
    {
      label: "Volatility",
      value: o.volatility_annual_pct != null ? `${o.volatility_annual_pct.toFixed(1)}%/yr` : "—",
      sub: "std dev of daily returns",
    },
    {
      label: "Beta",
      value: o.beta.sp500 != null ? `${o.beta.sp500.toFixed(2)} S&P` : "—",
      sub: o.beta.ta125 != null ? `${o.beta.ta125.toFixed(2)} vs TA-125` : undefined,
    },
    {
      label: "Dividends All-Time",
      value: fmtILS(o.dividends.all_time_ils),
      sub: `TTM ${fmtILS(o.dividends.ttm_ils)} · yield ${o.dividends.ttm_yield_pct ?? "—"}%`,
      tone: "gain",
    },
    {
      label: "Fees & Taxes",
      value: fmtILS(o.costs.fees_ils + o.costs.taxes_ils),
      sub: o.costs.pct_of_profit != null ? `${o.costs.pct_of_profit.toFixed(1)}% of profit` : undefined,
      tone: "warn",
    },
    {
      label: "Concentration",
      value: o.concentration.top_symbol ? `${o.concentration.top_symbol} ${o.concentration.top_pct}%` : "—",
      sub: o.concentration.top5_pct != null ? `top 5 = ${o.concentration.top5_pct}%` : undefined,
      tone: topHeavy ? "warn" : "neutral",
    },
    {
      label: "Exposure",
      value: o.exposure.world_pct != null ? `${o.exposure.world_pct}% World` : "—",
      sub: o.exposure.israeli_pct != null ? `${o.exposure.israeli_pct}% Israeli` : undefined,
    },
  ];
}

const TONE_CLS: Record<string, string> = {
  gain: "text-gain",
  loss: "text-loss",
  warn: "text-warn",
  neutral: "text-gray-100",
};

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

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Award size={14} className="text-brand-400" />
        <h2 className="text-sm font-heading font-semibold text-gray-200">All-Time Overview</h2>
        {data && (
          <span className="text-xs text-gray-600">
            since {new Date(data.inception + "T00:00:00").toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </span>
        )}
      </div>

      {!data ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="animate-pulse bg-white/5 rounded-xl h-[72px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {buildTiles(data).map(({ label, value, sub, tone }) => (
            <div key={label} className="bg-surface-dark-secondary border border-white/5 rounded-xl px-3.5 py-3">
              <div className="text-[11px] text-gray-500 mb-1 truncate">{label}</div>
              <div className={`text-sm font-semibold tabular-nums truncate ${TONE_CLS[tone ?? "neutral"]}`}>
                {value}
              </div>
              {sub && <div className="text-[10px] text-gray-600 mt-0.5 truncate">{sub}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
