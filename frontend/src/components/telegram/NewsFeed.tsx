"use client";

// The single, reusable news component. Two layouts sharing one fetch/refresh/
// poll core:
//   layout="full"    → the /news experience: header, filter rail, feed,
//                      "your holdings in the news" rail, manage-sources panel.
//   layout="compact" → an embeddable strip (Home, stock pages): eyebrow +
//                      dense rows + "see all".
// Refresh is lazy and cost-aware (see POST /telegram/refresh): trigger on open,
// and — full layout only — poll /feed while the tab is visible.

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RefreshCw, Loader2, Settings2, X } from "lucide-react";
import { telegramAPI, portfolioAPI } from "@/services/api";
import { TelegramFeedItem, TelegramChannel } from "@/types/telegram";
import NewsRow, { HeldSets } from "@/components/telegram/NewsRow";
import ChannelCard from "@/components/telegram/ChannelCard";

const CATEGORIES = ["All", "General", "Stocks", "Crypto", "Forex", "Analysis"];
const POLL_MS = 90_000;
const REFRESH_EVERY_MS = 15 * 60_000;
const LAST_VISIT_KEY = "newsLastVisit";

function fmtSynced(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

interface NewsFeedProps {
  layout?: "full" | "compact";
  ticker?: string;
  title?: string;
  seeAllHref?: string;
  pageSize?: number;
}

export default function NewsFeed({ layout = "full", ticker, title, seeAllHref, pageSize }: NewsFeedProps) {
  const full = layout === "full";
  const size = pageSize ?? (full ? 20 : 6);

  const [feed, setFeed] = useState<TelegramFeedItem[]>([]);
  const [held, setHeld] = useState<HeldSets>({ world: new Set(), israeli: new Set() });
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [mentioned, setMentioned] = useState<Array<{ sym: string; count: number }>>([]);

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
  const heldRef = useRef<HeldSets>(held);
  heldRef.current = held;

  const effectiveTicker = ticker ?? tickerFilter ?? undefined;

  const params = useCallback((pg: number) => {
    const p: any = { page: pg, page_size: size };
    if (full && category !== "All") p.category = category.toLowerCase();
    if (full && holdingsOnly) p.holdings_only = true;
    if (effectiveTicker) p.ticker = effectiveTicker;
    if (full && channelIds.size > 0) p.channel_ids = Array.from(channelIds).join(",");
    return p;
  }, [full, category, holdingsOnly, effectiveTicker, channelIds, size]);

  const fetchFeed = useCallback(async (pg: number, mode: "replace" | "append" | "silent") => {
    if (mode === "replace") setLoading(true);
    if (mode === "append") setLoadingMore(true);
    try {
      const res = await telegramAPI.getFeed(params(pg));
      const items: TelegramFeedItem[] = res.items ?? [];
      if (mode === "append") setFeed((prev) => [...prev, ...items]);
      else {
        if (pg === 1 && lastVisitRef.current) {
          setNewCount(items.filter((i) => new Date(i.posted_at).getTime() > lastVisitRef.current).length);
        }
        setFeed(items);
      }
      setHasMore(items.length === size);
    } catch { /* keep prior */ } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [params, size]);

  // "Your holdings in the news": count held-ticker mentions across the latest
  // unfiltered posts, so the rail is stable regardless of the active filters.
  const computeMentioned = useCallback(async () => {
    const h = heldRef.current;
    const syms = [...Array.from(h.world), ...Array.from(h.israeli)];
    if (syms.length === 0) { setMentioned([]); return; }
    try {
      const res = await telegramAPI.getFeed({ page: 1, page_size: 50 });
      const items: TelegramFeedItem[] = res.items ?? [];
      const counts = syms.map((sym) => {
        const re = new RegExp(`\\b${sym}\\b`, "i");
        return { sym, count: items.filter((i) => i.text && re.test(i.text)).length };
      }).filter((m) => m.count > 0).sort((a, b) => b.count - a.count);
      setMentioned(counts);
    } catch { /* noop */ }
  }, []);

  // Initial load.
  useEffect(() => {
    lastVisitRef.current = Number(localStorage.getItem(LAST_VISIT_KEY)) || 0;
    portfolioAPI.getHoldingsSymbols()
      .then((hs) => { setHeld({ world: new Set(hs.world), israeli: new Set(hs.israeli) }); if (full) setTimeout(computeMentioned, 0); })
      .catch(() => {});
    if (full) telegramAPI.getChannels().then(setChannels).catch(() => {});
    telegramAPI.refresh().then((r) => { setLastSyncedAt(r.last_synced_at); setSyncing(r.syncing); }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch on filter change.
  useEffect(() => { setPage(1); fetchFeed(1, "replace"); }, [fetchFeed]);

  // Full layout: visibility-aware polling.
  useEffect(() => {
    if (!full) return;
    let lastRefresh = Date.now();
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      fetchFeed(1, "silent");
      if (Date.now() - lastRefresh >= REFRESH_EVERY_MS) {
        lastRefresh = Date.now();
        telegramAPI.refresh().then((r) => { setLastSyncedAt(r.last_synced_at); setSyncing(r.syncing); computeMentioned(); }).catch(() => {});
      }
    };
    const onVis = () => document.visibilityState === "visible" && tick();
    const poll = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(poll); document.removeEventListener("visibilitychange", onVis); };
  }, [full, fetchFeed, computeMentioned]);

  useEffect(() => {
    if (!full) return;
    const save = () => localStorage.setItem(LAST_VISIT_KEY, String(Date.now()));
    window.addEventListener("pagehide", save);
    return () => { save(); window.removeEventListener("pagehide", save); };
  }, [full]);

  const manualRefresh = async () => {
    setSyncing(true);
    try {
      const r = await telegramAPI.refresh();
      setLastSyncedAt(r.last_synced_at);
      setTimeout(() => { fetchFeed(1, "silent"); computeMentioned(); }, 4000);
    } catch { /* noop */ } finally { setSyncing(false); }
  };

  const loadMore = () => { const n = page + 1; setPage(n); fetchFeed(n, "append"); };
  const toggleChannel = (id: number) => setChannelIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleSubscription = async (channelId: number, isSubscribed: boolean) => {
    if (isSubscribed) await telegramAPI.subscribe(channelId); else await telegramAPI.unsubscribe(channelId);
    setChannels((prev) => prev.map((c) => (c.id === channelId ? { ...c, is_subscribed: isSubscribed } : c)));
  };

  // ── Compact layout (Home, stock pages) ──
  if (!full) {
    return (
      <section>
        {title && (
          <div className="flex items-baseline justify-between mb-2.5">
            <h2 className="tape-label">{title}</h2>
            {seeAllHref && <Link href={seeAllHref} className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors">See all →</Link>}
          </div>
        )}
        {loading ? (
          <div className="flex flex-col">{[...Array(4)].map((_, i) => <div key={i} className="h-14 border-b border-rule-row animate-pulse bg-white/[0.02]" />)}</div>
        ) : feed.length === 0 ? (
          <div className="h-8 flex items-center text-[13px] text-label border-b border-rule-row">
            {effectiveTicker ? "No recent mentions." : <>No market news yet. <Link href={seeAllHref ?? "/news"} className="text-brand-400 hover:underline ml-1">subscribe to channels →</Link></>}
          </div>
        ) : (
          feed.slice(0, size).map((item) => <NewsRow key={item.id} item={item} held={held} dense />)
        )}
      </section>
    );
  }

  // ── Full layout (/news) ──
  const subscribed = channels.filter((c) => c.is_subscribed);
  const filterLink = (active: boolean) => `text-left text-[12px] transition-colors ${active ? "text-brand-400" : "text-label hover:text-figure"}`;

  return (
    <div>
      {/* Header */}
      <div className="pb-3 border-b-2 border-rule-section flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] font-heading font-bold text-figure leading-none">Market news</h1>
          <span className="text-[13px] text-label">
            {newCount > 0 ? `${newCount} new · ` : ""}synced {fmtSynced(lastSyncedAt)}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setManageOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-label hover:text-figure transition-colors"><Settings2 size={13} /> Manage sources</button>
          <button onClick={manualRefresh} disabled={syncing} className="inline-flex items-center gap-1.5 text-[12px] font-medium text-label hover:text-figure transition-colors disabled:opacity-40"><RefreshCw size={13} className={syncing ? "animate-spin" : ""} /> Refresh</button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_260px] gap-8">
        {/* Left rail */}
        <aside className="hidden lg:flex flex-col gap-6">
          <div>
            <div className="tape-label mb-2">Category</div>
            <div className="flex flex-col gap-1.5">
              {CATEGORIES.map((c) => <button key={c} onClick={() => setCategory(c)} className={filterLink(category === c)}>{c}</button>)}
            </div>
          </div>
          <div>
            <div className="tape-label mb-2">Lens</div>
            <button onClick={() => setHoldingsOnly((v) => !v)} className={filterLink(holdingsOnly)}>{holdingsOnly ? "✓ " : ""}My portfolio only</button>
          </div>
          {subscribed.length > 1 && (
            <div>
              <div className="tape-label mb-2">Sources</div>
              <div className="flex flex-col gap-1.5">
                {subscribed.map((ch) => <button key={ch.id} onClick={() => toggleChannel(ch.id)} className={filterLink(channelIds.has(ch.id))}>{channelIds.has(ch.id) ? "✓ " : ""}{ch.title || ch.username}</button>)}
                {channelIds.size > 0 && <button onClick={() => setChannelIds(new Set())} className="text-[11px] text-label hover:text-figure text-left mt-1">Clear</button>}
              </div>
            </div>
          )}
        </aside>

        {/* Feed */}
        <main className="max-w-[820px] min-w-0">
          <div className="lg:hidden flex items-center gap-3 mb-3 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map((c) => <button key={c} onClick={() => setCategory(c)} className={`text-[12px] whitespace-nowrap ${category === c ? "text-brand-400" : "text-label"}`}>{c}</button>)}
            <button onClick={() => setHoldingsOnly((v) => !v)} className={`text-[12px] whitespace-nowrap ${holdingsOnly ? "text-brand-400" : "text-label"}`}>Portfolio</button>
          </div>

          {tickerFilter && (
            <div className="flex items-center gap-2 mb-2 text-[12px] text-label">
              Only posts mentioning <span className="text-brand-400 font-semibold">${tickerFilter}</span>
              <button onClick={() => setTickerFilter(null)} className="hover:text-figure"><X size={12} /></button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col">{[...Array(6)].map((_, i) => <div key={i} className="h-[70px] border-b border-rule-row animate-pulse bg-white/[0.02]" />)}</div>
          ) : feed.length === 0 ? (
            <div className="py-6 text-[13px] text-label">
              No posts match.{holdingsOnly && " Try turning off the portfolio lens, or "}
              <button onClick={() => setManageOpen(true)} className="text-brand-400 hover:underline ml-1">subscribe to channels →</button>
            </div>
          ) : (
            <>
              {feed.map((item) => <NewsRow key={item.id} item={item} held={held} />)}
              {hasMore && (
                <button onClick={loadMore} disabled={loadingMore} className="w-full py-3 mt-2 text-[13px] font-medium text-label hover:text-figure transition-colors inline-flex items-center justify-center gap-2">
                  {loadingMore ? <><Loader2 size={14} className="animate-spin" /> Loading…</> : `Load ${size} more`}
                </button>
              )}
            </>
          )}
        </main>

        {/* Right rail — holdings in the news */}
        <aside className="hidden lg:block">
          <div className="tape-label mb-2">Your holdings in the news</div>
          {mentioned.length === 0 ? (
            <p className="text-[12px] text-label">None of your holdings were mentioned recently.</p>
          ) : (
            <div className="flex flex-col">
              {mentioned.map((m) => (
                <button
                  key={m.sym}
                  onClick={() => setTickerFilter(tickerFilter === m.sym ? null : m.sym)}
                  className={`flex items-center justify-between h-8 border-b border-rule-row text-left transition-colors ${tickerFilter === m.sym ? "text-brand-400" : "text-figure hover:text-brand-400"}`}
                >
                  <span className="text-[13px] font-medium tabular-nums">${m.sym}</span>
                  <span className="text-[11px] text-label tabular-nums">{m.count} post{m.count > 1 ? "s" : ""}</span>
                </button>
              ))}
            </div>
          )}
        </aside>
      </div>

      {/* Manage sources */}
      {manageOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setManageOpen(false)}>
          <div className="bg-surface-dark-secondary border border-rule-section rounded-lg w-full max-w-2xl my-8">
            <div className="flex items-center justify-between px-5 py-4 border-b border-rule-row">
              <h2 className="text-base font-heading font-semibold text-figure">Manage sources</h2>
              <button onClick={() => setManageOpen(false)} className="p-1.5 rounded text-label hover:text-figure hover:bg-white/5"><X size={18} /></button>
            </div>
            <div className="p-4 flex flex-col gap-1">
              {channels.length === 0 ? <p className="text-[13px] text-label py-6 text-center">No channels available.</p>
                : channels.map((ch) => <ChannelCard key={ch.id} channel={ch} onToggleSubscription={toggleSubscription} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
