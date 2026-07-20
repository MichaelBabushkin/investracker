"use client";

/**
 * Tiny RSI(14) badge for holdings rows.
 * Green = oversold (<30, potential entry), red = overbought (>70), gray = neutral.
 */
export default function RsiBadge({ rsi }: { rsi: number | null | undefined }) {
  if (rsi == null) return null;
  const cls =
    rsi <= 30
      ? "bg-gain/10 text-gain"
      : rsi >= 70
        ? "bg-loss/10 text-loss"
        : "bg-white/5 text-gray-500";
  const title =
    rsi <= 30 ? "Oversold — statistically cheap vs its recent range"
    : rsi >= 70 ? "Overbought — statistically stretched"
    : "Neutral momentum";
  return (
    <span
      title={`RSI(14) ${rsi.toFixed(1)} — ${title}`}
      className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium tabular-nums ${cls}`}
    >
      RSI {Math.round(rsi)}
    </span>
  );
}
