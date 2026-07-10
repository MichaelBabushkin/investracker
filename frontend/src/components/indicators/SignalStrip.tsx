"use client";

import { StockIndicators, SignalState } from "@/services/api";

const DOT: Record<SignalState, string> = {
  bullish: "bg-gain",
  bearish: "bg-loss",
  neutral: "bg-gray-500",
};

const TEXT: Record<SignalState, string> = {
  bullish: "text-gain",
  bearish: "text-loss",
  neutral: "text-gray-400",
};

export default function SignalStrip({ data }: { data: StockIndicators }) {
  const { signals, summary } = data;
  const total = summary.bullish + summary.bearish + summary.neutral;

  const headline =
    summary.bullish > summary.bearish
      ? `${summary.bullish} of ${total} indicators lean bullish`
      : summary.bearish > summary.bullish
        ? `${summary.bearish} of ${total} indicators lean bearish`
        : "Indicators are mixed";
  const headlineColor =
    summary.bullish > summary.bearish ? "text-gain" :
    summary.bearish > summary.bullish ? "text-loss" : "text-gray-300";

  return (
    <div className="flex flex-col gap-3">
      <div className={`text-sm font-semibold ${headlineColor}`}>{headline}</div>
      <div className="flex flex-wrap gap-2">
        {signals.map((s) => (
          <div
            key={s.id}
            title={s.detail}
            className="group relative flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-dark-tertiary/40 border border-white/5 cursor-default"
          >
            <span className={`w-2 h-2 rounded-full ${DOT[s.state]}`} />
            <span className="text-xs font-medium text-gray-300">{s.label}</span>
            <span className={`text-[11px] ${TEXT[s.state]}`}>{s.state}</span>
            {/* hover detail */}
            <div className="pointer-events-none absolute left-0 top-full mt-1.5 z-20 hidden group-hover:block w-64 px-3 py-2 rounded-lg bg-surface-dark border border-white/10 shadow-xl text-[11px] text-gray-300 leading-snug">
              {s.detail}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
