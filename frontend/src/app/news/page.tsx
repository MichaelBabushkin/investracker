"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw, Loader2, Settings2, X } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { telegramAPI, portfolioAPI } from "@/services/api";
import { TelegramFeedItem, TelegramChannel } from "@/types/telegram";
import NewsRow, { HeldSets } from "@/components/telegram/NewsRow";
import ChannelCard from "@/components/telegram/ChannelCard";

const CATEGORIES = ["All", "General", "Stocks", "Crypto", "Forex", "Analysis"];
const PAGE_SIZE = 20;
const POLL_MS = 90_000;
const REFRESH_EVERY_MS = 15 * 60_000;
const LAST_VISIT_KEY = "newsLastVisit";

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export default function NewsPage() {
  const [feed, setFeed] = useState<TelegramFeedItem[]>([]);
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [held, setHeld] = useState<HeldSets>({ world: new Set(), israeli: new Set() });
  const [heldList, setHeldList] = useState<string[]>([]);

  const [category, setCategory] = useState("All");
  const [holdingsOnly, setHoldingsOnly] = useState(false);
  const [tickerFilter, setTickerFilter] = useState<string | null>(null);
  const [channelIds, setChannelIds] = useState<Set<number>>(new Set());

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const lastVisitRef = useRef<number>(0);

  const buildParams = useCallback((pg: number) => {
    const p: any = { page: pg, page_size: PAGE_SIZE };
    if (category !== "All") p.category = category.toLowerCase();
    if (holdingsOnly) p.holdings_only = true;
    if (tickerFilter) p.ticker = tickerFilter;
    if (channelIds.size > 0) p.channel_ids = Array.from(channelIds).join(",");
    return p;
  }, [category, holdingsOnly, tickerFilter, channelIds]);

  const fetchFeed = useCallback(async (pg: number, mode: "replace" | "append" | "silent") => {
    if (mode === "replace") setLoading(true);
    if (mode === "append") setLoadingMore(true);
    try {
      const res = await telegramAPI.getFeed(buildParams(pg));
      const items: TelegramFeedItem[] = res.items ?? [];
      if (mode === "append") {
        setFeed((prev) => [...prev, ...items]);
      } else {
        // count how many are newer than last visit (only meaningful on page 1)
        if (pg === 1 && lastVisitRef.current) {
          const n = items.filter((i) => new Date(i.posted_at).getTime() > lastVisitRef.current).length;
          setNewCount(n);
        }
        setFeed(items);
      }
      setHasMore(items.length === PAGE_SIZE);
    } catch { /* keep prior */ } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [buildParams]);

  // Initial load: held symbols, channels, feed, and a lazy sync trigger.
  useEffect(() => {
    lastVisitRef.current = Number(localStorage.getItem(LAST_VISIT_KEY)) || 0;
    portfolioAPI.getHoldingsSymbols()
      .then((h) => {
        setHeld({ world: new Set(h.world), israeli: new Set(h.israeli) });
        setHeldList([...h.world, ...h.israeli]);
      })
      .catch(() => {});
    telegramAPI.getChannels().then(setChannels).catch(() => {});
    telegramAPI.refresh()
      .then((r) => { setLastSyncedAt(r.last_synced_at); setSyncing(r.syncing); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch whenever filters change.
  useEffect(() => { setPage(1); fetchFeed(1, "replace"); }, [fetchFeed]);

  // Visibility-aware polling: surface new rows while the tab is open; pause when
  // hidden so we never keep the backend awake in the background.
  useEffect(() => {
    let poll: ReturnType<typeof setInterval> | undefined;
    let lastRefresh = Date.now();
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      fetchFeed(1, "silent");
      if (Date.now() - lastRefresh >= REFRESH_EVERY_MS) {
        lastRefresh = Date.now();
        telegramAPI.refresh().then((r) => { setLastSyncedAt(r.last_synced_at); setSyncing(r.syncing); }).catch(() => {});
      }
    };
    const onVis = () => { if (document.visibilityState === "visible") tick(); };
    poll = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", onVis);
    return () => { if (poll) clearInterval(poll); document.removeEventListener("visibilitychange", onVis); };
  }, [fetchFeed]);

  // Persist the visit timestamp on leave so "N new" resets next time.
  useEffect(() => {
    const save = () => localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
    window.addEventListener("pagehide", save);
    return () => { save(); window.removeEventListener("pagehide", save); };
  }, []);

  const manualRefresh = async () => {
    setSyncing(true);
    try {
      const r = await telegramAPI.refresh();
      setLastSyncedAt(r.last_synced_at);
      setTimeout(() => fetchFeed(1, "silent"), 4000); // give the bg sync a moment
    } catch { /* noop */ } finally {
      setSyncing(false);
    }
  };

  const loadMore = () => { const n = page + 1; setPage(n); fetchFeed(n, "append"); };

  const toggleChannel = (id: number) =>
    setChannelIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const toggleSubscription = async (channelId: number, isSubscribed: boolean) => {
    if (isSubscribed) await telegramAPI.subscribe(channelId);
    else await telegramAPI.unsubscribe(channelId);
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, is_subscribed: isSubscribed } : c)));
  };

  const subscribed = channels.filter((c) => c.is_subscribed);
  const filterLink = (active: boolean) => `text-left text-[12px] transition-colors ${active ? "text-brand-400" : "text-label hover:text-figure"}`;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface-dark px-4 sm:px-6 lg:px-10 py-6">
        {/* Header */}
        <div className="pb-3 border-b-2 border-rule-section flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-baseline gap-3">
            <h1 className="text-[22px] font-heading font-bold text-figure leading-none">Market news</h1>
            <span className="text-[13px] text-label">
              {newCount > 0 ? `${newCount} new since last visit · ` : ""}Telegram · synced {fmtTime(lastSyncedAt)}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setManageOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-label hover:text-figure transition-colors">
              <Settings2 size={13} /> Manage sources
            </button>
            <button onClick={manualRefresh} disabled={syncing} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-label hover:text-figure transition-colors disabled:opacity-40">
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 lg:grid-cols-[216px_minmax(0,1fr)_300px] gap-8">
          {/* Left rail — filters */}
          <aside className="hidden lg:flex flex-col gap-6">
            <div>
              <div className="tape-label mb-2">Category</div>
              <div className="flex flex-col gap-1.5">
                {CATEGORIES.map((c) => (
                  <button key={c} onClick={() => setCategory(c)} className={filterLink(category === c)}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="tape-label mb-2">Lens</div>
              <button onClick={() => setHoldingsOnly((v) => !v)} className={filterLink(holdingsOnly)}>
                {holdingsOnly ? "✓ " : ""}My portfolio only
              </button>
            </div>
            {subscribed.length > 1 && (
              <div>
                <div className="tape-label mb-2">Sources</div>
                <div className="flex flex-col gap-1.5">
                  {subscribed.map((ch) => (
                    <button key={ch.id} onClick={() => toggleChannel(ch.id)} className={filterLink(channelIds.has(ch.id))}>
                      {channelIds.has(ch.id) ? "✓ " : ""}{ch.title || ch.username}
                    </button>
                  ))}
                  {channelIds.size > 0 && <button onClick={() => setChannelIds(new Set())} className="text-[11px] text-label hover:text-figure text-left mt-1">Clear</button>}
                </div>
              </div>
            )}
          </aside>

          {/* Feed */}
          <main className="max-w-[784px] min-w-0">
            {/* mobile filter row */}
            <div className="lg:hidden flex items-center gap-3 mb-3 overflow-x-auto scrollbar-hide">
              {CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`text-[12px] whitespace-nowrap ${category === c ? "text-brand-400" : "text-label"}`}>{c}</button>
              ))}
              <button onClick={() => setHoldingsOnly((v) => !v)} className={`text-[12px] whitespace-nowrap ${holdingsOnly ? "text-brand-400" : "text-label"}`}>Portfolio</button>
            </div>

            {tickerFilter && (
              <div className="flex items-center gap-2 mb-2 text-[12px] text-label">
                Filtering by <span className="text-brand-400 font-semibold">${tickerFilter}</span>
                <button onClick={() => setTickerFilter(null)} className="hover:text-figure"><X size={12} /></button>
              </div>
            )}

            {loading ? (
              <div className="flex flex-col">
                {[...Array(6)].map((_, i) => <div key={i} className="h-[76px] border-b border-rule-row animate-pulse bg-white/[0.02]" />)}
              </div>
            ) : feed.length === 0 ? (
              <div className="h-8 flex items-center text-[13px] text-label border-b border-rule-row">
                No posts match. {holdingsOnly && "Try turning off the portfolio lens, or "}
                <button onClick={() => setManageOpen(true)} className="text-brand-400 hover:underline ml-1">subscribe to channels →</button>
              </div>
            ) : (
              <>
                {feed.map((item) => <NewsRow key={item.id} item={item} held={held} />)}
                {hasMore && (
                  <button onClick={loadMore} disabled={loadingMore} className="w-full py-3 mt-2 text-[13px] font-medium text-label hover:text-figure transition-colors inline-flex items-center justify-center gap-2">
                    {loadingMore ? <><Loader2 size={14} className="animate-spin" /> Loading…</> : "Load 20 more"}
                  </button>
                )}
              </>
            )}
          </main>

          {/* Right rail — portfolio */}
          <aside className="hidden lg:flex flex-col gap-6">
            <div>
              <div className="tape-label mb-2">Your holdings in the news</div>
              {heldList.length === 0 ? (
                <p className="text-[12px] text-label">No holdings yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {heldList.map((sym) => (
                    <button
                      key={sym}
                      onClick={() => setTickerFilter(tickerFilter === sym ? null : sym)}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums transition-colors ${
                        tickerFilter === sym ? "bg-brand-400/20 text-brand-400" : "bg-white/[0.04] text-label hover:text-figure"
                      }`}
                    >
                      ${sym}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-label mt-2 leading-relaxed">Click a ticker to see only posts that mention it.</p>
            </div>
          </aside>
        </div>

        {/* Manage sources panel */}
        {manageOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setManageOpen(false)}>
            <div className="bg-surface-dark-secondary border border-rule-section rounded-lg w-full max-w-2xl my-8">
              <div className="flex items-center justify-between px-5 py-4 border-b border-rule-row">
                <h2 className="text-base font-heading font-semibold text-figure">Manage sources</h2>
                <button onClick={() => setManageOpen(false)} className="p-1.5 rounded text-label hover:text-figure hover:bg-white/5"><X size={18} /></button>
              </div>
              <div className="p-4 flex flex-col gap-1">
                {channels.length === 0 ? (
                  <p className="text-[13px] text-label py-6 text-center">No channels available.</p>
                ) : channels.map((ch) => (
                  <ChannelCard key={ch.id} channel={ch} onToggleSubscription={toggleSubscription} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
