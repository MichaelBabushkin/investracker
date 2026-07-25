"use client";

// A stock reference: logo + symbol (+ optional name), linking to the detail page.
// Use this anywhere a stock is mentioned so references are consistent and clickable.
//
// Logos come from one cached map fetched once per session (portfolioAPI.getStockLogos),
// deduped across every StockLink on the page — no per-row requests.

import React from "react";
import Link from "next/link";
import { portfolioAPI, StockLogoMap } from "@/services/api";
import StockLogo from "@/components/StockLogo";

// ── Module-level cache + in-flight dedupe ──
let cache: StockLogoMap | null = null;
let inflight: Promise<StockLogoMap> | null = null;
const subscribers = new Set<(m: StockLogoMap) => void>();

function loadLogos(): Promise<StockLogoMap> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;
  inflight = portfolioAPI.getStockLogos()
    .then((m) => {
      cache = m;
      subscribers.forEach((fn) => fn(m));
      return m;
    })
    .catch(() => {
      const empty: StockLogoMap = { world: {}, israeli: {} };
      cache = empty;
      return empty;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export function useStockLogos(): StockLogoMap | null {
  const [map, setMap] = React.useState<StockLogoMap | null>(cache);
  React.useEffect(() => {
    if (cache) { setMap(cache); return; }
    let active = true;
    const cb = (m: StockLogoMap) => active && setMap(m);
    subscribers.add(cb);
    loadLogos();
    return () => { subscribers.delete(cb); };
  }, []);
  return map;
}

/** world → the bare ticker (analytics may pass "NKE US"); israeli → the symbol. */
function normalizeSymbol(symbol: string, market: "israeli" | "world"): string {
  const s = symbol.trim().toUpperCase();
  return market === "world" ? s.split(/\s+/)[0] : s;
}

export function stockHref(symbol: string, market: "israeli" | "world"): string {
  const key = normalizeSymbol(symbol, market);
  return market === "israeli" ? `/stock/il/${encodeURIComponent(key)}` : `/stock/${encodeURIComponent(key)}`;
}

interface StockLinkProps {
  symbol: string;
  market: "israeli" | "world";
  name?: string | null;
  /** show the company/security name beside the symbol */
  showName?: boolean;
  /** show the logo (default true) */
  showLogo?: boolean;
  size?: "xs" | "sm";
  className?: string;
  /** override the symbol text styling */
  symbolClassName?: string;
  nameClassName?: string;
}

export default function StockLink({
  symbol, market, name, showName = false, showLogo = true,
  size = "xs", className = "", symbolClassName = "", nameClassName = "",
}: StockLinkProps) {
  const logos = useStockLogos();
  const key = normalizeSymbol(symbol, market);
  const world = logos?.world?.[key];
  const il = logos?.israeli?.[key];
  const logoUrl = market === "world" ? world : il?.url;
  const logoSvg = market === "israeli" ? il?.svg : undefined;
  const logoPx = size === "sm" ? "!w-6 !h-6" : "!w-5 !h-5";

  return (
    <Link
      href={stockHref(symbol, market)}
      className={`group inline-flex items-center gap-2 min-w-0 ${className}`}
      title={`${symbol}${name ? ` · ${name}` : ""}`}
    >
      {showLogo && (
        <StockLogo symbol={key} logoUrl={logoUrl} logoSvg={logoSvg} size="xs" className={`${logoPx} shrink-0`} />
      )}
      <span className="inline-flex items-baseline gap-2 min-w-0">
        <span className={`font-medium text-figure group-hover:text-brand-400 transition-colors ${symbolClassName || "text-[13px]"}`}>{symbol}</span>
        {showName && name && name !== symbol && (
          <span className={`text-label truncate ${nameClassName || "text-[11px]"}`} dir="auto">{name}</span>
        )}
      </span>
    </Link>
  );
}
