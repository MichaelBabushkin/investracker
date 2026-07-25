"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import NewsFeed from "@/components/telegram/NewsFeed";

export default function NewsPage() {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-surface-dark px-4 sm:px-6 lg:px-10 py-6">
        <NewsFeed layout="full" />
      </div>
    </ProtectedRoute>
  );
}
