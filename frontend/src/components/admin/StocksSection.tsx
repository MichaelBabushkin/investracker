"use client";

import React, { useState } from "react";
import {
  ArrowPathIcon,
  PhotoIcon,
  PencilSquareIcon,
  TableCellsIcon,
} from "@heroicons/react/24/outline";

const StocksSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "israeli" | "world" | "logos" | "metadata"
  >("logos");

  const tabs = [
    { id: "israeli" as const, name: "Israeli Stocks", icon: TableCellsIcon },
    { id: "world" as const, name: "World Stocks", icon: TableCellsIcon },
    { id: "logos" as const, name: "Logo Crawler", icon: PhotoIcon },
    { id: "metadata" as const, name: "Metadata Editor", icon: PencilSquareIcon },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Stock Management</h2>
        <p className="text-sm text-gray-600 mt-1">
          Manage stock data, logos, and metadata
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div>
        {activeTab === "logos" && (
          <div className="space-y-6">
            {/* Logo Crawler Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Batch Logo Crawler
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Fetch and store SVG logos for Israeli stocks
                  </p>
                </div>
                <ArrowPathIcon className="w-5 h-5 text-gray-400" />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Batch size
                  </label>
                  <input
                    type="number"
                    defaultValue={10}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Runs concurrent requests in batches
                  </p>
                </div>

                <button className="w-full sm:w-auto px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium">
                  Crawl Missing Logos
                </button>
              </div>
            </div>

            {/* TradingView Logo URL Crawler */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    TradingView Logo URL Crawler
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Extract logo URLs from TradingView symbol pages
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Batch crawl
                  </h4>
                  <button className="w-full px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors">
                    Crawl Missing logo_url
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Finds 53 SVG URLs via TradingView page and saves it to
                    logo_url only
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Single symbol
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. DNYA"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      Crawl URL for Symbol
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Uses TradingView page like
                    https://www.tradingview.com/symbols/TASE-DNYA/
                  </p>
                </div>
              </div>
            </div>

            {/* Populate logo_svg from logo_url */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Populate logo_svg from logo_url
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Download SVGs using saved logo_url and store them in the
                    database
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Bulk populate
                  </h4>
                  <button className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    Populate Missing SVGs
                  </button>
                  <p className="text-xs text-gray-500 mt-2">
                    Only processes stocks with a saved logo_url
                  </p>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Single stock
                  </h4>
                  <div className="flex gap-2">
                    <select className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>Select stock...</option>
                    </select>
                    <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                      Populate for Selected
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Uses the stock's logo_url field, if present
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "israeli" && (
          <div className="text-center py-12 text-gray-500">
            Israeli stocks management interface coming soon
          </div>
        )}

        {activeTab === "world" && (
          <div className="text-center py-12 text-gray-500">
            World stocks management interface coming soon
          </div>
        )}

        {activeTab === "metadata" && (
          <div className="text-center py-12 text-gray-500">
            Metadata editor interface coming soon
          </div>
        )}
      </div>
    </div>
  );
};

export default StocksSection;
