"use client";

import React, { useEffect, useMemo, useState } from "react";
import { israeliStocksAPI } from "@/services/api";
import {
  Cog6ToothIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
} from "@heroicons/react/24/outline";
import Logo from "./Logo";

export default function AdminDashboard() {
  const [batchSize, setBatchSize] = useState<number>(5);
  const [busy, setBusy] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<any>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [csvFiles, setCsvFiles] = useState<File[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [stocksLoading, setStocksLoading] = useState<boolean>(false);
  const [stocksError, setStocksError] = useState<string>("");
  const [stockQuery, setStockQuery] = useState<string>("");
  const [selectedStock, setSelectedStock] = useState<any | null>(null);
  const [manualName, setManualName] = useState<string>("");
  const [tvSymbol, setTvSymbol] = useState<string>("");
  const [tvBusy, setTvBusy] = useState<boolean>(false);
  const [tvMsg, setTvMsg] = useState<string>("");
  const [tvErr, setTvErr] = useState<string>("");
  const [populateBusy, setPopulateBusy] = useState<boolean>(false);
  const [populateMsg, setPopulateMsg] = useState<string>("");
  const [populateErr, setPopulateErr] = useState<string>("");

  const runCrawlAll = async () => {
    setBusy(true);
    setError("");
    setMessage("Running crawl…");
    setResult(null);
    try {
      const res = await israeliStocksAPI.crawlLogos(batchSize);
      setResult(res);
      setMessage("Crawl completed");
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || e.message || "Failed to crawl logos"
      );
    } finally {
      setBusy(false);
    }
  };

  const uploadPdf = async () => {
    if (!pdfFile) {
      setError("Select a PDF file first");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("Uploading PDF…");
    setResult(null);
    try {
      const res = await israeliStocksAPI.uploadPDF(pdfFile);
      setResult(res);
      setMessage("PDF uploaded and analyzed");
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || e.message || "Failed to upload PDF"
      );
    } finally {
      setBusy(false);
    }
  };

  const uploadCsvs = async () => {
    if (!csvFiles.length) {
      setError("Select one or more CSV files first");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("Uploading CSV files…");
    setResult(null);
    try {
      const res = await israeliStocksAPI.uploadCSV(csvFiles);
      setResult(res);
      setMessage("CSV files uploaded and analyzed");
    } catch (e: any) {
      setError(
        e?.response?.data?.detail || e.message || "Failed to upload CSVs"
      );
    } finally {
      setBusy(false);
    }
  };

  const reloadStocks = async () => {
    setStocksLoading(true);
    setStocksError("");
    try {
      let combined: any[] = [];
      // Primary: public stocks endpoint (should work without auth)
      const allRes = await israeliStocksAPI.getStocks(undefined, 1000);
      console.log("GET /israeli-stocks/stocks response:", allRes);
      combined = Array.isArray(allRes) ? allRes : allRes?.stocks || [];
      // Fallback: split endpoints (may require auth)
      if (!combined.length) {
        try {
          const [withoutRes, withRes] = await Promise.all([
            israeliStocksAPI.getStocksWithoutLogos(),
            israeliStocksAPI.getStocksWithLogos(),
          ]);
          console.log("GET /stocks-without-logos:", withoutRes);
          console.log("GET /stocks-with-logos:", withRes);
          combined = [
            ...(withRes?.stocks || []),
            ...(withoutRes?.stocks || []),
          ];
        } catch (e: any) {
          // Keep combined as-is; set error below if still empty
          console.warn("Fallback stocks endpoints failed", e);
        }
      }
      const normalized = combined.map((s: any) => ({
        id: s.id,
        name: s.name || s.company_name || s.stock_name,
        symbol: s.symbol,
        security_no: s.security_no,
        has_logo: s.has_logo ?? !!s.logo_svg,
        logo_svg: s.logo_svg || null,
      }));
      const uniq: Record<string, any> = {};
      for (const s of normalized) {
        const key = String(s.id ?? s.symbol);
        if (!uniq[key]) uniq[key] = s;
      }
      const list = Object.values(uniq);
      setStocks(list);
      if (!list.length) {
        setStocksError(
          "No stocks loaded. Ensure the backend is running and you are signed in if required."
        );
      }
      if (selectedStock) {
        const updated = list.find(
          (x: any) =>
            (x.id && x.id === selectedStock.id) ||
            (x.symbol && x.symbol === selectedStock.symbol)
        );
        if (updated) setSelectedStock(updated);
      }
    } catch (e) {
      console.error("Failed to load stocks", e);
      const msg =
        (e as any)?.response?.data?.detail ||
        (e as any)?.message ||
        "Failed to load stocks.";
      setStocksError(msg);
    } finally {
      setStocksLoading(false);
    }
  };

  useEffect(() => {
    reloadStocks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suggestions = useMemo(() => {
    const q = stockQuery.trim().toLowerCase();
    if (q.length < 1) return [] as any[];
    return stocks
      .filter((s: any) => {
        const name = (s.name || "").toString().toLowerCase();
        const symbol = (s.symbol || "").toString().toLowerCase();
        return name.includes(q) || symbol.includes(q);
      })
      .slice(0, 10);
  }, [stockQuery, stocks]);

  const onPickSuggestion = (s: any) => {
    setSelectedStock(s);
    setStockQuery(s.name || s.symbol || "");
  };

  const fetchLogoForSelected = async () => {
    const targetName =
      manualName.trim() ||
      selectedStock?.name ||
      selectedStock?.symbol ||
      stockQuery;
    if (!targetName) {
      setError("Select a stock or type a name/ticker first");
      return;
    }
    setBusy(true);
    setError("");
    setMessage(`Fetching logo for ${targetName}…`);
    setResult(null);
    try {
      const res = await israeliStocksAPI.crawlLogoForStock(String(targetName));
      setResult(res);
      setMessage("Logo fetched (if available)");
      await reloadStocks();
    } catch (e: any) {
      setError(
        e?.response?.data?.detail ||
          e.message ||
          "Failed to crawl logo for selected"
      );
    } finally {
      setBusy(false);
    }
  };

  const renderLogoPreview = (stock: any) => {
    const svg = stock?.logo_svg;
    if (svg && typeof svg === "string" && svg.includes("<svg")) {
      return (
        <div
          className="w-20 h-20 p-2 border border-gray-200 rounded bg-white"
          title="Current logo"
        >
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        </div>
      );
    }
    return (
      <div className="w-20 h-20 flex items-center justify-center border border-dashed border-gray-300 rounded text-xs text-gray-400">
        No logo
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-gray-600 mt-1">Manage system settings and data</p>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Logo Crawler
              </h2>
              <p className="text-sm text-gray-600">
                Fetch and store SVG logos for Israeli stocks.
              </p>
            </div>
            <ArrowPathIcon
              className={`${
                busy ? "animate-spin text-blue-600" : "text-gray-400"
              } h-6 w-6`}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch size
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={batchSize}
                  onChange={(e) =>
                    setBatchSize(parseInt(e.target.value || "5", 10))
                  }
                  className="w-28 border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  onClick={runCrawlAll}
                  disabled={busy}
                  className="btn-primary text-sm"
                >
                  Crawl Missing Logos
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Runs concurrent requests in batches.
              </p>
            </div>
          </div>
          {(message || error) && (
            <div className="mt-4">
              {error ? (
                <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm">
                  <XCircleIcon className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded p-3 text-sm">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>{message}</span>
                </div>
              )}
            </div>
          )}
          {result && (
            <pre className="mt-4 text-xs bg-gray-50 border border-gray-200 rounded p-3 overflow-auto max-h-64">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Attach Logo to Stock
              </h2>
              <p className="text-sm text-gray-600">
                Search and select a company, then fetch/refresh its logo.
              </p>
            </div>
            {stocksLoading && (
              <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-600" />
            )}
          </div>
          <div className="space-y-3">
            {stocksError && (
              <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded p-2">
                <span>{stocksError}</span>
                <div className="flex gap-2">
                  <button
                    onClick={reloadStocks}
                    className="btn-secondary text-xs"
                  >
                    Retry
                  </button>
                  <a
                    href="/auth/login"
                    className="text-blue-700 underline text-xs"
                  >
                    Sign in
                  </a>
                </div>
              </div>
            )}
            <div className="relative">
              <div className="flex gap-2 flex-wrap items-start">
                <input
                  type="text"
                  value={stockQuery}
                  onChange={(e) => {
                    setStockQuery(e.target.value);
                    if (!e.target.value) setSelectedStock(null);
                    if (!stocksLoading && stocks.length === 0) {
                      reloadStocks();
                    }
                  }}
                  onFocus={() => {
                    if (!stocksLoading && stocks.length === 0) {
                      reloadStocks();
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && suggestions.length)
                      onPickSuggestion(suggestions[0]);
                  }}
                  placeholder="Search by name or ticker"
                  className="flex-1 min-w-[220px] border border-gray-300 rounded-md px-3 py-2"
                />
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="TradingView slug or company name"
                  className="flex-1 min-w-[220px] border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  onClick={() => {
                    if (suggestions.length) onPickSuggestion(suggestions[0]);
                  }}
                  className="btn-secondary text-sm"
                >
                  Select
                </button>
                <button
                  onClick={fetchLogoForSelected}
                  disabled={
                    (!selectedStock &&
                      !manualName.trim() &&
                      !stockQuery.trim()) ||
                    busy
                  }
                  className="btn-primary text-sm"
                >
                  Fetch Logo
                </button>
              </div>
              <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-2">
                <span>Loaded stocks: {stocks.length}</span>
                <button
                  onClick={reloadStocks}
                  className="text-[11px] text-blue-700 underline"
                >
                  Reload
                </button>
              </div>
              {stockQuery && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow max-h-64 overflow-auto">
                  {suggestions.map((s: any) => (
                    <button
                      key={`${s.id || s.symbol || s.name}`}
                      className="w-full text-left px-3 py-2 hover:bg-gray-50"
                      onClick={() => onPickSuggestion(s)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 flex-wrap">
                          <span className="font-medium">{s.name}</span>
                          <span className="text-xs text-gray-500">
                            {s.symbol}
                          </span>
                          {s.has_logo && (
                            <span className="text-[10px] text-green-600 bg-green-50 border border-green-200 rounded px-1">
                              logo
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          ID: {s.id ?? "-"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {stockQuery && suggestions.length === 0 && !stocksLoading && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded shadow p-3 text-sm text-gray-600">
                  No suggestions. Type at least 2 characters or try the manual
                  field.
                </div>
              )}
            </div>
            {selectedStock && (
              <div className="flex items-center justify-between border border-gray-200 rounded p-3">
                <div className="flex items-center gap-3">
                  {renderLogoPreview(selectedStock)}
                  <div>
                    <div className="font-medium">{selectedStock.name}</div>
                    <div className="text-xs text-gray-500">
                      {selectedStock.symbol}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchLogoForSelected}
                    disabled={busy}
                    className="btn-primary text-sm"
                  >
                    Fetch Logo
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                TradingView Logo URL Crawler
              </h2>
              <p className="text-sm text-gray-600">
                Extract logo URLs from TradingView symbol pages and store them
                in logo_url.
              </p>
            </div>
            {tvBusy && (
              <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-600" />
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch crawl
              </label>
              <div className="flex gap-2 items-start flex-wrap">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={batchSize}
                  onChange={(e) =>
                    setBatchSize(parseInt(e.target.value || "5", 10))
                  }
                  className="w-28 border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  onClick={async () => {
                    setTvBusy(true);
                    setTvErr("");
                    setTvMsg("Batch crawling TradingView logo URLs…");
                    try {
                      const res =
                        await israeliStocksAPI.crawlTradingViewLogoUrls(
                          batchSize,
                          true
                        );
                      setTvMsg(
                        `Done: ${res?.results?.success || 0} updated, ${
                          res?.results?.failed || 0
                        } failed`
                      );
                    } catch (e: any) {
                      setTvErr(
                        e?.response?.data?.detail ||
                          e.message ||
                          "Batch crawl failed"
                      );
                    } finally {
                      setTvBusy(false);
                    }
                  }}
                  disabled={tvBusy}
                  className="btn-secondary text-sm"
                >
                  Crawl Missing logo_url
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Finds S3 SVG URL via TradingView page and saves it to logo_url
                only.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Single symbol
              </label>
              <div className="flex gap-2 items-start flex-wrap">
                <input
                  type="text"
                  value={tvSymbol}
                  onChange={(e) => setTvSymbol(e.target.value)}
                  placeholder="e.g. DNYA"
                  className="w-40 border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  onClick={async () => {
                    const symbol = (
                      tvSymbol ||
                      selectedStock?.symbol ||
                      ""
                    ).trim();
                    if (!symbol) {
                      setTvErr("Enter a symbol or pick a stock");
                      return;
                    }
                    setTvBusy(true);
                    setTvErr("");
                    setTvMsg(`Crawling TradingView for ${symbol}…`);
                    try {
                      const res =
                        await israeliStocksAPI.crawlTradingViewLogoUrlForSymbol(
                          symbol
                        );
                      if (res?.success && res?.data?.logo_url) {
                        setTvMsg(`Found URL: ${res.data.logo_url}`);
                        await reloadStocks();
                      } else {
                        setTvErr(res?.message || "No URL found");
                      }
                    } catch (e: any) {
                      setTvErr(
                        e?.response?.data?.detail ||
                          e.message ||
                          "Failed to crawl symbol"
                      );
                    } finally {
                      setTvBusy(false);
                    }
                  }}
                  disabled={tvBusy}
                  className="btn-primary text-sm"
                >
                  Crawl URL for Symbol
                </button>
                {selectedStock?.symbol && (
                  <span className="text-xs text-gray-500">
                    Selected: {selectedStock.symbol}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Uses TradingView page like
                https://www.tradingview.com/symbols/TASE-DNYA/
              </p>
            </div>
          </div>
          {(tvMsg || tvErr) && (
            <div className="mt-4">
              {tvErr ? (
                <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm">
                  <XCircleIcon className="h-5 w-5" />
                  <span>{tvErr}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded p-3 text-sm">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>{tvMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Populate logo_svg from logo_url
              </h2>
              <p className="text-sm text-gray-600">
                Download SVGs using saved logo_url and store them in the
                database.
              </p>
            </div>
            {populateBusy && (
              <ArrowPathIcon className="h-5 w-5 animate-spin text-blue-600" />
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bulk populate
              </label>
              <div className="flex gap-2 items-start flex-wrap">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={batchSize}
                  onChange={(e) =>
                    setBatchSize(parseInt(e.target.value || "5", 10))
                  }
                  className="w-28 border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  onClick={async () => {
                    setPopulateBusy(true);
                    setPopulateErr("");
                    setPopulateMsg("Populating logo_svg from logo_url…");
                    try {
                      const res =
                        await israeliStocksAPI.populateLogoSvgFromUrlBulk(
                          batchSize,
                          true
                        );
                      setPopulateMsg(
                        `Done: ${res?.results?.success || 0} updated, ${
                          res?.results?.failed || 0
                        } failed`
                      );
                      await reloadStocks();
                    } catch (e: any) {
                      setPopulateErr(
                        e?.response?.data?.detail ||
                          e.message ||
                          "Bulk populate failed"
                      );
                    } finally {
                      setPopulateBusy(false);
                    }
                  }}
                  disabled={populateBusy}
                  className="btn-secondary text-sm"
                >
                  Populate Missing SVGs
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Only processes stocks with a saved logo_url.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Single stock
              </label>
              <div className="flex gap-2 items-start flex-wrap">
                <button
                  onClick={async () => {
                    const id = selectedStock?.id;
                    if (!id) {
                      setPopulateErr("Pick a stock first");
                      return;
                    }
                    setPopulateBusy(true);
                    setPopulateErr("");
                    setPopulateMsg(`Populating SVG for stock #${id}…`);
                    try {
                      const res =
                        await israeliStocksAPI.populateLogoSvgFromUrlForStock(
                          id
                        );
                      if (res?.success) {
                        setPopulateMsg("SVG populated successfully");
                        await reloadStocks();
                      } else {
                        setPopulateErr(
                          res?.message || "Failed to populate SVG"
                        );
                      }
                    } catch (e: any) {
                      setPopulateErr(
                        e?.response?.data?.detail ||
                          e.message ||
                          "Failed to populate SVG"
                      );
                    } finally {
                      setPopulateBusy(false);
                    }
                  }}
                  disabled={populateBusy || !selectedStock}
                  className="btn-primary text-sm"
                >
                  Populate for Selected
                </button>
                {selectedStock?.id && (
                  <span className="text-xs text-gray-500">
                    ID: {selectedStock.id}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Uses the stock&apos;s logo_url field, if present.
              </p>
            </div>
          </div>
          {(populateMsg || populateErr) && (
            <div className="mt-4">
              {populateErr ? (
                <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded p-3 text-sm">
                  <XCircleIcon className="h-5 w-5" />
                  <span>{populateErr}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded p-3 text-sm">
                  <CheckCircleIcon className="h-5 w-5" />
                  <span>{populateMsg}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">
                Report Uploaders
              </h2>
              <p className="text-sm text-gray-600">
                Upload PDF or CSV reports for analysis.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload PDF
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  onClick={uploadPdf}
                  disabled={busy}
                  className="btn-primary text-sm"
                >
                  Upload
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Single PDF report (Israeli broker statements).
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Upload CSVs
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="text/csv"
                  multiple
                  onChange={(e) =>
                    setCsvFiles(Array.from(e.target.files || []))
                  }
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  onClick={uploadCsvs}
                  disabled={busy}
                  className="btn-secondary text-sm"
                >
                  Upload
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                One or more CSV files (tables exported from PDFs).
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-2">
            <CloudArrowUpIcon className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-medium text-gray-900">Other Tools</h2>
          </div>
          <p className="text-sm text-gray-600">
            We can add data fixes, re-processing utilities, and feature toggles
            here.
          </p>
        </div>
      </main>
    </div>
  );
}
