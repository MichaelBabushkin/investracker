"use client";

import React, { useState, useEffect } from "react";
import {
  Upload,
  Clock,
  PieChart,
  Landmark,
  Globe,
  DollarSign,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import BrokerUploader from "./BrokerUploader";
import WorldStockUploader from "./WorldStockUploader";
import PendingTransactionsReview from "./PendingTransactionsReview";
import WorldPendingTransactionsReview from "./WorldPendingTransactionsReview";
import { UploadResult } from "@/types/israeli-stocks";
import { WorldStockUploadResult } from "@/types/world-stocks";
import { israeliStocksAPI, worldStocksAPI } from "@/services/api";

type ViewType = "summary" | "upload" | "review";

export default function PortfolioOverview() {
  const [activeView, setActiveView] = useState<ViewType>("summary");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingBatchIds, setPendingBatchIds] = useState<string[]>([]);
  const [israeliPendingCount, setIsraeliPendingCount] = useState(0);
  const [worldPendingCount, setWorldPendingCount] = useState(0);

  // Portfolio summary stats (mock data for now - you can fetch from API)
  const [portfolioStats, setPortfolioStats] = useState({
    israeli: {
      totalValue: 0,
      totalGainLoss: 0,
      gainLossPercent: 0,
    },
    world: {
      totalValue: 0,
      totalGainLoss: 0,
      gainLossPercent: 0,
    },
  });

  // Function to check pending transactions
  const checkPendingTransactions = async () => {
    try {
      // Check Israeli pending - only count pending status
      const israeliPending = await israeliStocksAPI.getPendingTransactions(undefined, "pending");
      const israeliCount = israeliPending.count || 0;
      setIsraeliPendingCount(israeliCount);

      // Check World pending - only count pending status
      try {
        const worldPending = await worldStocksAPI.getPendingTransactions(undefined, "pending");
        const worldCount = worldPending.count || 0;
        setWorldPendingCount(worldCount);
      } catch {
        // World pending unavailable
      }

      // Check session storage for recent uploads
      const stored = sessionStorage.getItem("pending_batch_ids");
      if (stored) {
        try {
          const batchIds = JSON.parse(stored);
          if (batchIds.length > 0) {
            setPendingBatchIds(batchIds);
            setActiveView("review");
          }
        } catch {
          // Invalid JSON in session storage
        }
      }
    } catch {
      // Failed to check pending transactions
    }
  };

  // Check for pending transactions on mount
  useEffect(() => {
    checkPendingTransactions();
  }, [refreshTrigger]);

  const handleIsraeliUploadComplete = (results: UploadResult[]) => {
    // Check if we have pending transactions
    const hasPending = results.some((r: any) => r.pending_count > 0);
    const batchIds = results
      .filter((r: any) => r.batch_id)
      .map((r: any) => r.batch_id);

    if (hasPending && batchIds.length > 0) {
      setPendingBatchIds(batchIds);
      sessionStorage.setItem("pending_batch_ids", JSON.stringify(batchIds));
      
      // Update pending count immediately from results
      const totalPending = results.reduce((sum, r: any) => sum + (r.pending_count || 0), 0);
      setIsraeliPendingCount(totalPending);
      
      setActiveView("review");
      setRefreshTrigger((prev) => prev + 1);
    } else {
      // Old flow - direct save
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  const handleWorldUploadComplete = (results: WorldStockUploadResult[]) => {
    // World stocks go through pending workflow
    // Refresh to show in review section
    setRefreshTrigger((prev) => prev + 1);
    setActiveView("review");
  };

  const handleApprovalComplete = () => {
    // Clear pending state and refresh
    sessionStorage.removeItem("pending_batch_ids");
    setPendingBatchIds([]);
    setRefreshTrigger((prev) => prev + 1);
    setActiveView("summary");
  };

  const totalPendingCount = israeliPendingCount + worldPendingCount;

  const views = [
    {
      id: "summary" as ViewType,
      name: "Portfolio Summary",
      icon: PieChart,
      description: "Overview of all your investments",
    },
    {
      id: "upload" as ViewType,
      name: "Upload Reports",
      icon: Upload,
      description: "Upload broker statements (Israeli or international)",
    },
    {
      id: "review" as ViewType,
      name: "Review Pending",
      icon: Clock,
      description: "Review and approve pending transactions",
      badge: totalPendingCount > 0 ? totalPendingCount : undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-surface-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <PieChart className="h-8 w-8 text-brand-400" />
            <div>
              <h1 className="text-3xl font-bold text-gray-100">
                Portfolio Overview
              </h1>
              <p className="text-gray-400">
                Manage your Israeli and international investments
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions / Views */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {views.map((view) => {
            const Icon = view.icon;
            const isActive = activeView === view.id;
            return (
              <button
                key={view.id}
                onClick={() => setActiveView(view.id)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all
                  ${
                    isActive
                      ? "border-brand-400/40 bg-brand-400/10"
                      : "border-white/10 bg-surface-dark-secondary hover:border-brand-400/30 hover:bg-white/5"
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <Icon
                    className={`h-6 w-6 ${
                      isActive ? "text-brand-400" : "text-gray-400"
                    }`}
                  />
                  {view.badge && (
                    <span className="bg-loss text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {view.badge}
                    </span>
                  )}
                </div>
                <h3
                  className={`mt-3 font-semibold ${
                    isActive ? "text-brand-400" : "text-gray-100"
                  }`}
                >
                  {view.name}
                </h3>
                <p className="mt-1 text-sm text-gray-400">{view.description}</p>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
          {activeView === "summary" && (
            <div>
              <h2 className="text-xl font-semibold text-gray-100 mb-6">
                Portfolio Summary
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Israeli Stocks Summary */}
                <div className="border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Landmark className="h-6 w-6 text-brand-400" />
                      <h3 className="text-lg font-semibold text-gray-100">
                        Israeli Stocks
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Total Value</p>
                      <p className="text-2xl font-bold text-gray-100">
                        ₪{portfolioStats.israeli.totalValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {portfolioStats.israeli.gainLossPercent >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-gain" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-loss" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          portfolioStats.israeli.gainLossPercent >= 0
                            ? "text-gain"
                            : "text-loss"
                        }`}
                      >
                        {portfolioStats.israeli.gainLossPercent >= 0 ? "+" : ""}
                        {portfolioStats.israeli.gainLossPercent.toFixed(2)}%
                      </span>
                      <span className="text-sm text-gray-400">
                        (₪
                        {portfolioStats.israeli.totalGainLoss.toLocaleString()})
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <a
                      href="/israeli-stocks"
                      className="text-sm text-brand-400 hover:text-brand-500 font-medium"
                    >
                      View Details →
                    </a>
                  </div>
                </div>

                {/* World Stocks Summary */}
                <div className="border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-6 w-6 text-brand-400" />
                      <h3 className="text-lg font-semibold text-gray-100">
                        World Stocks
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-400">Total Value</p>
                      <p className="text-2xl font-bold text-gray-100">
                        ${portfolioStats.world.totalValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {portfolioStats.world.gainLossPercent >= 0 ? (
                        <TrendingUp className="h-5 w-5 text-gain" />
                      ) : (
                        <TrendingDown className="h-5 w-5 text-loss" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          portfolioStats.world.gainLossPercent >= 0
                            ? "text-gain"
                            : "text-loss"
                        }`}
                      >
                        {portfolioStats.world.gainLossPercent >= 0 ? "+" : ""}
                        {portfolioStats.world.gainLossPercent.toFixed(2)}%
                      </span>
                      <span className="text-sm text-gray-400">
                        ($
                        {portfolioStats.world.totalGainLoss.toLocaleString()})
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-white/10">
                    <a
                      href="/world-stocks"
                      className="text-sm text-brand-400 hover:text-brand-500 font-medium"
                    >
                      View Details →
                    </a>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">
                  Quick Actions
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveView("upload")}
                    className="px-4 py-2 bg-brand-400 text-surface-dark rounded-lg hover:bg-brand-500 transition-colors flex items-center space-x-2"
                  >
                    <Upload className="h-5 w-5" />
                    <span>Upload Reports</span>
                  </button>
                  {totalPendingCount > 0 && (
                    <button
                      onClick={() => setActiveView("review")}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                    >
                      <Clock className="h-5 w-5" />
                      <span>Review {totalPendingCount} Pending</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === "upload" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-2">
                  Upload Broker Statements
                </h2>
                <p className="text-gray-400">
                  Select your broker and upload PDF reports. The system will
                  automatically extract your holdings, transactions, and dividends.
                </p>
              </div>

              <BrokerUploader onUploadComplete={handleIsraeliUploadComplete} />
            </div>
          )}

          {activeView === "review" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-100 mb-2">
                  Review Pending Transactions
                </h2>
                <p className="text-gray-400">
                  Review and approve pending transactions from both Israeli and
                  world stock portfolios before they are saved to your account.
                </p>
              </div>

              {/* Israeli Pending Transactions */}
              {israeliPendingCount > 0 && (
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Landmark className="h-5 w-5 text-brand-400" />
                    <h3 className="text-lg font-semibold text-gray-100">
                      Israeli Stocks Pending ({israeliPendingCount})
                    </h3>
                  </div>
                  {pendingBatchIds.length > 0 ? (
                    pendingBatchIds.map((batchId) => (
                      <div key={batchId} className="mb-8">
                        <PendingTransactionsReview
                          batchId={batchId}
                          onApprovalComplete={handleApprovalComplete}
                        />
                      </div>
                    ))
                  ) : (
                    <PendingTransactionsReview
                      onApprovalComplete={handleApprovalComplete}
                    />
                  )}
                </div>
              )}

              {/* World Pending Transactions */}
              {worldPendingCount > 0 && (
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <Globe className="h-5 w-5 text-gain" />
                    <h3 className="text-lg font-semibold text-gray-100">
                      World Stocks Pending ({worldPendingCount})
                    </h3>
                  </div>
                  <WorldPendingTransactionsReview
                    onApprovalComplete={async () => {
                      await checkPendingTransactions();
                      setActiveView("summary");
                    }}
                  />
                </div>
              )}

              {totalPendingCount === 0 && (
                <div className="text-center py-12">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-100">
                    No pending transactions
                  </h3>
                  <p className="mt-1 text-gray-500">
                    All transactions have been reviewed and approved.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setActiveView("summary")}
                      className="px-4 py-2 bg-brand-400 text-surface-dark rounded-lg hover:bg-brand-500"
                    >
                      Back to Summary
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
