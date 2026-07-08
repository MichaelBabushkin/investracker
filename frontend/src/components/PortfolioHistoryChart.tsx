"use client";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { HistoryPoint } from "@/services/api";

interface Props {
  points: HistoryPoint[];
  startValue?: number | null;
}

const BM_STYLE: Record<string, { label: string; color: string }> = {
  bm_ta125: { label: "TA-125", color: "#F59E0B" },
  bm_sp500: { label: "S&P 500", color: "#818CF8" },
};

function fmtILS(v: number): string {
  if (Math.abs(v) >= 1_000_000)
    return `₪${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000)
    return `₪${(v / 1_000).toFixed(1)}K`;
  return `₪${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
  });
}

function fmtDateLong(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// Custom tooltip
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const p: HistoryPoint = payload[0].payload;
  const total = p.total_ils;
  return (
    <div className="bg-surface-dark border border-white/10 rounded-xl px-4 py-3 shadow-xl min-w-[180px]">
      <div className="text-xs text-gray-500 mb-2">{fmtDateLong(p.date)}</div>
      <div className="text-base font-bold text-gray-100 tabular-nums mb-2">
        {fmtILS(total)}
      </div>
      {(p.israeli_ils > 0 || p.world_ils > 0) && (
        <div className="flex flex-col gap-1">
          {p.israeli_ils > 0 && (
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-brand-400">🇮🇱 Israeli</span>
              <span className="tabular-nums text-gray-200">{fmtILS(p.israeli_ils)}</span>
            </div>
          )}
          {p.world_ils > 0 && (
            <div className="flex justify-between gap-4 text-xs">
              <span className="text-info">🌍 World</span>
              <span className="tabular-nums text-gray-200">{fmtILS(p.world_ils)}</span>
            </div>
          )}
          {(Object.keys(BM_STYLE) as Array<keyof typeof BM_STYLE>).map((k) => {
            const v = (p as any)[k];
            if (v == null) return null;
            return (
              <div key={k} className="flex justify-between gap-4 text-xs">
                <span style={{ color: BM_STYLE[k].color }}>{BM_STYLE[k].label}</span>
                <span className="tabular-nums text-gray-400">{fmtILS(v)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Tick formatter: skip ticks so x-axis doesn't overcrowd
function buildTickIndices(points: HistoryPoint[], maxTicks = 8): Set<number> {
  if (points.length <= maxTicks) return new Set(points.map((_, i) => i));
  const step = Math.ceil(points.length / maxTicks);
  const indices = new Set<number>();
  for (let i = 0; i < points.length; i += step) indices.add(i);
  indices.add(points.length - 1); // always show last
  return indices;
}

export default function PortfolioHistoryChart({ points, startValue }: Props) {
  if (!points.length) return null;

  const tickIndices = buildTickIndices(points);
  const tickFormatter = (_: any, index: number) =>
    tickIndices.has(index) ? fmtDate(points[index].date) : "";

  const activeBms = (Object.keys(BM_STYLE) as Array<keyof typeof BM_STYLE>).filter(
    (k) => points.some((p) => (p as any)[k] != null)
  );
  const values = points.flatMap((p) => [
    p.total_ils,
    ...activeBms.map((k) => (p as any)[k]).filter((v: number | undefined) => v != null),
  ]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const padding = (maxVal - minVal) * 0.08 || maxVal * 0.05;
  const yMin = Math.floor((minVal - padding) / 1000) * 1000;
  const yMax = Math.ceil((maxVal + padding) / 1000) * 1000;

  // Determine line colour by overall direction
  const first = values[0];
  const last = values[values.length - 1];
  const isPositive = last >= first;
  const lineColor = isPositive ? "#4ADE80" : "#F43F5E";
  const gradientId = isPositive ? "gainGradient" : "lossGradient";
  const gradientColor = isPositive ? "#4ADE80" : "#F43F5E";

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={points}
          margin={{ top: 8, right: 8, left: 8, bottom: 4 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={gradientColor} stopOpacity={0.18} />
              <stop offset="85%" stopColor={gradientColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.04)"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tickFormatter={tickFormatter}
            tick={{ fill: "#6B7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />

          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={(v) => fmtILS(v)}
            tick={{ fill: "#6B7280", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={72}
          />

          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
          />

          {/* Reference line at period-start value */}
          {startValue != null && startValue > 0 && (
            <ReferenceLine
              y={startValue}
              stroke="rgba(255,255,255,0.12)"
              strokeDasharray="4 4"
            />
          )}

          <Area
            type="monotone"
            dataKey="total_ils"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 4,
              fill: lineColor,
              stroke: "#0B0F1A",
              strokeWidth: 2,
            }}
          />

          {activeBms.map((k) => (
            <Line
              key={k}
              type="monotone"
              dataKey={k}
              stroke={BM_STYLE[k].color}
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              activeDot={false}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>

      {activeBms.length > 0 && (
        <div className="flex items-center gap-4 mt-1 px-2">
          <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
            <span className="inline-block w-4 h-0.5 rounded" style={{ background: lineColor }} />
            Portfolio
          </span>
          {activeBms.map((k) => (
            <span key={k} className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <span
                className="inline-block w-4 h-0.5 rounded"
                style={{ background: BM_STYLE[k].color }}
              />
              {BM_STYLE[k].label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
