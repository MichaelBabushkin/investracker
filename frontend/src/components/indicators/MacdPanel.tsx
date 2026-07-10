"use client";

import {
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { IndicatorPoint } from "@/services/api";

function fmtDate(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", { day: "2-digit", month: "short" });
}

function MacdTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: IndicatorPoint = payload[0].payload;
  if (p.macd == null) return null;
  return (
    <div className="bg-surface-dark border border-white/10 rounded-xl px-3 py-2 shadow-xl">
      <div className="text-xs text-gray-500">{fmtDate(p.date)}</div>
      <div className="text-xs tabular-nums text-gray-200">MACD {p.macd.toFixed(3)}</div>
      {p.macd_signal != null && (
        <div className="text-xs tabular-nums text-warn">Signal {p.macd_signal.toFixed(3)}</div>
      )}
      {p.macd_hist != null && (
        <div className={`text-xs tabular-nums ${p.macd_hist >= 0 ? "text-gain" : "text-loss"}`}>
          Hist {p.macd_hist >= 0 ? "+" : ""}{p.macd_hist.toFixed(3)}
        </div>
      )}
    </div>
  );
}

export default function MacdPanel({ points, syncId }: { points: IndicatorPoint[]; syncId?: string }) {
  const last = [...points].reverse().find((p) => p.macd != null && p.macd_signal != null);
  const bull = last && last.macd! > last.macd_signal!;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-400">MACD (12 / 26 / 9)</span>
        {last && (
          <span className={`text-xs font-semibold ${bull ? "text-gain" : "text-loss"}`}>
            {bull ? "above signal" : "below signal"}
          </span>
        )}
      </div>
      <div className="w-full" style={{ height: 120 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} syncId={syncId} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="date"
              tickFormatter={fmtDate}
              tick={{ fill: "#6B7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              minTickGap={48}
            />
            <YAxis
              tick={{ fill: "#6B7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={56}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <Tooltip content={<MacdTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
            <Bar dataKey="macd_hist" maxBarSize={4} isAnimationActive={false}>
              {points.map((p, i) => (
                <Cell key={i} fill={(p.macd_hist ?? 0) >= 0 ? "#4ADE80" : "#F43F5E"} fillOpacity={0.6} />
              ))}
            </Bar>
            <Line type="monotone" dataKey="macd" stroke="#38BDF8" strokeWidth={1.3} dot={false} activeDot={false} connectNulls />
            <Line type="monotone" dataKey="macd_signal" stroke="#F59E0B" strokeWidth={1.3} dot={false} activeDot={false} connectNulls />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
