"use client";

import React, { useState } from "react";
import {
  ArrowPathIcon,
  PhotoIcon,
  PencilSquareIcon,
  TableCellsIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import { israeliStocksAPI } from "@/services/api";
import toast from "react-hot-toast";

const StocksSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "israeli" | "world" | "logos" | "metadata"
  >("israeli");
  const [isImporting, setIsImporting] = useState(false);

  const handleImportStocks = async () => {
    if (!confirm("This will import all Israeli stocks from the CSV file. Existing stocks will be skipped. Continue?")) {
      return;
    }

    setIsImporting(true);
    const loadingToast = toast.loading("Importing Israeli stocks...");

    try {
      const result = await israeliStocksAPI.importStocksFromCSV();
      toast.success(
        `Successfully imported ${result.imported} stocks! (${result.skipped} already existed)`,
        { id: loadingToast }
      );
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Failed to import stocks",
        { id: loadingToast }
      );
    } finally {
      setIsImporting(false);
    }
  };

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
        {activeTab === "israeli" && (
          <div className="space-y-6">
            {/* Import Israeli Stocks */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Import Israeli Stocks from CSV
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Import all Israeli stocks from the IsraeliStocks.csv file
                  </p>
                </div>
                <ArrowDownTrayIcon className="w-5 h-5 text-blue-600" />
              </div>

              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 border border-blue-100">
                  <h4 className="font-medium text-gray-900 mb-2">What this does:</h4>
                  <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                    <li>Imports stocks with security numbers, symbols, and names</li>
                    <li>Includes logo SVG and logo URL data when available</li>
                    <li>Skips stocks that already exist in the database</li>
                    <li>Safe to run multiple times</li>
                  </ul>
                </div>

                <button
                  onClick={handleImportStocks}
                  disabled={isImporting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="w-5 h-5" />
                      Import Stocks from CSV
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "world" && (
          <div className="text-center py-12 text-gray-500">
            World stocks management interface coming soon
          </div>
        )}
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

        {activeTab === "logos" && (
          <div className="text-center py-12 text-gray-500">
            Metadata editor interface coming soon
          </div>
        )}
      </div>
    </div>
  );
};

export default StocksSection;
