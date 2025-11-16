"use client";

import React, { useState, useEffect } from "react";
import {
  CloudArrowUpIcon,
  BuildingOfficeIcon,
  ArrowRightIcon,
  CurrencyDollarIcon,
  GlobeAmericasIcon,
} from "@heroicons/react/24/outline";
import WorldStockUploader from "./WorldStockUploader";
import WorldStockHoldings from "./WorldStockHoldings";
import WorldStockTransactions from "./WorldStockTransactions";
import WorldStockDividends from "./WorldStockDividends";
import { WorldStockUploadResult, WorldStockAccount } from "@/types/world-stocks";
import { worldStocksAPI } from "@/services/api";

type TabType = "upload" | "holdings" | "transactions" | "dividends";

export default function WorldStocksDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("upload");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [accounts, setAccounts] = useState<WorldStockAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();

  useEffect(() => {
    fetchAccounts();
  }, [refreshTrigger]);

  const fetchAccounts = async () => {
    try {
      const data = await worldStocksAPI.getAccounts();
      setAccounts(data);
      // Auto-select first account if none selected
      if (!selectedAccountId && data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    }
  };

  const handleUploadComplete = (results: WorldStockUploadResult[]) => {
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
      description: "Upload world stock broker statement PDFs",
    },
    {
      id: "holdings" as TabType,
      name: "Holdings",
      icon: BuildingOfficeIcon,
      description: "View your stock holdings with P/L",
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
      description: "View dividend income",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <GlobeAmericasIcon className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  World Stocks
                </h1>
                <p className="text-gray-600">
                  Manage your international stock portfolio
                </p>
              </div>
            </div>

            {/* Account Selector */}
            {accounts.length > 0 && activeTab !== "upload" && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700">
                  Account:
                </label>
                <select
                  value={selectedAccountId || ""}
                  onChange={(e) =>
                    setSelectedAccountId(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_number} - {account.account_alias || account.broker_name || 'Unknown'}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                  Upload Broker Statements
                </h2>
                <p className="text-gray-600">
                  Upload PDF statements from US and international brokers to
                  automatically extract and analyze your stock holdings,
                  transactions, and dividends.
                </p>
              </div>
              <WorldStockUploader onUploadComplete={handleUploadComplete} />
            </div>
          )}

          {activeTab === "holdings" && (
            <WorldStockHoldings
              refreshTrigger={refreshTrigger}
              accountId={selectedAccountId}
            />
          )}

          {activeTab === "transactions" && (
            <WorldStockTransactions
              refreshTrigger={refreshTrigger}
              accountId={selectedAccountId}
            />
          )}

          {activeTab === "dividends" && (
            <WorldStockDividends
              refreshTrigger={refreshTrigger}
              accountId={selectedAccountId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
