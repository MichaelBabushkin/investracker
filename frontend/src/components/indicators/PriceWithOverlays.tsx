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
} from "recharts";
import { IndicatorPoint } from "@/services/api";

interface Props {
  points: IndicatorPoint[];
  currency: string;
  levels: { high_52w: number | null; low_52w: number | null };
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

export default function PriceWithOverlays({ points, currency, levels }: Props) {
  const [active, setActive] = useState<Set<string>>(
    new Set(OVERLAYS.filter((o) => o.defaultOn).map((o) => o.key))
  );

  const toggle = (key: string) =>
    setActive((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const showBB = active.has("bb");

  // y-domain across everything visible
  const vals: number[] = [];
  for (const p of points) {
    vals.push(p.close);
    if (showBB && p.bb_upper != null) vals.push(p.bb_upper);
    if (showBB && p.bb_lower != null) vals.push(p.bb_lower);
    for (const o of OVERLAYS) {
      if (o.key !== "bb" && active.has(o.key)) {
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
      </div>

      <div className="w-full" style={{ height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fill: "#6B7280", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              minTickGap={48}
            />
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

            {showBB && (
              <>
                <Area yAxisId="price" type="monotone" dataKey="bb_base" stackId="bb" stroke="none" fill="transparent" isAnimationActive={false} />
                <Area
                  yAxisId="price"
                  type="monotone"
                  dataKey="bb_range"
                  stackId="bb"
                  stroke="rgba(56,189,248,0.35)"
                  strokeWidth={1}
                  fill="rgba(56,189,248,0.06)"
                  isAnimationActive={false}
                />
              </>
            )}

            {levels.high_52w && (
              <ReferenceLine yAxisId="price" y={levels.high_52w} stroke="rgba(74,222,128,0.3)" strokeDasharray="4 4"
                label={{ value: "52w high", position: "insideTopRight", fill: "#4ADE80", fontSize: 10 }} />
            )}
            {levels.low_52w && (
              <ReferenceLine yAxisId="price" y={levels.low_52w} stroke="rgba(244,63,94,0.3)" strokeDasharray="4 4"
                label={{ value: "52w low", position: "insideBottomRight", fill: "#F43F5E", fontSize: 10 }} />
            )}

            <Line yAxisId="price" type="monotone" dataKey="close" stroke="#E5E7EB" strokeWidth={2} dot={false}
              activeDot={{ r: 3, fill: "#E5E7EB", stroke: "#0B0F1A", strokeWidth: 2 }} />

            {OVERLAYS.filter((o) => o.key !== "bb" && active.has(o.key)).map((o) => (
              <Line yAxisId="price" key={o.key} type="monotone" dataKey={o.key} stroke={o.color}
                strokeWidth={1.3} dot={false} activeDot={false} connectNulls />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
