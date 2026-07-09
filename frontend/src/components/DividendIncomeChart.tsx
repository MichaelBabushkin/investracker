"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { portfolioAPI, DividendEvent, AnalyticsMarket } from "@/services/api";

interface Props {
  start: string;
  end: string;
  market: AnalyticsMarket;
}

function fmtILS(v: number): string {
  if (Math.abs(v) >= 1000) return `₪${(v / 1000).toFixed(1)}K`;
  return `₪${v.toFixed(0)}`;
}

function fmtDateLong(s: string): string {
  return new Date(s + "T00:00:00").toLocaleDateString("en-US", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function DivTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p: DividendEvent = payload[0].payload;
  return (
    <div className="bg-surface-dark border border-white/10 rounded-xl px-4 py-3 shadow-xl">
      <div className="text-xs text-gray-500 mb-1">{fmtDateLong(p.date)}</div>
      <div className="text-sm font-semibold text-gray-100">
        {p.symbol} <span className={p.market === "israeli" ? "text-brand-400" : "text-info"}>
          {p.market === "israeli" ? "🇮🇱" : "🌍"}
        </span>
      </div>
      <div className="text-xs text-gray-300 tabular-nums mt-1">+{fmtILS(p.net_ils)} net</div>
      <div className="text-[11px] text-gray-500 tabular-nums">cumulative {fmtILS(p.cumulative_ils)}</div>
    </div>
  );
}

export default function DividendIncomeChart({ start, end, market }: Props) {
  const [items, setItems] = useState<DividendEvent[] | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!start || !end || start > end) return;
    let cancelled = false;
    setLoading(true);
    portfolioAPI
      .getDividendHistory(start, end, market)
      .then((r) => {
        if (cancelled) return;
        setItems(r.items);
        setTotal(r.total_net_ils);
      })
      .catch(() => !cancelled && setItems([]))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [start, end, market]);

  if (loading) {
    return <div className="animate-pulse bg-white/5 rounded-lg h-[140px]" />;
  }
  if (!items || items.length < 2) {
    return (
      <div className="flex items-center justify-center h-[140px] text-gray-600 text-xs">
        {items !== null ? "No dividends in this period" : ""}
      </div>
    );
  }

  return (
    <div>
      <div className="text-lg font-semibold text-gain tabular-nums mb-1">
        +{fmtILS(total)}
        <span className="text-xs font-normal text-gray-500 ml-2">{items.length} payments</span>
      </div>
      <div className="w-full" style={{ height: 116 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={items} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
            <defs>
              <linearGradient id="divGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.2} />
                <stop offset="90%" stopColor="#4ADE80" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis
              tickFormatter={fmtILS}
              tick={{ fill: "#6B7280", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip content={<DivTooltip />} cursor={{ stroke: "rgba(255,255,255,0.1)" }} />
            <Area
              type="stepAfter"
              dataKey="cumulative_ils"
              stroke="#4ADE80"
              strokeWidth={1.5}
              fill="url(#divGradient)"
              dot={false}
              activeDot={{ r: 3, fill: "#4ADE80", stroke: "#0B0F1A", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
