"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  ArrowRight,
  DollarSign,
  Globe,
} from "lucide-react";
import WorldStockHoldings from "./WorldStockHoldings";
import WorldStockTransactions from "./WorldStockTransactions";
import WorldStockDividends from "./WorldStockDividends";
import {
  WorldStockAccount,
} from "@/types/world-stocks";
import { worldStocksAPI } from "@/services/api";

type TabType = "holdings" | "transactions" | "dividends";

export default function WorldStocksDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>("holdings");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [accounts, setAccounts] = useState<WorldStockAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<
    number | undefined
  >();

  const fetchAccounts = useCallback(async () => {
    try {
      const data = await worldStocksAPI.getAccounts();
      setAccounts(data);
      // Auto-select first account if none selected
      if (!selectedAccountId && data.length > 0) {
        setSelectedAccountId(data[0].id);
      }
    } catch {
      // Failed to fetch accounts
    }
  }, [selectedAccountId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts, refreshTrigger]);

  const tabs = [
    {
      id: "holdings" as TabType,
      name: "Holdings",
      icon: Building2,
      description: "View your stock holdings with P/L",
    },
    {
      id: "transactions" as TabType,
      name: "Transactions",
      icon: ArrowRight,
      description: "View transaction history",
    },
    {
      id: "dividends" as TabType,
      name: "Dividends",
      icon: DollarSign,
      description: "View dividend income",
    },
  ];

  return (
    <div className="min-h-screen bg-surface-dark">
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Globe className="h-8 w-8 text-brand-400" />
              <div>
                <h1 className="text-3xl font-bold text-gray-100">
                  World Stocks
                </h1>
                <p className="text-gray-400">
                  Manage your international stock portfolio
                </p>
              </div>
            </div>

            {/* Account Selector */}
            {accounts.length > 0 && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-300">
                  Account:
                </label>
                <select
                  value={selectedAccountId || ""}
                  onChange={(e) =>
                    setSelectedAccountId(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="px-3 py-2 border border-white/10 rounded-lg text-sm bg-surface-dark-secondary text-gray-100 focus:ring-2 focus:ring-brand-400/40 focus:border-transparent"
                >
                  <option value="">All Accounts</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.account_number} -{" "}
                      {account.account_alias ||
                        account.broker_name ||
                        "Unknown"}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <div className="border-b border-white/10">
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
                          ? "border-brand-400/40 text-brand-400"
                          : "border-transparent text-gray-500 hover:text-gray-300 hover:border-white/10"
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
                  <p key={tab.id} className="text-sm text-gray-400">
                    {tab.description}
                  </p>
                )
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="bg-surface-dark-secondary rounded-xl border border-white/10 p-6">
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
