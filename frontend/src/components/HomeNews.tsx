"use client";

// Compact, Tape-consistent market-news strip for Home. Text-forward (no heavy
// media cards) so it sits naturally in the dense ledger layout; full media and
// channel management live on /news.

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, ImageIcon } from "lucide-react";
import { telegramAPI } from "@/services/api";
import { TelegramFeedItem } from "@/types/telegram";
import { TapeSection } from "@/components/tape/Tape";

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function fmtCount(n: number | null): string | null {
  if (n == null) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

// Strip lightweight Telegram markdown for a clean one-glance headline.
function plainText(t: string | null): string {
  if (!t) return "";
  return t
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1") // [text](url) → text
    .replace(/\*\*|__|`/g, "")
    .replace(/^_|_$/g, "")
    .replace(/https?:\/\/\S+/g, "")                       // drop bare urls
    .replace(/\s+/g, " ")
    .trim();
}

function ChannelAvatar({ item }: { item: TelegramFeedItem }) {
  const title = item.channel.title || item.channel.username;
  if (item.channel.logo_url) {
    return <img src={item.channel.logo_url} alt={title} className="w-7 h-7 rounded-lg object-cover shrink-0 border border-rule-row" />;
  }
  return (
    <div className="w-7 h-7 rounded-lg shrink-0 bg-surface-dark-tertiary border border-rule-row flex items-center justify-center text-[11px] font-bold text-brand-400">
      {title.charAt(0).toUpperCase()}
    </div>
  );
}

export default function HomeNews() {
  const [feed, setFeed] = useState<TelegramFeedItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    telegramAPI
      .getFeed({ page: 1, page_size: 6 })
      .then((r) => !cancelled && setFeed(r.items))
      .catch(() => !cancelled && setFeed([]));
    return () => { cancelled = true; };
  }, []);

  return (
    <TapeSection
      label="Market news"
      meta={<Link href="/news" className="text-[11px] text-brand-400 hover:text-brand-300 transition-colors">See all →</Link>}
      first
    >
      {feed === null ? (
        <div className="flex flex-col">
          {[...Array(4)].map((_, i) => <div key={i} className="h-12 border-b border-rule-row animate-pulse bg-white/[0.02]" />)}
        </div>
      ) : feed.length === 0 ? (
        <div className="h-8 flex items-center text-[13px] text-label border-b border-rule-row">
          No market news yet. <Link href="/news" className="text-brand-400 hover:underline ml-1">Subscribe to channels →</Link>
        </div>
      ) : (
        <div className="flex flex-col">
          {feed.map((item) => {
            const title = item.channel.title || item.channel.username;
            const views = fmtCount(item.views);
            const text = plainText(item.text);
            return (
              <Link
                key={item.id}
                href="/news"
                className="flex gap-3 py-2.5 border-b border-rule-row hover:bg-white/[0.02] transition-colors group"
              >
                <ChannelAvatar item={item} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-[11px] text-label mb-0.5">
                    <span className="text-figure font-medium truncate max-w-[180px]">{title}</span>
                    <span className="text-rule-section">·</span>
                    <span className="tabular-nums">{timeAgo(item.posted_at)}</span>
                    {item.has_media && <ImageIcon size={11} className="text-label" />}
                    {views && <span className="ml-auto inline-flex items-center gap-1 tabular-nums"><Eye size={11} />{views}</span>}
                  </div>
                  <div className="text-[13px] text-gray-300 leading-snug line-clamp-2 group-hover:text-figure transition-colors" dir="auto">
                    {text || <span className="text-label italic">Media post</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </TapeSection>
  );
}
