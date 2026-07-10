"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { IndicatorPoint } from "@/services/api";

function fmtDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}

function RsiTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: IndicatorPoint = payload[0].payload;
  if (p.rsi == null) return null;
  const zone = p.rsi >= 70 ? "overbought" : p.rsi <= 30 ? "oversold" : "neutral";
  return (
    <div className="bg-surface-dark border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <div className="text-xs text-gray-500">{fmtDate(p.date)}</div>
      <div className="text-sm font-semibold text-gray-100 tabular-nums">
        RSI {p.rsi.toFixed(1)} <span className="text-xs font-normal text-gray-500">{zone}</span>
      </div>
    </div>
  );
}

export default function RsiPanel({ points, syncId }: { points: IndicatorPoint[]; syncId?: string }) {
  const last = [...points].reverse().find((p) => p.rsi != null);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400">RSI (14)</span>
        {last?.rsi != null && (
          <span className={`text-xs font-semibold tabular-nums ${
            last.rsi >= 70 ? "text-loss" : last.rsi <= 30 ? "text-gain" : "text-gray-300"
          }`}>
            {last.rsi.toFixed(1)}
          </span>
        )}
      </div>
      <div className="w-full" style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} syncId={syncId} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tick={false} axisLine={false} tickLine={false} height={2} />
            <YAxis
              domain={[0, 100]}
              ticks={[30, 50, 70]}
              tick={{ fill: "#6B7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={56}
            />
            <Tooltip content={<RsiTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
            <ReferenceArea y1={70} y2={100} fill="rgba(244,63,94,0.05)" />
            <ReferenceArea y1={0} y2={30} fill="rgba(74,222,128,0.05)" />
            <ReferenceLine y={70} stroke="rgba(244,63,94,0.3)" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="rgba(74,222,128,0.3)" strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke="rgba(255,255,255,0.06)" />
            <Line type="monotone" dataKey="rsi" stroke="#38BDF8" strokeWidth={1.5} dot={false}
              activeDot={{ r: 3, fill: "#38BDF8", stroke: "#0B0F1A", strokeWidth: 2 }} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
