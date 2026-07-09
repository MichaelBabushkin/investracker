"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { HistoryPoint, AnalyticsTransaction } from "@/services/api";

interface Props {
  points: HistoryPoint[];
  transactions: AnalyticsTransaction[];
}

interface MonthRow {
  month: string;        // "2026-03"
  label: string;        // "Mar 26"
  returnPct: number;
  changeIls: number;
  flowsIls: number;
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7);
}

function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${names[parseInt(m, 10) - 1]} ${y.slice(2)}`;
}

/**
 * Flow-adjusted monthly returns (simple Modified Dietz):
 *   r = (V_end - V_start - F) / (V_start + F/2)
 * where F = net money moved into securities that month (buys - sells).
 * Without this, months where you deposit money look like huge "gains".
 */
function buildMonthlyReturns(points: HistoryPoint[], transactions: AnalyticsTransaction[]): MonthRow[] {
  if (points.length < 2) return [];

  // Last portfolio value of each month
  const lastOfMonth = new Map<string, number>();
  for (const p of points) lastOfMonth.set(monthKey(p.date), p.total_ils);

  // Net flows per month: buys add money to securities, sells remove
  const flows = new Map<string, number>();
  for (const t of transactions) {
    const k = monthKey(t.date);
    if (t.type === "BUY") flows.set(k, (flows.get(k) ?? 0) + t.total_value_ils);
    else if (t.type === "SELL") flows.set(k, (flows.get(k) ?? 0) - t.total_value_ils);
  }

  const months = Array.from(lastOfMonth.keys()).sort();
  const rows: MonthRow[] = [];
  let prevValue = points[0].total_ils;

  for (const m of months) {
    const endValue = lastOfMonth.get(m)!;
    const f = flows.get(m) ?? 0;
    const denom = prevValue + f / 2;
    if (denom > 1) {
      rows.push({
        month: m,
        label: monthLabel(m),
        returnPct: ((endValue - prevValue - f) / denom) * 100,
        changeIls: endValue - prevValue,
        flowsIls: f,
      });
    }
    prevValue = endValue;
  }
  return rows;
}

function fmtILS(v: number): string {
  const sign = v < 0 ? "-" : "+";
  const abs = Math.abs(v);
  if (abs >= 1000) return `${sign}₪${(abs / 1000).toFixed(1)}K`;
  return `${sign}₪${abs.toFixed(0)}`;
}

function StripTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const row: MonthRow = payload[0].payload;
  return (
    <div className="bg-surface-dark border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <div className="text-xs text-gray-500 mb-1">{row.label}</div>
      <div className={`text-base font-bold tabular-nums ${row.returnPct >= 0 ? "text-gain" : "text-loss"}`}>
        {row.returnPct >= 0 ? "+" : ""}{row.returnPct.toFixed(2)}%
      </div>
      <div className="text-xs text-gray-400 tabular-nums mt-1">Value change {fmtILS(row.changeIls)}</div>
      {Math.abs(row.flowsIls) > 1 && (
        <div className="text-[11px] text-gray-600 tabular-nums">
          net invested {fmtILS(row.flowsIls)} (excluded)
        </div>
      )}
    </div>
  );
}

export default function MonthlyReturnsStrip({ points, transactions }: Props) {
  const rows = buildMonthlyReturns(points, transactions);
  if (rows.length < 2) {
    return (
      <div className="flex items-center justify-center h-[140px] text-gray-600 text-xs">
        Select a period of two months or more
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height: 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fill: "#6B7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            interval={rows.length > 18 ? Math.floor(rows.length / 12) : 0}
          />
          <YAxis
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#6B7280", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<StripTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
          <Bar dataKey="returnPct" radius={[3, 3, 0, 0]} maxBarSize={28}>
            {rows.map((r) => (
              <Cell key={r.month} fill={r.returnPct >= 0 ? "#4ADE80" : "#F43F5E"} fillOpacity={0.75} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
