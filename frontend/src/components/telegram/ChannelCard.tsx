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
    <div className="flex items-center justify-between p-3 rounded-xl bg-surface-dark-secondary border border-white/5 hover:bg-white/5 transition-colors">
      <div className="flex items-center gap-3 overflow-hidden">
        {/* Logo */}
        <div className="w-10 h-10 rounded-full shrink-0 overflow-hidden bg-brand-400/20 flex items-center justify-center text-brand-400 font-bold border border-white/10">
          {channel.logo_url ? (
            <img src={channel.logo_url} alt={title} className="w-full h-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        
        {/* Info */}
        <div className="min-w-0 pr-2">
          <div className="text-sm font-medium text-white truncate">{title}</div>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="neutral" className="text-[10px] px-1.5 py-0">
              {channel.language.toUpperCase()}
            </Badge>
            <span className="text-[10px] text-gray-500 truncate">{channel.category}</span>
          </div>
        </div>
      </div>

      {/* Button */}
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-all flex items-center gap-1 border
          ${
            isSubscribed
              ? 'bg-gain/10 text-gain border-gain/20 hover:bg-gain/20'
              : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white'
          }
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isSubscribed ? (
          <>
            Following <Check size={12} />
          </>
        ) : (
          'Follow'
        )}
      </button>
    </div>
  );
}
