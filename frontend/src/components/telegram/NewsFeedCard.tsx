import React, { useState } from 'react';
import { TelegramFeedItem } from '@/types/telegram';
import { MessageSquare, Share2, Eye } from 'lucide-react';

interface NewsFeedCardProps {
  item: TelegramFeedItem;
}

export default function NewsFeedCard({ item }: NewsFeedCardProps) {
  const [expanded, setExpanded] = useState(false);

  const title = item.channel.title || item.channel.username;
  const initial = title.charAt(0).toUpperCase();
  const isHebrew = item.text ? /[\u0590-\u05FF]/.test(item.text) : false;

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

  // Highlight $TICKER and #HASHTAG
  const renderTextWithHighlights = (text: string) => {
    return text.split(/([\s\n]+)/).map((word, i) => {
      if ((word.startsWith('$') || word.startsWith('#')) && word.length > 1) {
        return <span key={i} className="text-teal-400 font-medium">{word}</span>;
      }
      return word;
    });
  };

  // Mock numbers for frontend aesthetic if missing
  const views = Math.floor(Math.random() * 50) / 10 + "k";
  const comments = Math.floor(Math.random() * 100) + 12;

  return (
    <div className="bg-[#101522] border border-[#232A3B] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 hover:border-white/10 hover:shadow-lg hover:shadow-black/20 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-surface-dark flex items-center justify-center text-teal-400 text-lg font-bold border border-white/5">
          {item.channel.logo_url ? (
            <img src={item.channel.logo_url} alt={title} className="w-full h-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[15px] font-semibold text-white truncate">{title}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-brand-400/70 truncate">
            <span>@{item.channel.username}</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>{timeAgo}</span>
          </div>
        </div>
      </div>

      {/* Text Content */}
      {item.text && (
        <div 
          className={`text-[14px] text-gray-300/90 leading-relaxed whitespace-pre-wrap mt-1 ${isHebrew ? 'text-right' : 'text-left'}`}
          dir={isHebrew ? 'rtl' : 'ltr'}
        >
          <div className={expanded ? '' : 'line-clamp-4'}>
            {renderTextWithHighlights(item.text)}
          </div>
          {item.text.length > 200 && (
            <button 
              onClick={() => setExpanded(!expanded)}
              className="text-teal-400 text-xs font-semibold mt-1.5 hover:underline focus:outline-none"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </div>
      )}

      {/* Media Content */}
      {item.media_url && (
        <div className="mt-1 rounded-xl overflow-hidden border border-white/5 bg-[#0B0F1A]">
          {item.media_url.match(/\.(jpeg|jpg|gif|png)$/i) != null || 
           item.media_url.includes('jpg') || 
           item.media_url.includes('png') || 
           item.media_url.includes('photo') ? (
            <img 
              src={item.media_url} 
              alt="Telegram Media" 
              className="w-full max-h-64 object-cover" 
              loading="lazy"
            />
          ) : (
            <div className="p-4 text-center text-xs text-gray-500">
              [Media file: {item.media_url.split('/').pop()}]
            </div>
          )}
        </div>
      )}

      {/* Actions (Mocked aesthetic footer to match Stitch design) */}
      <div className="flex items-center gap-6 mt-1 pt-1 text-gray-500">
        <button className="flex items-center gap-1.5 text-xs font-medium hover:text-white transition-colors">
          <Eye size={14} /> {views}
        </button>
        <button className="flex items-center gap-1.5 text-xs font-medium hover:text-white transition-colors">
          <MessageSquare size={14} /> {comments}
        </button>
        <button className="flex items-center gap-1.5 text-xs font-medium hover:text-white transition-colors ml-auto">
          <Share2 size={14} />
        </button>
      </div>
    </div>
  );
}
