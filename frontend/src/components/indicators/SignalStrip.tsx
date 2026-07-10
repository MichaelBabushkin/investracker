"use client";

import { useState } from "react";
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
  const [pinned, setPinned] = useState<string | null>(null);

  const pinnedSignal = signals.find((s) => s.id === pinned) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* Fair headline: show all three counts instead of "X of N" */}
      <div className="text-sm font-semibold flex items-center gap-2 flex-wrap">
        <span className="text-gain">{summary.bullish} bullish</span>
        <span className="text-gray-600">·</span>
        <span className="text-loss">{summary.bearish} bearish</span>
        <span className="text-gray-600">·</span>
        <span className="text-gray-400">{summary.neutral} neutral</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {signals.map((s) => (
          <button
            key={s.id}
            onClick={() => setPinned((p) => (p === s.id ? null : s.id))}
            title={s.detail}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors text-left ${
              pinned === s.id
                ? "bg-surface-dark-tertiary border-white/15"
                : "bg-surface-dark-tertiary/40 border-white/5 hover:border-white/10"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${DOT[s.state]}`} />
            <span className="text-xs font-medium text-gray-300">{s.label}</span>
            <span className={`text-[11px] ${TEXT[s.state]}`}>{s.state}</span>
          </button>
        ))}
      </div>

      {/* Pinned detail — works on touch, never clips */}
      {pinnedSignal && (
        <div className="px-3.5 py-2.5 rounded-lg bg-surface-dark-tertiary/40 border border-white/5 text-xs text-gray-300 leading-relaxed">
          <div>
            <span className={`font-semibold ${TEXT[pinnedSignal.state]}`}>{pinnedSignal.label}: </span>
            {pinnedSignal.detail}
          </div>
          {pinnedSignal.history ? (
            <div className="mt-1.5 pt-1.5 border-t border-white/5 text-gray-400">
              Track record on this stock (~3y): fired{" "}
              <span className="text-gray-200 tabular-nums">{pinnedSignal.history.events}×</span>, avg{" "}
              <span className={`tabular-nums font-medium ${pinnedSignal.history.avg_fwd_pct >= 0 ? "text-gain" : "text-loss"}`}>
                {pinnedSignal.history.avg_fwd_pct >= 0 ? "+" : ""}{pinnedSignal.history.avg_fwd_pct.toFixed(1)}%
              </span>{" "}
              over the next {pinnedSignal.history.fwd_days} trading days,{" "}
              <span className="text-gray-200 tabular-nums">{pinnedSignal.history.win_rate_pct.toFixed(0)}%</span> of the time positive.
            </div>
          ) : (
            <div className="mt-1.5 pt-1.5 border-t border-white/5 text-gray-600">
              Too few historical occurrences on this stock for a track record.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
