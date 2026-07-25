"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import TelegramNewsFeed from "@/components/telegram/TelegramNewsFeed";

export default function NewsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface-dark px-4 sm:px-6 lg:px-10 py-6">
        <div className="pb-3 border-b-2 border-rule-section">
          <h1 className="text-[22px] font-heading font-bold text-figure leading-none">Market news</h1>
          <p className="text-[13px] text-label mt-1">Financial Telegram channels · subscribe to shape your feed</p>
        </div>
        <TelegramNewsFeed showChannelManager />
      </div>
    </ProtectedRoute>
  );
}
