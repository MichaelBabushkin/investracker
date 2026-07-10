"use client";

import { useState } from "react";
import {
  ComposedChart,
  Area,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot,
} from "recharts";
import { IndicatorPoint } from "@/services/api";

export interface TradeMarker {
  date: string;                 // YYYY-MM-DD
  type: string;                 // BUY | SELL
  quantity: number;
  price: number;
}

interface Props {
  points: IndicatorPoint[];
  currency: string;
  levels: { high_52w: number | null; low_52w: number | null };
  trades?: TradeMarker[];
  syncId?: string;
}

const OVERLAYS = [
  { key: "sma20", label: "SMA 20", color: "#38BDF8", defaultOn: false },
  { key: "sma50", label: "SMA 50", color: "#F59E0B", defaultOn: true },
  { key: "sma150", label: "SMA 150", color: "#A78BFA", defaultOn: true },
  { key: "sma200", label: "SMA 200", color: "#F43F5E", defaultOn: true },
  { key: "bb", label: "Bollinger", color: "#38BDF8", defaultOn: false },
] as const;

function fmtPrice(v: number, currency: string): string {
  const sym = currency === "ILS" ? "₪" : "$";
  if (Math.abs(v) >= 1000) return `${sym}${(v / 1000).toFixed(1)}K`;
  return `${sym}${v.toFixed(v < 20 ? 2 : 1)}`;
}

function fmtDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}

function PriceTooltip({ active, payload, currency }: any) {
  if (!active || !payload?.length) return null;
  const p: IndicatorPoint = payload[0].payload;
  const rows: Array<[string, number | null, string]> = [
    ["Close", p.close, "#E5E7EB"],
    ["SMA 20", p.sma20, "#38BDF8"],
    ["SMA 50", p.sma50, "#F59E0B"],
    ["SMA 150", p.sma150, "#A78BFA"],
    ["SMA 200", p.sma200, "#F43F5E"],
  ];
  return (
    <div className="bg-surface-dark border border-white/10 rounded-xl px-4 py-3 shadow-xl min-w-[160px]">
      <div className="text-xs text-gray-500 mb-2">
        {new Date(p.date + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}
      </div>
      {rows.map(([label, v, color]) =>
        v == null ? null : (
          <div key={label} className="flex justify-between gap-4 text-xs py-0.5">
            <span style={{ color }}>{label}</span>
            <span className="tabular-nums text-gray-200">{fmtPrice(v, currency)}</span>
          </div>
        )
      )}
    </div>
  );
}

export default function PriceWithOverlays({ points, currency, levels, trades, syncId }: Props) {
  const [active, setActive] = useState<Set<string>>(
    new Set(OVERLAYS.filter((o) => o.defaultOn).map((o) => o.key))
  );
  const [showTrades, setShowTrades] = useState(true);

  // Snap each trade to the first trading day on/after its date so the marker
  // sits exactly on the price line
  const markers = (trades ?? [])
    .filter((t) => (t.type === "BUY" || t.type === "SELL") && t.date)
    .map((t) => {
      const pt = points.find((p) => p.date >= t.date!);
      return pt ? { ...t, x: pt.date, y: pt.close } : null;
    })
    .filter(Boolean) as Array<TradeMarker & { x: string; y: number }>;

  const toggle = (key: string) =>
    setActive((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const showBB = active.has("bb");

  // y-domain: include ALL moving averages regardless of visibility so that
  // toggling an MA never rescales the axis (they hug the price anyway).
  // Bollinger genuinely widens the range, so it participates only when shown.
  const vals: number[] = [];
  for (const p of points) {
    vals.push(p.close);
    if (showBB && p.bb_upper != null) vals.push(p.bb_upper);
    if (showBB && p.bb_lower != null) vals.push(p.bb_lower);
    for (const o of OVERLAYS) {
      if (o.key !== "bb") {
        const v = (p as any)[o.key];
        if (v != null) vals.push(v);
      }
    }
  }
  if (levels.high_52w) vals.push(levels.high_52w);
  if (levels.low_52w) vals.push(levels.low_52w);
  const pad = (Math.max(...vals) - Math.min(...vals)) * 0.05 || 1;
  const yMin = Math.min(...vals) - pad;
  const yMax = Math.max(...vals) + pad;

  // BB band rendered as a stacked band: base (invisible) + range fill
  const data = points.map((p) => ({
    ...p,
    bb_base: p.bb_lower,
    bb_range: p.bb_upper != null && p.bb_lower != null ? p.bb_upper - p.bb_lower : null,
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        {OVERLAYS.map((o) => (
          <button
            key={o.key}
            onClick={() => toggle(o.key)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              active.has(o.key)
                ? "border-current"
                : "border-white/5 text-gray-500 hover:text-gray-300 bg-white/[0.02]"
            }`}
            style={active.has(o.key) ? { color: o.color, background: `${o.color}14` } : undefined}
          >
            {o.label}
          </button>
        ))}
        {markers.length > 0 && (
          <button
            onClick={() => setShowTrades((v) => !v)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
              showTrades
                ? "border-gain/40 text-gain bg-gain/10"
                : "border-white/5 text-gray-500 hover:text-gray-300 bg-white/[0.02]"
            }`}
          >
            My Trades ({markers.length})
          </button>
        )}
      </div>

      <div className="w-full" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} syncId={syncId} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            {/* Dates render once, on the bottom-most synced panel (MACD) */}
            <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} height={2} />
            <YAxis
              yAxisId="price"
              domain={[yMin, yMax]}
              tickFormatter={(v) => fmtPrice(v, currency)}
              tick={{ fill: "#6B7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            {/* Hidden volume axis: bars occupy the bottom ~15% of the chart */}
            <YAxis yAxisId="volume" hide domain={[0, (max: number) => max * 6.5]} />
            <Tooltip content={<PriceTooltip currency={currency} />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />

            <Bar yAxisId="volume" dataKey="volume" isAnimationActive={false} maxBarSize={3}>
              {data.map((p, i) => {
                const prev = i > 0 ? data[i - 1].close : p.close;
                return <Cell key={i} fill={p.close >= prev ? "rgba(74,222,128,0.25)" : "rgba(244,63,94,0.25)"} />;
              })}
            </Bar>

            {/* Always mounted; visibility via `hide` so toggling one overlay
                never re-initializes (and re-animates) the other series */}
            <Area yAxisId="price" type="monotone" dataKey="bb_base" stackId="bb"
              stroke="none" fill="transparent" isAnimationActive={false} hide={!showBB} />
            <Area
              yAxisId="price"
              type="monotone"
              dataKey="bb_range"
              stackId="bb"
              stroke="rgba(56,189,248,0.35)"
              strokeWidth={1}
              fill="rgba(56,189,248,0.06)"
              isAnimationActive={false}
              hide={!showBB}
            />

            {levels.high_52w && (
              <ReferenceLine yAxisId="price" y={levels.high_52w} stroke="rgba(74,222,128,0.3)" strokeDasharray="4 4"
                label={{ value: "52w high", position: "insideTopRight", fill: "#4ADE80", fontSize: 10 }} />
            )}
            {levels.low_52w && (
              <ReferenceLine yAxisId="price" y={levels.low_52w} stroke="rgba(244,63,94,0.3)" strokeDasharray="4 4"
                label={{ value: "52w low", position: "insideBottomRight", fill: "#F43F5E", fontSize: 10 }} />
            )}

            <Line yAxisId="price" type="monotone" dataKey="close" stroke="#E5E7EB" strokeWidth={2} dot={false}
              isAnimationActive={false}
              activeDot={{ r: 3, fill: "#E5E7EB", stroke: "#0B0F1A", strokeWidth: 2 }} />

            {OVERLAYS.filter((o) => o.key !== "bb").map((o) => (
              <Line yAxisId="price" key={o.key} type="monotone" dataKey={o.key} stroke={o.color}
                strokeWidth={1.3} dot={false} activeDot={false} connectNulls
                isAnimationActive={false} hide={!active.has(o.key)} />
            ))}

            {showTrades && markers.map((m, i) => (
              <ReferenceDot
                key={`t${i}`}
                yAxisId="price"
                x={m.x}
                y={m.y}
                r={4.5}
                fill={m.type === "BUY" ? "#4ADE80" : "#F43F5E"}
                stroke="#0B0F1A"
                strokeWidth={1.5}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 px-2 text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-4 h-0.5 rounded bg-gray-200" /> Close
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-1 h-2.5 rounded-sm bg-gain/40" />
          <span className="inline-block w-1 h-2 rounded-sm bg-loss/40 -ml-1" /> Volume
        </span>
        {showTrades && markers.length > 0 && (
          <>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-gain inline-block" /> My buys
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-loss inline-block" /> My sells
            </span>
          </>
        )}
      </div>
    </div>
  );
}
