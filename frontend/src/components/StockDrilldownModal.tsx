"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
} from "recharts";
import { portfolioAPI, StockAnalytics } from "@/services/api";

interface Props {
  symbol: string;
  market: "israeli" | "world";
  start: string;
  end: string;
  onClose: () => void;
}

function fmtILS(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `₪${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `₪${(v / 1_000).toFixed(1)}K`;
  return `₪${v.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

function ChartTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-surface-dark border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <div className="text-xs text-gray-500 mb-1">{fmtDate(p.date)}</div>
      <div className="text-base font-bold text-gray-100 tabular-nums">{fmtILS(p.value_ils)}</div>
      <div className="text-xs text-gray-400 tabular-nums mt-1">
        {p.qty.toLocaleString()} shares · close {p.close.toFixed(2)}
      </div>
    </div>
  );
}

export default function StockDrilldownModal({ symbol, market, start, end, onClose }: Props) {
  const [data, setData] = useState<StockAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    portfolioAPI
      .getStockAnalytics(symbol, market, start, end)
      .then((r) => !cancelled && setData(r))
      .catch((e) => !cancelled && setError(e?.response?.data?.detail ?? "Failed to load"));
    return () => { cancelled = true; };
  }, [symbol, market, start, end]);

  const points = data?.points ?? [];
  const values = points.map((p) => p.value_ils);
  const isPositive = values.length > 1 ? values[values.length - 1] >= values.find((v) => v > 0)! : true;
  const lineColor = isPositive ? "#4ADE80" : "#F43F5E";

  // Trade markers: y = portfolio value on that trading day (or nearest after)
  const markers = (data?.trades ?? []).map((t) => {
    const pt = points.find((p) => p.date >= t.date);
    return pt ? { ...t, y: pt.value_ils, x: pt.date } : null;
  }).filter(Boolean) as Array<{ x: string; y: number; type: string; date: string }>;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surface-dark-secondary border border-white/10 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-heading font-bold text-gray-100 flex items-center gap-2">
              {symbol}
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                market === "israeli" ? "bg-brand-400/10 text-brand-400" : "bg-info/10 text-info"
              }`}>
                {market === "israeli" ? "🇮🇱 TA" : "🌍 World"}
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">{fmtDate(start)} – {fmtDate(end)}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-200 hover:bg-white/5 transition-colors">
            <X size={18} />
          </button>
        </div>

        {error && <div className="px-4 py-3 rounded-xl bg-loss/5 border border-loss/20 text-sm text-loss">{error}</div>}

        {!data && !error && <div className="animate-pulse bg-white/5 rounded-lg h-[260px]" />}

        {data && (
          <>
            {/* Summary chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: "Position", value: `${data.summary.current_qty.toLocaleString()} shares`, cls: "text-gray-200" },
                { label: "Value", value: fmtILS(data.summary.end_value_ils), cls: "text-gray-200" },
                {
                  label: "Realized P&L",
                  value: fmtILS(data.summary.realized_pl_ils),
                  cls: data.summary.realized_pl_ils > 0 ? "text-gain" : data.summary.realized_pl_ils < 0 ? "text-loss" : "text-gray-500",
                },
                {
                  label: "Dividends (net)",
                  value: fmtILS(data.summary.dividends_net_ils),
                  cls: data.summary.dividends_net_ils > 0 ? "text-gain" : "text-gray-500",
                },
              ].map(({ label, value, cls }) => (
                <div key={label} className="bg-surface-dark-tertiary/40 border border-white/5 rounded-xl p-3">
                  <div className="text-[11px] text-gray-500 mb-0.5">{label}</div>
                  <div className={`text-sm font-semibold tabular-nums ${cls}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Value chart with trade markers */}
            {points.length > 1 ? (
              <div className="w-full mb-2" style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={points} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
                    <defs>
                      <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={lineColor} stopOpacity={0.18} />
                        <stop offset="85%" stopColor={lineColor} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d) => new Date(d + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "short" })}
                      tick={{ fill: "#6B7280", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={40}
                    />
                    <YAxis
                      tickFormatter={fmtILS}
                      tick={{ fill: "#6B7280", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      width={64}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
                    <Area
                      type="monotone"
                      dataKey="value_ils"
                      stroke={lineColor}
                      strokeWidth={2}
                      fill="url(#stockGradient)"
                      dot={false}
                      activeDot={{ r: 4, fill: lineColor, stroke: "#0B0F1A", strokeWidth: 2 }}
                    />
                    {markers.map((m, i) => (
                      <ReferenceDot
                        key={i}
                        x={m.x}
                        y={m.y}
                        r={5}
                        fill={m.type === "BUY" ? "#4ADE80" : "#F43F5E"}
                        stroke="#0B0F1A"
                        strokeWidth={2}
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[120px] text-gray-600 text-sm">
                Not enough price data for this period
              </div>
            )}
            {markers.length > 0 && (
              <div className="flex items-center gap-4 mb-4 px-1 text-[11px] text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gain inline-block" /> Buy
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-loss inline-block" /> Sell
                </span>
              </div>
            )}

            {/* Trades in period */}
            {data.trades.length > 0 && (
              <div className="rounded-xl border border-white/5 overflow-hidden">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.01]">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">Value (₪)</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 uppercase">P&L (₪)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.trades.map((t, i) => (
                      <tr key={i} className="hover:bg-white/[0.02]">
                        <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap">{fmtDate(t.date)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            t.type === "BUY" ? "bg-gain/10 text-gain" : "bg-loss/10 text-loss"
                          }`}>{t.type}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-400">{t.quantity.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-400">{t.price.toFixed(2)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-200">{fmtILS(t.total_value_ils)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">
                          {t.type === "SELL" && t.realized_pl_ils !== 0 ? (
                            <span className={t.realized_pl_ils >= 0 ? "text-gain" : "text-loss"}>
                              {fmtILS(t.realized_pl_ils)}
                            </span>
                          ) : <span className="text-gray-600">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
