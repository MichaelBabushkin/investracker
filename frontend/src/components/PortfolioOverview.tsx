"use client";

import React, { useState, useEffect } from "react";
import {
  CloudArrowUpIcon,
  ClockIcon,
  ChartPieIcon,
  BuildingLibraryIcon,
  GlobeAmericasIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";
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
      } catch (err) {
        console.error("Failed to fetch world pending:", err);
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
        } catch (e) {
          console.error("Failed to parse pending batch IDs", e);
        }
      }
    } catch (error) {
      console.error("Failed to check pending transactions:", error);
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
      icon: ChartPieIcon,
      description: "Overview of all your investments",
    },
    {
      id: "upload" as ViewType,
      name: "Upload Reports",
      icon: CloudArrowUpIcon,
      description: "Upload broker statements (Israeli or international)",
    },
    {
      id: "review" as ViewType,
      name: "Review Pending",
      icon: ClockIcon,
      description: "Review and approve pending transactions",
      badge: totalPendingCount > 0 ? totalPendingCount : undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <ChartPieIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Portfolio Overview
              </h1>
              <p className="text-gray-600">
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
                  relative p-4 rounded-lg border-2 transition-all
                  ${
                    isActive
                      ? "border-blue-500 bg-blue-50 shadow-md"
                      : "border-gray-200 bg-white hover:border-blue-300 hover:shadow"
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <Icon
                    className={`h-6 w-6 ${
                      isActive ? "text-blue-600" : "text-gray-400"
                    }`}
                  />
                  {view.badge && (
                    <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {view.badge}
                    </span>
                  )}
                </div>
                <h3
                  className={`mt-3 font-semibold ${
                    isActive ? "text-blue-900" : "text-gray-900"
                  }`}
                >
                  {view.name}
                </h3>
                <p className="mt-1 text-sm text-gray-600">{view.description}</p>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {activeView === "summary" && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-6">
                Portfolio Summary
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Israeli Stocks Summary */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <BuildingLibraryIcon className="h-6 w-6 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        Israeli Stocks
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Total Value</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ₪{portfolioStats.israeli.totalValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {portfolioStats.israeli.gainLossPercent >= 0 ? (
                        <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          portfolioStats.israeli.gainLossPercent >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {portfolioStats.israeli.gainLossPercent >= 0 ? "+" : ""}
                        {portfolioStats.israeli.gainLossPercent.toFixed(2)}%
                      </span>
                      <span className="text-sm text-gray-600">
                        (₪
                        {portfolioStats.israeli.totalGainLoss.toLocaleString()})
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <a
                      href="/israeli-stocks"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Details →
                    </a>
                  </div>
                </div>

                {/* World Stocks Summary */}
                <div className="border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      <GlobeAmericasIcon className="h-6 w-6 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        World Stocks
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-600">Total Value</p>
                      <p className="text-2xl font-bold text-gray-900">
                        ${portfolioStats.world.totalValue.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {portfolioStats.world.gainLossPercent >= 0 ? (
                        <ArrowTrendingUpIcon className="h-5 w-5 text-green-500" />
                      ) : (
                        <ArrowTrendingDownIcon className="h-5 w-5 text-red-500" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          portfolioStats.world.gainLossPercent >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {portfolioStats.world.gainLossPercent >= 0 ? "+" : ""}
                        {portfolioStats.world.gainLossPercent.toFixed(2)}%
                      </span>
                      <span className="text-sm text-gray-600">
                        ($
                        {portfolioStats.world.totalGainLoss.toLocaleString()})
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <a
                      href="/world-stocks"
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Details →
                    </a>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Quick Actions
                </h3>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setActiveView("upload")}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                  >
                    <CloudArrowUpIcon className="h-5 w-5" />
                    <span>Upload Reports</span>
                  </button>
                  {totalPendingCount > 0 && (
                    <button
                      onClick={() => setActiveView("review")}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
                    >
                      <ClockIcon className="h-5 w-5" />
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
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Broker Statements
                </h2>
                <p className="text-gray-600">
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
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Review Pending Transactions
                </h2>
                <p className="text-gray-600">
                  Review and approve pending transactions from both Israeli and
                  world stock portfolios before they are saved to your account.
                </p>
              </div>

              {/* Israeli Pending Transactions */}
              {israeliPendingCount > 0 && (
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    <BuildingLibraryIcon className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
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
                    <GlobeAmericasIcon className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
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
                  <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900">
                    No pending transactions
                  </h3>
                  <p className="mt-1 text-gray-500">
                    All transactions have been reviewed and approved.
                  </p>
                  <div className="mt-6">
                    <button
                      onClick={() => setActiveView("summary")}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
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
