import React, { useState } from 'react';
import { TelegramFeedItem } from '@/types/telegram';

interface NewsFeedCardProps {
  item: TelegramFeedItem;
}

export default function NewsFeedCard({ item }: NewsFeedCardProps) {
  const [expanded, setExpanded] = useState(false);

  const title = item.channel.title || item.channel.username;
  const initial = title.charAt(0).toUpperCase();

  // Try parsing the date
  const date = new Date(item.posted_at);
  let timeAgo = '';
  if (!isNaN(date.getTime())) {
    const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diffInSeconds < 60) timeAgo = 'Just now';
    else if (diffInSeconds < 3600) timeAgo = `${Math.floor(diffInSeconds / 60)}m ago`;
    else if (diffInSeconds < 86400) timeAgo = `${Math.floor(diffInSeconds / 3600)}h ago`;
    else timeAgo = `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  return (
    <div className="bg-surface-dark-secondary border border-white/5 rounded-xl p-4 flex flex-col gap-3 hover:border-white/10 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Logo */}
          <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-brand-400/20 flex items-center justify-center text-brand-400 text-sm font-bold border border-white/10">
            {item.channel.logo_url ? (
              <img src={item.channel.logo_url} alt={title} className="w-full h-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          
          <div>
            <div className="text-sm font-medium text-white leading-tight">{title}</div>
            <div className="text-xs text-brand-400/80 leading-tight">@{item.channel.username}</div>
          </div>
        </div>
        
        {/* Time */}
        <div className="text-xs text-gray-500 shrink-0">
          {timeAgo}
        </div>
      </div>

      {/* Text Content */}
      {item.text && (
        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
          <div className={expanded ? '' : 'line-clamp-4'}>
            {item.text}
          </div>
          {item.text.length > 200 && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-brand-400 text-xs font-medium mt-1 hover:underline focus:outline-none"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Media Content */}
      {item.media_url && (
        <div className="mt-1 rounded-lg overflow-hidden border border-white/5 bg-surface-dark">
          {item.media_url.match(/\.(jpeg|jpg|gif|png)$/) != null || 
           item.media_url.includes('jpg') || 
           item.media_url.includes('png') || 
           item.media_url.includes('photo') ? (
            <img 
              src={item.media_url} 
              alt="Telegram Media" 
              className="w-full max-h-48 object-cover" 
              loading="lazy"
            />
          ) : (
            <div className="p-4 text-center text-xs text-gray-500 bg-white/5">
              [Media file: {item.media_url.split('/').pop()}]
            </div>
          )}
        </div>
      )}
    </div>
  );
}
