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

  const fetchFeed = async (pageNum: number, isLoadMore = false) => {
    try {
      setLoadingFeed(true);
      const params: any = { page: pageNum, page_size: compact ? 3 : 10 };
      if (ticker) params.ticker = ticker;
      
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
    fetchFeed(1);
    if (showChannelManager) {
      fetchChannels();
    }
  }, [ticker, showChannelManager]);

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchFeed(nextPage, true);
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
    : channels.filter(c => c.category?.toLowerCase() === activeCategory.toLowerCase());

  // Compact Mode (Stock Pages)
  if (compact) {
    return (
      <div className="w-full">
        <h3 className="text-lg font-semibold text-white mb-4">News & Mentions</h3>
        <div className="space-y-4">
          {loadingFeed && page === 1 ? (
            <>
              <div className="h-24 bg-surface-dark-secondary rounded-xl animate-pulse border border-white/5" />
              <div className="h-24 bg-surface-dark-secondary rounded-xl animate-pulse border border-white/5" />
            </>
          ) : feed.length === 0 ? (
             <div className="text-sm text-gray-400 py-6 text-center border border-white/5 rounded-xl border-dashed">
               No recent news mentions found.
             </div>
          ) : (
            <>
              {feed.map(item => <NewsFeedCard key={item.id} item={item} />)}
              <div className="pt-2 text-center">
                <Link href="/" className="text-sm text-brand-400 hover:text-brand-300 font-medium inline-flex items-center gap-1 group">
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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Market News Feed</h2>
        
        {/* Mobile-only toggle for channels */}
        <div className="flex gap-2 pb-2 overflow-x-auto scrollbar-hide lg:hidden">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border
                  ${activeCategory === cat 
                    ? 'bg-brand-400/10 text-brand-400 border-brand-400/20' 
                    : 'bg-surface-dark-secondary text-gray-400 border-white/5 hover:text-white hover:border-white/10'
                  }
                `}
              >
                {cat}
              </button>
            ))}
          </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Feed */}
        <div className="lg:col-span-2 space-y-4">
          
          {loadingFeed && page === 1 ? (
            <div className="space-y-4">
              <div className="h-40 bg-surface-dark-secondary rounded-xl animate-pulse border border-white/5" />
              <div className="h-32 bg-surface-dark-secondary rounded-xl animate-pulse border border-white/5" />
              <div className="h-48 bg-surface-dark-secondary rounded-xl animate-pulse border border-white/5" />
            </div>
          ) : feed.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-surface-dark-secondary border border-white/5 border-dashed rounded-xl">
              <p className="text-gray-400 mb-2">Subscribe to channels to start reading financial news</p>
            </div>
          ) : (
            <>
              {feed.map(item => <NewsFeedCard key={item.id} item={item} />)}
              
              {hasMore && (
                <button 
                  onClick={loadMore}
                  disabled={loadingFeed}
                  className="w-full py-3 mt-4 text-sm font-medium text-white bg-surface-dark-secondary border border-white/10 rounded-xl hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                >
                  {loadingFeed ? (
                    <><Loader2 size={16} className="animate-spin text-brand-400" /> Loading...</>
                  ) : (
                    'Load more'
                  )}
                </button>
              )}
            </>
          )}
        </div>

        {/* Right Column: Channels Manager */}
        {showChannelManager && (
          <div className="space-y-4">
            
            {/* Desktop Filters */}
            <div className="hidden lg:flex gap-2 flex-wrap mb-4">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border
                    ${activeCategory === cat 
                      ? 'bg-brand-400/10 text-brand-400 border-brand-400/20' 
                      : 'bg-surface-dark-secondary text-gray-400 border-white/5 hover:text-white hover:border-white/10'
                    }
                  `}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="bg-surface-dark-secondary border border-white/5 rounded-xl p-4 sticky top-20 max-h-[80vh] overflow-y-auto">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center justify-between">
                <span>Manage Subscriptions</span>
                <span className="text-xs font-normal text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                  {filteredChannels.length} channels
                </span>
              </h3>
              
              {loadingChannels ? (
                <div className="space-y-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="h-14 bg-white/5 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : filteredChannels.length === 0 ? (
                <div className="text-xs text-gray-500 text-center py-6">
                  No channels found for this category
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredChannels.map(channel => (
                    <ChannelCard 
                      key={channel.id} 
                      channel={channel} 
                      onToggleSubscription={toggleSubscription} 
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
