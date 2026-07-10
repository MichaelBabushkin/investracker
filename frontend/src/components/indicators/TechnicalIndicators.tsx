"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { portfolioAPI, StockIndicators, IndicatorPeriod } from "@/services/api";
import SignalStrip from "./SignalStrip";
import PriceWithOverlays from "./PriceWithOverlays";
import RsiPanel from "./RsiPanel";
import MacdPanel from "./MacdPanel";

interface Props {
  symbol: string;
  market: "israeli" | "world";
}

const PERIODS: IndicatorPeriod[] = ["6m", "1y", "2y"];

export default function TechnicalIndicators({ symbol, market }: Props) {
  const [period, setPeriod] = useState<IndicatorPeriod>("1y");
  const [data, setData] = useState<StockIndicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    portfolioAPI
      .getStockIndicators(symbol, market, period)
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(e?.response?.data?.detail ?? "Failed to load indicators"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [symbol, market, period]);

  return (
    <div className="bg-surface-dark-secondary border border-white/10 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity size={15} className="text-brand-400" />
          <h2 className="text-base font-heading font-semibold text-gray-100">Technical Indicators</h2>
        </div>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                period === p
                  ? "bg-brand-400/10 text-brand-400 border border-brand-400/30"
                  : "text-gray-500 hover:text-gray-300 bg-white/[0.02] border border-white/5"
              }`}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col gap-4">
          <div className="animate-pulse bg-white/5 rounded-lg h-10" />
          <div className="animate-pulse bg-white/5 rounded-lg h-[320px]" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="animate-pulse bg-white/5 rounded-lg h-[140px]" />
            <div className="animate-pulse bg-white/5 rounded-lg h-[140px]" />
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-[200px] text-gray-600 text-sm">{error}</div>
      ) : data && data.points.length > 0 ? (
        <div className="flex flex-col gap-5">
          <SignalStrip data={data} />
          {data.risk && (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 px-3.5 py-2.5 rounded-lg bg-surface-dark-tertiary/40 border border-white/5 text-xs">
              <span className="text-gray-500">Risk (ATR 14):</span>
              <span className="text-gray-300 tabular-nums">
                daily range ≈ {data.currency === "ILS" ? "₪" : "$"}{data.risk.atr.toFixed(2)} ({data.risk.atr_pct.toFixed(1)}%)
              </span>
              <span className="text-gray-500">
                suggested stop (2×ATR):{" "}
                <span className="text-warn tabular-nums font-medium">
                  {data.currency === "ILS" ? "₪" : "$"}{data.risk.suggested_stop.toFixed(2)}
                </span>
              </span>
            </div>
          )}
          <PriceWithOverlays points={data.points} currency={data.currency} levels={data.levels} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RsiPanel points={data.points} />
            <MacdPanel points={data.points} />
          </div>
          <p className="text-[11px] text-gray-600">
            Indicators are timing context computed from daily closes — not a recommendation.
          </p>
        </div>
      ) : null}
    </div>
  );
}
