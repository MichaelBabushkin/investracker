import React, { useState } from 'react';
import { TelegramChannel } from '@/types/telegram';
import { Badge } from '@/components/ui/Badge';
import { Check } from 'lucide-react';

interface ChannelCardProps {
  channel: TelegramChannel;
  onToggleSubscription: (channelId: number, isSubscribed: boolean) => Promise<void>;
}

export default function ChannelCard({ channel, onToggleSubscription }: ChannelCardProps) {
  const [isSubscribed, setIsSubscribed] = useState(channel.is_subscribed);
  const [isLoading, setIsLoading] = useState(false);

  // Fallback for missing logo
  const title = channel.title || channel.username;
  const initial = title.charAt(0).toUpperCase();

  const handleToggle = async () => {
    if (isLoading) return;
    setIsLoading(true);
    // Optimistic update
    setIsSubscribed(!isSubscribed);
    try {
      await onToggleSubscription(channel.id, !isSubscribed);
    } catch (error) {
      // Revert on failure
      setIsSubscribed(isSubscribed);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-transparent hover:bg-white/5 transition-colors group">
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Logo */}
        <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-surface-dark flex items-center justify-center text-teal-400 font-bold border border-white/5">
          {channel.logo_url ? (
            <img src={channel.logo_url} alt={title} className="w-full h-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        
        {/* Info */}
        <div className="min-w-0 pr-2">
          <div className="text-[14px] font-semibold text-white truncate">{title}</div>
          <div className="text-[12px] text-gray-500 truncate mt-0.5">@{channel.username}</div>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`shrink-0 text-[11px] font-bold px-3.5 py-1.5 rounded-full transition-all flex items-center gap-1.5 border
          ${
            isSubscribed
              ? 'bg-[#1D2433] text-gray-400 border-transparent hover:text-gray-200'
              : 'bg-transparent text-teal-400 border-teal-400/50 hover:bg-teal-400/10'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isSubscribed ? (
          <>
            <Check size={12} className="opacity-70" /> Following
          </>
        ) : (
          'Subscribe'
        )}
      </button>
    </div>
  );
}
