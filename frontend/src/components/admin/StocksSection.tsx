"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  Image,
  SquarePen,
  Table,
  Download,
} from "lucide-react";
import { israeliStocksAPI, worldStocksAPI } from "@/services/api";
import toast from "react-hot-toast";
import { useConfirmDialog } from "@/components/ConfirmDialog";

const StocksSection: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    "israeli" | "world" | "logos" | "metadata"
  >("israeli");
  const [logoCrawlerTab, setLogoCrawlerTab] = useState<"israeli" | "world">("israeli");
  const [isImporting, setIsImporting] = useState(false);
  const [isImportingETFs, setIsImportingETFs] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [worldBatchSize, setWorldBatchSize] = useState(5);
  const [isCrawling, setIsCrawling] = useState(false);
  const [isSyncingExchange, setIsSyncingExchange] = useState(false);
  const [singleTicker, setSingleTicker] = useState("");

  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  const handleImportETFs = async () => {
    const ok = await confirm({ title: "Import Israeli ETFs?", message: "This will import all 459 ETFs from Israelietfs.csv. Existing entries will be skipped.", confirmLabel: "Import", variant: "info" });
    if (!ok) return;

    setIsImportingETFs(true);
    const loadingToast = toast.loading("Importing Israeli ETFs...");

    try {
      const result = await israeliStocksAPI.importETFsFromCSV();
      toast.success(
        `Successfully imported ${result.imported} ETFs! (${result.skipped} already existed)`,
        { id: loadingToast }
      );
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || "Failed to import ETFs",
        { id: loadingToast }
      );
    } finally {
      setIsImportingETFs(false);
    }
  };

  const handleImportStocks = async () => {
    const ok = await confirm({ title: "Import Israeli stocks?", message: "This will import all stocks from the CSV file. Existing stocks will be skipped.", confirmLabel: "Import", variant: "info" });
    if (!ok) return;

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
    { id: "israeli" as const, name: "Israeli Stocks", icon: Table },
    { id: "world" as const, name: "World Stocks", icon: Table },
    { id: "logos" as const, name: "Logo Crawler", icon: Image },
    { id: "metadata" as const, name: "Metadata Editor", icon: SquarePen },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-100">Stock Management</h2>
        <p className="text-sm text-gray-400 mt-1">
          Manage stock data, logos, and metadata
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-brand-400 text-brand-400"
                    : "border-transparent text-gray-500 hover:text-gray-300 hover:border-white/10"
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
            <div className="bg-brand-400/10 border border-brand-400/20 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">
                    Import Israeli Stocks from CSV
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Import all Israeli stocks from the IsraeliStocks.csv file
                  </p>
                </div>
                <Download className="w-5 h-5 text-brand-400" />
              </div>

              <div className="space-y-4">
                <div className="bg-surface-dark-secondary rounded-xl p-4 border border-white/10">
                  <h4 className="font-medium text-gray-100 mb-2">What this does:</h4>
                  <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                    <li>Imports stocks with security numbers, symbols, and names</li>
                    <li>Includes logo SVG and logo URL data when available</li>
                    <li>Skips stocks that already exist in the database</li>
                    <li>Safe to run multiple times</li>
                  </ul>
                </div>

                <button
                  onClick={handleImportStocks}
                  disabled={isImporting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-brand-400 text-surface-dark rounded-xl hover:bg-brand-500 transition-colors font-medium disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Import Stocks from CSV
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Import Israeli ETFs */}
            <div className="bg-info/10 border border-info/20 rounded-xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-100">
                    Import Israeli ETFs from CSV
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">
                    Import all ETFs from the Israelietfs.csv file (~459 funds)
                  </p>
                </div>
                <Download className="w-5 h-5 text-info" />
              </div>

              <div className="space-y-4">
                <div className="bg-surface-dark-secondary rounded-xl p-4 border border-white/10">
                  <h4 className="font-medium text-gray-100 mb-2">What this does:</h4>
                  <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                    <li>Imports ETFs with security numbers and symbols</li>
                    <li>Tagged with index_name = &quot;ETF&quot; for filtering</li>
                    <li>Skips ETFs that already exist in the database</li>
                    <li>Safe to run multiple times</li>
                  </ul>
                </div>

                <button
                  onClick={handleImportETFs}
                  disabled={isImportingETFs}
                  className="flex items-center gap-2 px-6 py-2.5 bg-info text-white rounded-xl hover:bg-blue-600 transition-colors font-medium disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  {isImportingETFs ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Import ETFs from CSV
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

        {activeTab === "logos" && (
          <div className="space-y-6">
            {/* Logo Crawler Type Tabs */}
            <div className="flex gap-4 border-b border-white/10 pb-2">
              <button
                onClick={() => setLogoCrawlerTab("israeli")}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  logoCrawlerTab === "israeli"
                    ? "text-brand-400 border-b-2 border-brand-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                Israeli Stocks
              </button>
              <button
                onClick={() => setLogoCrawlerTab("world")}
                className={`px-4 py-2 font-medium text-sm transition-colors ${
                  logoCrawlerTab === "world"
                    ? "text-brand-400 border-b-2 border-brand-400"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                World Stocks
              </button>
            </div>

            {/* Israeli Stocks Logo Crawler */}
            {logoCrawlerTab === "israeli" && (
              <>
                {/* Batch Logo Crawler */}
                <div className="bg-surface-dark border border-white/10 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-100">
                        Batch Logo Crawler
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Fetch and store SVG logos for Israeli stocks
                      </p>
                    </div>
                    <RefreshCw className="w-5 h-5 text-gray-400" />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Batch size
                      </label>
                      <input
                        type="number"
                        value={batchSize}
                        onChange={(e) => setBatchSize(parseInt(e.target.value) || 10)}
                        className="w-32 px-3 py-2 bg-surface-dark border border-white/10 rounded-xl text-gray-100 focus:ring-2 focus:ring-brand-400/40 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Runs concurrent requests in batches
                      </p>
                    </div>

                    <button className="w-full sm:w-auto px-6 py-2.5 bg-gain text-surface-dark rounded-xl hover:bg-gain/80 transition-colors font-medium">
                      Crawl Missing Logos
                    </button>
                  </div>
                </div>

                {/* TradingView Logo URL Crawler */}
                <div className="bg-surface-dark border border-white/10 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-100">
                        TradingView Logo URL Crawler
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Extract logo URLs from TradingView symbol pages
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">
                        Batch crawl
                      </h4>
                      <button className="w-full px-4 py-2.5 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors">
                        Crawl Missing logo_url
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Finds SVG URLs via TradingView page and saves it to logo_url only
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">
                        Single symbol
                      </h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g. DNYA"
                          className="flex-1 px-3 py-2 bg-surface-dark border border-white/10 rounded-xl text-gray-100 focus:ring-2 focus:ring-brand-400/40 focus:border-transparent"
                        />
                        <button className="px-4 py-2 bg-gain text-surface-dark rounded-xl hover:bg-gain/80 transition-colors">
                          Crawl URL for Symbol
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Uses TradingView page like https://www.tradingview.com/symbols/TASE-DNYA/
                      </p>
                    </div>
                  </div>
                </div>

                {/* Populate logo_svg from logo_url */}
                <div className="bg-surface-dark border border-white/10 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-100">
                        Populate logo_svg from logo_url
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Download SVGs using saved logo_url and store them in the database
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">
                        Bulk populate
                      </h4>
                      <button className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors">
                        Populate Missing SVGs
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Only processes stocks with a saved logo_url
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">
                        Single stock
                      </h4>
                      <div className="flex gap-2">
                        <select className="flex-1 px-3 py-2 bg-surface-dark border border-white/10 rounded-xl text-gray-100 focus:ring-2 focus:ring-brand-400/40 focus:border-transparent">
                          <option>Select stock...</option>
                        </select>
                        <button className="px-4 py-2 bg-gain text-surface-dark rounded-xl hover:bg-gain/80 transition-colors">
                          Populate for Selected
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Uses the stock&apos;s logo_url field, if present
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* World Stocks Logo Crawler */}
            {logoCrawlerTab === "world" && (
              <>
                {/* Exchange Data Sync */}
                <div className="bg-warn/10 border border-warn/20 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-100">
                        Sync Exchange Data from yfinance
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Fixes stocks stored as NYSE that are actually on NASDAQ / AMEX / ARCA.
                        Run this <strong className="text-warn">before</strong> crawling logos — correct exchange = better logo URL hit rate.
                      </p>
                    </div>
                    <RefreshCw className={`w-5 h-5 ${isSyncingExchange ? 'animate-spin text-warn' : 'text-warn/60'}`} />
                  </div>
                  <button
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Sync exchange data?",
                        message: "This will query yfinance for every world stock (~2900) to update the exchange field. It may take several minutes.",
                        confirmLabel: "Start Sync",
                        variant: "info",
                      });
                      if (!ok) return;
                      setIsSyncingExchange(true);
                      const loadingToast = toast.loading("Syncing exchange data from yfinance…");
                      try {
                        const result = await worldStocksAPI.syncExchangeData();
                        toast.success(
                          `Exchange sync done — updated: ${result.results?.updated ?? 0}, skipped: ${result.results?.skipped ?? 0}, failed: ${result.results?.failed ?? 0}`,
                          { id: loadingToast, duration: 6000 }
                        );
                      } catch (error: any) {
                        toast.error(error.response?.data?.detail || "Exchange sync failed", { id: loadingToast });
                      } finally {
                        setIsSyncingExchange(false);
                      }
                    }}
                    disabled={isSyncingExchange || isCrawling}
                    className="px-6 py-2.5 bg-warn text-surface-dark rounded-xl hover:bg-warn/80 transition-colors font-medium disabled:bg-gray-600 disabled:cursor-not-allowed"
                  >
                    {isSyncingExchange ? "Syncing…" : "Sync Exchange Data"}
                  </button>
                </div>

                {/* Batch Logo Crawler for World Stocks */}
                <div className="bg-brand-400/10 border border-brand-400/20 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-100">
                        Batch Logo Crawler
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Fetch and store SVG logos for World stocks
                      </p>
                    </div>
                    <RefreshCw className={`w-5 h-5 ${isCrawling ? 'animate-spin text-brand-400' : 'text-brand-400/60'}`} />
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Batch size
                      </label>
                      <input
                        type="number"
                        value={worldBatchSize}
                        onChange={(e) => setWorldBatchSize(parseInt(e.target.value) || 5)}
                        className="w-32 px-3 py-2 bg-surface-dark border border-white/10 rounded-xl text-gray-100 focus:ring-2 focus:ring-brand-400/40 focus:border-transparent"
                        disabled={isCrawling}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Runs concurrent requests in batches
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        const ok = await confirm({ title: "Crawl world stock logos?", message: "This will crawl logos for all world stocks that don\u2019t have them yet.", confirmLabel: "Start Crawl", variant: "info" });
                        if (!ok) return;
                        
                        setIsCrawling(true);
                        const loadingToast = toast.loading("Crawling world stock logos...");
                        
                        try {
                          const result = await worldStocksAPI.crawlAllLogos(worldBatchSize);
                          toast.success(
                            `Successfully crawled ${result.results?.success || 0} logos! (${result.results?.failed || 0} failed)`,
                            { id: loadingToast }
                          );
                        } catch (error: any) {
                          toast.error(
                            error.response?.data?.detail || "Failed to crawl logos",
                            { id: loadingToast }
                          );
                        } finally {
                          setIsCrawling(false);
                        }
                      }}
                      disabled={isCrawling}
                      className="w-full sm:w-auto px-6 py-2.5 bg-gain text-surface-dark rounded-xl hover:bg-gain/80 transition-colors font-medium disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                      {isCrawling ? "Crawling..." : "Crawl Missing Logos"}
                    </button>
                  </div>
                </div>

                {/* TradingView Logo URL Crawler for World Stocks */}
                <div className="bg-brand-400/10 border border-brand-400/20 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-100">
                        TradingView Logo URL Crawler
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Extract logo URLs from TradingView symbol pages
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">
                        Batch crawl
                      </h4>
                      <button
                        onClick={async () => {
                          setIsCrawling(true);
                          const loadingToast = toast.loading("Crawling TradingView logo URLs...");
                          
                          try {
                            const result = await worldStocksAPI.crawlTradingViewLogoUrls(worldBatchSize, true);
                            toast.success(
                              `Successfully crawled ${result.results?.success || 0} URLs!`,
                              { id: loadingToast }
                            );
                          } catch (error: any) {
                            toast.error(
                              error.response?.data?.detail || "Failed to crawl URLs",
                              { id: loadingToast }
                            );
                          } finally {
                            setIsCrawling(false);
                          }
                        }}
                        disabled={isCrawling}
                        className="w-full px-4 py-2.5 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors disabled:bg-gray-600"
                      >
                        Crawl Missing logo_url
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Finds SVG URLs via TradingView page and saves it to logo_url only
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">
                        Single symbol
                      </h4>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="e.g., AAPL"
                          value={singleTicker}
                          onChange={(e) => setSingleTicker(e.target.value.toUpperCase())}
                          className="flex-1 px-3 py-2 bg-surface-dark border border-white/10 rounded-xl text-gray-100 focus:ring-2 focus:ring-brand-400/40 focus:border-transparent"
                          disabled={isCrawling}
                        />
                        <button
                          onClick={async () => {
                            if (!singleTicker) {
                              toast.error("Please enter a ticker symbol");
                              return;
                            }
                            
                            setIsCrawling(true);
                            const loadingToast = toast.loading(`Crawling logo URL for ${singleTicker}...`);
                            
                            try {
                              const result = await worldStocksAPI.crawlLogoForTicker(singleTicker);
                              if (result.success) {
                                toast.success(result.message, { id: loadingToast });
                              } else {
                                toast.error(result.message, { id: loadingToast });
                              }
                            } catch (error: any) {
                              toast.error(
                                error.response?.data?.detail || "Failed to crawl logo URL",
                                { id: loadingToast }
                              );
                            } finally {
                              setIsCrawling(false);
                            }
                          }}
                          disabled={isCrawling || !singleTicker}
                          className="px-4 py-2 bg-gain text-surface-dark rounded-xl hover:bg-gain/80 transition-colors disabled:bg-gray-600"
                        >
                          Crawl URL for Symbol
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Uses TradingView page like https://www.tradingview.com/symbols/NASDAQ-AAPL/
                      </p>
                    </div>
                  </div>
                </div>

                {/* Populate logo_svg from logo_url for World Stocks */}
                <div className="bg-brand-400/10 border border-brand-400/20 rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-100">
                        Populate logo_svg from logo_url
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">
                        Download SVGs using saved logo_url and store them in the database
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">
                        Bulk populate
                      </h4>
                      <button
                        onClick={async () => {
                          setIsCrawling(true);
                          const loadingToast = toast.loading("Populating SVGs from URLs...");
                          
                          try {
                            const result = await worldStocksAPI.fetchLogoSvgFromUrl(worldBatchSize, true);
                            toast.success(
                              `Successfully populated ${result.results?.success || 0} SVGs!`,
                              { id: loadingToast }
                            );
                          } catch (error: any) {
                            toast.error(
                              error.response?.data?.detail || "Failed to populate SVGs",
                              { id: loadingToast }
                            );
                          } finally {
                            setIsCrawling(false);
                          }
                        }}
                        disabled={isCrawling}
                        className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:bg-gray-600"
                      >
                        Populate Missing SVGs
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Only processes stocks with a saved logo_url
                      </p>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-300 mb-3">
                        Logo Statistics
                      </h4>
                      <button
                        onClick={async () => {
                          const loadingToast = toast.loading("Fetching logo stats...");
                          
                          try {
                            const stats = await worldStocksAPI.getLogoStats();
                            toast.success(
                              `Total: ${stats.total_stocks} | With Logos: ${stats.with_logos} (${stats.coverage_percentage}%)`,
                              { id: loadingToast, duration: 5000 }
                            );
                          } catch (error: any) {
                            toast.error(
                              error.response?.data?.detail || "Failed to fetch stats",
                              { id: loadingToast }
                            );
                          }
                        }}
                        className="w-full px-4 py-2.5 bg-brand-400 text-surface-dark rounded-xl hover:bg-brand-500 transition-colors"
                      >
                        View Logo Statistics
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        Check current logo coverage
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "metadata" && (
          <div className="text-center py-12 text-gray-500">
            Metadata editor interface coming soon
          </div>
        )}
      </div>
      {ConfirmDialogElement}
    </div>
  );
};

export default StocksSection;
