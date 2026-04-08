"use client";

import React, { useState, useEffect } from 'react';
import { TelegramFeedItem, TelegramChannel } from '@/types/telegram';
import { telegramAPI } from '@/services/api';
import NewsFeedCard from './NewsFeedCard';
import ChannelCard from './ChannelCard';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface TelegramNewsFeedProps {
  ticker?: string;
  compact?: boolean;
  showChannelManager?: boolean;
}

const CATEGORIES = ["All", "General", "Stocks", "Crypto", "Forex", "Analysis"];

export default function TelegramNewsFeed({ ticker, compact, showChannelManager }: TelegramNewsFeedProps) {
  const [feed, setFeed] = useState<TelegramFeedItem[]>([]);
  const [channels, setChannels] = useState<TelegramChannel[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [selectedChannelIds, setSelectedChannelIds] = useState<Set<number>>(new Set());

  const subscribedChannels = channels.filter(c => c.is_subscribed);

  const fetchFeed = async (pageNum: number, isLoadMore = false, category?: string, channelIds?: Set<number>) => {
    try {
      setLoadingFeed(true);
      const active = channelIds ?? selectedChannelIds;
      const params: any = { page: pageNum, page_size: compact ? 3 : 10 };
      if (ticker) params.ticker = ticker;
      const cat = category !== undefined ? category : activeCategory;
      if (cat && cat !== "All") params.category = cat.toLowerCase();
      if (active.size > 0) params.channel_ids = Array.from(active).join(',');

      const res = await telegramAPI.getFeed(params);

      if (isLoadMore) {
        setFeed(prev => [...prev, ...res.items]);
      } else {
        setFeed(res.items);
      }

      setHasMore(res.items.length === (compact ? 3 : 10));
    } catch (error) {
      console.error("Failed to fetch telegram feed", error);
    } finally {
      setLoadingFeed(false);
    }
  };

  const fetchChannels = async () => {
    try {
      setLoadingChannels(true);
      const res = await telegramAPI.getChannels();
      setChannels(res);
    } catch (error) {
      console.error("Failed to fetch telegram channels", error);
    } finally {
      setLoadingChannels(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setFeed([]);
    fetchFeed(1, false, activeCategory, selectedChannelIds);
    if (showChannelManager) {
      fetchChannels();
    }
  }, [ticker, showChannelManager, activeCategory]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFeed(nextPage, true, activeCategory);
  };

  const toggleChannelFilter = (channelId: number) => {
    setSelectedChannelIds(prev => {
      const next = new Set(prev);
      if (next.has(channelId)) next.delete(channelId);
      else next.add(channelId);
      setPage(1);
      fetchFeed(1, false, next);
      return next;
    });
  };

  const toggleSubscription = async (channelId: number, isSubscribed: boolean) => {
    try {
      if (isSubscribed) {
        await telegramAPI.subscribe(channelId);
      } else {
        await telegramAPI.unsubscribe(channelId);
      }
      
      // Update local state
      setChannels(prev => 
        prev.map(c => c.id === channelId ? { ...c, is_subscribed: isSubscribed } : c)
      );
      
      // Refresh feed from page 1 since subscriptions changed
      setPage(1);
      fetchFeed(1);
    } catch (error) {
      console.error("Failed to toggle subscription", error);
      throw error;
    }
  };

  // Filter channels based on active category
  const filteredChannels = activeCategory === "All" 
    ? channels 
    : channels.filter(c => c.categories?.some(cat => cat.toLowerCase() === activeCategory.toLowerCase()));

  // Compact Mode (Stock Pages)
  if (compact) {
    return (
      <div className="w-full">
        <h3 className="text-lg font-bold text-white tracking-tight mb-4">News & Mentions</h3>
        <div className="space-y-4">
          {loadingFeed && page === 1 ? (
            <>
              <div className="h-32 bg-[#101522] rounded-2xl animate-pulse border border-white/5" />
              <div className="h-32 bg-[#101522] rounded-2xl animate-pulse border border-white/5" />
            </>
          ) : feed.length === 0 ? (
             <div className="text-sm text-gray-400 py-6 text-center border border-white/5 rounded-2xl border-dashed">
               No recent news mentions found.
             </div>
          ) : (
            <>
              {feed.map(item => <NewsFeedCard key={item.id} item={item} />)}
              <div className="pt-2 text-center">
                <Link href="/" className="text-sm text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1 group">
                  See all news <span className="transition-transform group-hover:translate-x-1">→</span>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // Full Mode (Dashboard)
  return (
    <div className="w-full mt-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
          <div className="text-teal-400 text-[11px] font-bold tracking-widest uppercase mb-1">Market Pulse</div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Telegram Intel</h2>
        </div>
        
        {/* Mobile filters */}
        <div className="flex flex-col gap-2 lg:hidden">
          <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-[13px] font-bold whitespace-nowrap transition-all border
                  ${activeCategory === cat
                    ? 'bg-teal-400 text-black border-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.2)]'
                    : 'bg-[#101522] text-gray-400 border-white/5 hover:text-white hover:bg-white/5'
                  }
                `}
              >
                {cat}
              </button>
            ))}
          </div>
          {subscribedChannels.length > 1 && (
            <div className="flex gap-2 pb-1 overflow-x-auto scrollbar-hide">
              {subscribedChannels.map(ch => {
                const isActive = selectedChannelIds.has(ch.id);
                const label = ch.title || ch.username;
                const initial = label.charAt(0).toUpperCase();
                return (
                  <button
                    key={ch.id}
                    onClick={() => toggleChannelFilter(ch.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all border
                      ${isActive
                        ? 'bg-white/10 text-white border-white/20'
                        : 'bg-[#101522] text-gray-500 border-white/5 hover:text-gray-300'
                      }
                    `}
                  >
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0
                      ${isActive ? 'bg-teal-400 text-black' : 'bg-white/10 text-gray-400'}`}>
                      {initial}
                    </span>
                    {label}
                  </button>
                );
              })}
              {selectedChannelIds.size > 0 && (
                <button
                  onClick={() => { setSelectedChannelIds(new Set()); setPage(1); fetchFeed(1, false, new Set()); }}
                  className="px-3 py-1 rounded-full text-[12px] text-gray-500 border border-dashed border-white/10 whitespace-nowrap"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Feed */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Desktop Filters above feed */}
          <div className="hidden lg:flex flex-col gap-2.5 mb-2">
            <div className="flex gap-2.5 flex-wrap">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-1.5 rounded-full text-[13px] font-bold transition-all border
                    ${activeCategory === cat
                      ? 'bg-teal-400 text-black border-teal-400 shadow-[0_0_15px_rgba(45,212,191,0.2)]'
                      : 'bg-[#101522] text-gray-400 border-[#232A3B] hover:text-white hover:bg-white/5'
                    }
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>
            {/* Channel filter pills — only shown when subscribed to 2+ channels */}
            {subscribedChannels.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {subscribedChannels.map(ch => {
                  const isActive = selectedChannelIds.has(ch.id);
                  const label = ch.title || ch.username;
                  const initial = label.charAt(0).toUpperCase();
                  return (
                    <button
                      key={ch.id}
                      onClick={() => toggleChannelFilter(ch.id)}
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold transition-all border
                        ${isActive
                          ? 'bg-white/10 text-white border-white/20'
                          : 'bg-[#101522] text-gray-500 border-[#232A3B] hover:text-gray-300 hover:bg-white/5'
                        }
                      `}
                    >
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0
                        ${isActive ? 'bg-teal-400 text-black' : 'bg-white/10 text-gray-400'}`}>
                        {initial}
                      </span>
                      {label}
                    </button>
                  );
                })}
                {selectedChannelIds.size > 0 && (
                  <button
                    onClick={() => { setSelectedChannelIds(new Set()); setPage(1); fetchFeed(1, false, new Set()); }}
                    className="px-3 py-1 rounded-full text-[12px] text-gray-500 border border-dashed border-white/10 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}
          </div>

          {loadingFeed && page === 1 ? (
            <div className="space-y-4">
              <div className="h-48 bg-[#101522] rounded-2xl animate-pulse border border-[#232A3B]" />
              <div className="h-40 bg-[#101522] rounded-2xl animate-pulse border border-[#232A3B]" />
              <div className="h-64 bg-[#101522] rounded-2xl animate-pulse border border-[#232A3B]" />
            </div>
          ) : feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-[#101522] border border-white/5 border-dashed rounded-2xl">
              <p className="text-gray-400 mb-2 font-medium">Subscribe to channels to start reading financial news</p>
            </div>
          ) : (
            <>
              {feed.map(item => <NewsFeedCard key={item.id} item={item} />)}
              
              {hasMore && (
                <button 
                  onClick={loadMore}
                  disabled={loadingFeed}
                  className="w-full py-3 mt-2 text-sm font-bold text-white bg-[#101522] border border-[#232A3B] rounded-2xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                >
                  {loadingFeed ? (
                    <><Loader2 size={16} className="animate-spin text-teal-400" /> Loading...</>
                  ) : (
                    'Load more'
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* Right Column: Channels Manager (Discover) */}
        {showChannelManager && (
          <div className="space-y-6 lg:pl-4">
            
            <div className="sticky top-24">
              <h3 className="text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-3 px-1">
                Discover
              </h3>
              
              {loadingChannels ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="text-[13px] text-gray-500 py-4 px-1">
                  No channels found for this category.
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {filteredChannels.map(channel => (
                    <ChannelCard 
                      key={channel.id} 
                      channel={channel} 
                      onToggleSubscription={toggleSubscription} 
                    />
                  ))}
                </div>
              )}

              {/* Placeholder for trending to match screenshot perfectly */}
              <div className="mt-8">
                <h3 className="text-[11px] font-bold tracking-widest text-gray-500 uppercase mb-3 px-1">
                  Trending
                </h3>
                <div className="bg-[#101522] border border-[#232A3B] p-4 rounded-2xl">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-teal-400 uppercase bg-teal-400/10 px-1.5 py-0.5 rounded">Hot</span>
                    <span className="text-[10px] text-gray-500">#BTCUSD</span>
                  </div>
                  <div className="text-[13px] font-semibold text-white mt-1">Spot BTC ETF Approval News</div>
                  <div className="text-[11px] text-gray-500 mt-1">7.4k posts in last hour</div>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
