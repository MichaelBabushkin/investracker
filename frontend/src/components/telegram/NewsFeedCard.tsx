import React, { useState, useEffect } from 'react';
import { TelegramFeedItem } from '@/types/telegram';
import { Share2, Eye, Forward, X, ImageOff } from 'lucide-react';
import api from '@/services/api';

interface NewsFeedCardProps {
  item: TelegramFeedItem;
}

function formatCount(n: number | null): string | null {
  if (n === null || n === undefined) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

type ImageState = 'loading' | 'loaded' | 'error';

function useAuthImage(proxyUrl: string | null): { src: string | null; state: ImageState } {
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<ImageState>('loading');

  useEffect(() => {
    if (!proxyUrl) {
      setState('error');
      return;
    }
    let objectUrl: string | null = null;
    setState('loading');
    setSrc(null);

    api.get(proxyUrl, { responseType: 'blob' })
      .then(res => {
        // Only create blob URL if it's actually an image
        if (res.data && res.data.size > 0) {
          objectUrl = URL.createObjectURL(res.data);
          setSrc(objectUrl);
          setState('loaded');
        } else {
          setState('error');
        }
      })
      .catch(() => setState('error'));

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [proxyUrl]);

  return { src, state };
}

function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/40 rounded-full p-1.5 transition-colors"
        onClick={onClose}
      >
        <X size={22} />
      </button>
      <img
        src={src}
        alt="Full size"
        className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}

export default function NewsFeedCard({ item }: NewsFeedCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { src: imgSrc, state: imgState } = useAuthImage(item.has_media ? item.media_proxy_url : null);

  const title = item.channel.title || item.channel.username;
  const initial = title.charAt(0).toUpperCase();
  const isHebrew = item.text ? /[\u0590-\u05FF]/.test(item.text) : false;
  const dir = isHebrew ? 'rtl' : 'ltr';

  const viewsStr = formatCount(item.views);
  const forwardsStr = formatCount(item.forwards);

  const renderText = (text: string) =>
    text.split(/([\s\n]+)/).map((word, i) => {
      if ((word.startsWith('$') || word.startsWith('#')) && word.length > 1)
        return <span key={i} className="text-teal-400 font-medium">{word}</span>;
      return word;
    });

  return (
    <>
      <div className="bg-[#101522] border border-[#232A3B] rounded-2xl p-4 sm:p-5 flex flex-col gap-3 hover:border-white/10 hover:shadow-lg hover:shadow-black/20 transition-all duration-300">

        {/* Header — avatar always left, text alignment follows content direction */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-surface-dark flex items-center justify-center text-teal-400 text-lg font-bold border border-white/5">
            {item.channel.logo_url ? (
              <img src={item.channel.logo_url} alt={title} className="w-full h-full object-cover" />
            ) : (
              <span>{initial}</span>
            )}
          </div>
          {/* Title block — text-right for Hebrew, text-left otherwise */}
          <div className={`flex-1 min-w-0 ${isHebrew ? 'text-right' : 'text-left'}`}>
            <span className="text-[15px] font-semibold text-white truncate block">{title}</span>
            <div className="flex items-center gap-2 text-xs text-brand-400/70" dir={dir}>
              <span>@{item.channel.username}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span>{timeAgo(item.posted_at)}</span>
            </div>
          </div>
        </div>

        {/* Text */}
        {item.text && (
          <div
            className="text-[14px] text-gray-300/90 leading-relaxed whitespace-pre-wrap mt-1"
            dir={dir}
          >
            <div className={expanded ? '' : 'line-clamp-4'}>
              {renderText(item.text)}
            </div>
            {item.text.length > 200 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-teal-400 text-xs font-semibold mt-1.5 hover:underline"
              >
                {expanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* Image */}
        {item.has_media && (
          <>
            {imgState === 'loading' && (
              <div className="mt-1 rounded-xl border border-white/5 h-32 animate-pulse bg-white/5" />
            )}
            {imgState === 'loaded' && imgSrc && (
              <div
                className="mt-1 rounded-xl overflow-hidden border border-white/5 cursor-zoom-in"
                onClick={() => setModalOpen(true)}
                title="Click to expand"
              >
                <img
                  src={imgSrc}
                  alt="Telegram Media"
                  className="w-full object-contain"
                  loading="lazy"
                />
              </div>
            )}
            {imgState === 'error' && (
              <div className="mt-1 rounded-xl border border-white/5 h-12 flex items-center justify-center gap-2 text-xs text-gray-600">
                <ImageOff size={14} /> Media unavailable
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-center gap-5 mt-1 pt-1 text-gray-500 text-xs font-medium">
          {viewsStr && (
            <span className="flex items-center gap-1.5">
              <Eye size={13} /> {viewsStr}
            </span>
          )}
          {forwardsStr && (
            <span className="flex items-center gap-1.5">
              <Forward size={13} /> {forwardsStr}
            </span>
          )}
          <a
            href={`https://t.me/${item.channel.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto flex items-center gap-1.5 hover:text-white transition-colors"
            title="Open channel in Telegram"
          >
            <Share2 size={13} />
          </a>
        </div>
      </div>

      {modalOpen && imgSrc && (
        <ImageModal src={imgSrc} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
