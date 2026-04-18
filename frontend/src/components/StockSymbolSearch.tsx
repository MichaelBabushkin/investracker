"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { israeliStocksAPI, worldStocksAPI } from "@/services/api";

interface StockOption {
  symbol: string;
  company_name: string;
}

type Market = "israeli" | "international";

interface StockSymbolSearchProps {
  market: Market;
  value: string;
  onChange: (symbol: string, companyName: string) => void;
  required?: boolean;
}

// ── Module-level caches (live for the browser session) ──────────────────────
const israeliCache: { loaded: boolean; loading: boolean; stocks: StockOption[] } = {
  loaded: false,
  loading: false,
  stocks: [],
};
const worldQueryCache = new Map<string, StockOption[]>();
// ────────────────────────────────────────────────────────────────────────────

export default function StockSymbolSearch({
  market,
  value,
  onChange,
  required,
}: StockSymbolSearchProps) {
  const [query, setQuery] = useState(value);
  const [options, setOptions] = useState<StockOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // ── Close dropdown on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Reset when parent clears the value (e.g. market switch) ─────────────
  useEffect(() => {
    if (!value) {
      setQuery("");
      setOptions([]);
    }
  }, [value]);

  // ── Israeli: load full catalog once, then filter client-side ─────────────
  const ensureIsraeliLoaded = useCallback(async () => {
    if (israeliCache.loaded || israeliCache.loading) return;
    israeliCache.loading = true;
    try {
      const data = await israeliStocksAPI.searchStocks("", 500);
      israeliCache.stocks = data;
      israeliCache.loaded = true;
    } catch {
      // silent — user will just see no suggestions
    } finally {
      israeliCache.loading = false;
    }
  }, []);

  const filterIsraeli = useCallback((q: string): StockOption[] => {
    if (!q) return israeliCache.stocks.slice(0, 8);
    const lower = q.toLowerCase();
    const exact: StockOption[] = [];
    const partial: StockOption[] = [];
    for (const s of israeliCache.stocks) {
      if (s.symbol.toLowerCase().startsWith(lower)) exact.push(s);
      else if (
        s.symbol.toLowerCase().includes(lower) ||
        s.company_name.toLowerCase().includes(lower)
      )
        partial.push(s);
      if (exact.length + partial.length >= 15) break;
    }
    return [...exact, ...partial].slice(0, 15);
  }, []);

  // ── World: debounced server search + query cache ─────────────────────────
  const searchWorld = useCallback(async (q: string) => {
    if (q.length < 2) {
      setOptions([]);
      return;
    }
    const key = q.toLowerCase();
    if (worldQueryCache.has(key)) {
      setOptions(worldQueryCache.get(key)!);
      return;
    }
    setLoading(true);
    try {
      const data = await worldStocksAPI.searchStocks(q, 15);
      worldQueryCache.set(key, data);
      setOptions(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Focus handler ─────────────────────────────────────────────────────────
  const handleFocus = async () => {
    setOpen(true);
    setActiveIdx(-1);
    if (market === "israeli") {
      setLoading(!israeliCache.loaded);
      await ensureIsraeliLoaded();
      setLoading(false);
      setOptions(filterIsraeli(query));
    } else if (query.length >= 2) {
      await searchWorld(query);
    }
  };

  // ── Input change ──────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value.toUpperCase();
    setQuery(q);
    setOpen(true);
    setActiveIdx(-1);
    // Clear parent selection until user picks from list
    onChange("", "");

    if (market === "israeli") {
      if (israeliCache.loaded) setOptions(filterIsraeli(q));
    } else {
      clearTimeout(debounceRef.current);
      if (q.length < 2) { setOptions([]); return; }
      debounceRef.current = setTimeout(() => searchWorld(q), 350);
    }
  };

  // ── Select an option ──────────────────────────────────────────────────────
  const handleSelect = (opt: StockOption) => {
    setQuery(opt.symbol);
    onChange(opt.symbol, opt.company_name);
    setOpen(false);
    setActiveIdx(-1);
  };

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || options.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && options[activeIdx]) handleSelect(options[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // ── Scroll active item into view ──────────────────────────────────────────
  useEffect(() => {
    if (activeIdx >= 0 && listRef.current) {
      const item = listRef.current.children[activeIdx] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  const showDropdown = open && (options.length > 0 || loading);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onKeyDown={handleKeyDown}
        placeholder={market === "israeli" ? "e.g. TEVA" : "e.g. AAPL"}
        autoComplete="off"
        required={required}
        className="w-full px-3 py-2 bg-surface-dark border border-white/10 rounded-lg text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-brand-400/40"
      />

      {showDropdown && (
        <ul
          ref={listRef}
          className="absolute z-50 top-full mt-1 w-full max-h-52 overflow-y-auto bg-surface-dark-secondary border border-white/10 rounded-lg shadow-2xl"
        >
          {loading && options.length === 0 && (
            <li className="px-3 py-2 text-xs text-gray-500">Searching…</li>
          )}
          {options.map((opt, i) => (
            <li
              key={opt.symbol}
              onMouseDown={() => handleSelect(opt)}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer transition-colors ${
                i === activeIdx
                  ? "bg-brand-400/10 text-brand-400"
                  : "text-gray-300 hover:bg-white/5"
              }`}
            >
              <span className="font-semibold text-xs tracking-wide shrink-0">
                {opt.symbol}
              </span>
              <span className="text-gray-500 text-xs truncate ml-3 text-right">
                {opt.company_name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
