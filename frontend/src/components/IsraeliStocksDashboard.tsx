"use client";

import React, { useState } from "react";
import {
  CloudArrowUpIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import IsraeliStockUploader from "./IsraeliStockUploader";
import IsraeliStockHoldings from "./IsraeliStockHoldings";
import IsraeliStockTransactions from "./IsraeliStockTransactions";
import IsraeliStockDividends from "./IsraeliStockDividends";
import { UploadResult } from "@/types/israeli-stocks";

type TabType = "upload" | "holdings" | "transactions" | "dividends";

export default function IsraeliStocksDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("upload");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = (results: UploadResult[]) => {
    // Trigger refresh of all components
    setRefreshTrigger((prev) => prev + 1);

    // Show success message
    const totalHoldings = results.reduce((sum, r) => sum + r.holdings_saved, 0);
    const totalTransactions = results.reduce(
      (sum, r) => sum + r.transactions_saved,
      0
    );

    if (totalHoldings > 0 || totalTransactions > 0) {
      // Switch to holdings tab to show the imported data
      setActiveTab("holdings");
    }
  };

  const tabs = [
    {
      id: "upload" as TabType,
      name: "Upload Reports",
      icon: CloudArrowUpIcon,
      description: "Upload PDF investment reports",
    },
    {
      id: "holdings" as TabType,
      name: "Holdings",
      icon: BuildingOfficeIcon,
      description: "View your stock holdings",
    },
    {
      id: "transactions" as TabType,
      name: "Transactions",
      icon: ArrowRightIcon,
      description: "View transaction history",
    },
    {
      id: "dividends" as TabType,
      name: "Dividends",
      icon: CurrencyDollarIcon,
      description: "View dividend payments",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Israeli Stocks
              </h1>
              <p className="text-gray-600">
                Manage your Israeli stock portfolio (TA-125 & SME-60)
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm
                      ${
                        activeTab === tab.id
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab descriptions */}
          <div className="mt-2">
            {tabs.map(
              (tab) =>
                activeTab === tab.id && (
                  <p key={tab.id} className="text-sm text-gray-600">
                    {tab.description}
                  </p>
                )
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {activeTab === "upload" && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Upload Investment Reports
                </h2>
                <p className="text-gray-600">
                  Upload PDF reports from Israeli brokers to automatically
                  extract and analyze your stock holdings, transactions, and
                  dividends. Supports both TA-125 and SME-60 index stocks.
                </p>
              </div>
              <IsraeliStockUploader onUploadComplete={handleUploadComplete} />
            </div>
          )}

          {activeTab === "holdings" && (
            <IsraeliStockHoldings refreshTrigger={refreshTrigger} />
          )}

          {activeTab === "transactions" && (
            <IsraeliStockTransactions refreshTrigger={refreshTrigger} />
          )}

          {activeTab === "dividends" && (
            <IsraeliStockDividends refreshTrigger={refreshTrigger} />
          )}
        </div>

        {/* Removed Quick Stats Footer per request */}
      </div>
    </div>
  );
}
